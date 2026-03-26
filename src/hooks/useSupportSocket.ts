import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Message {
  id: string;
  from: {
    username: string;
    cnpj: string;
    role: 'user' | 'admin';
  };
  to?: {
    cnpj: string;
    username?: string;
  };
  text: string;
  timestamp: string;
}

export function useSupportSocket() {
  const { 
    currentUser, userRole, 
    setUnreadSupportCount, setUnreadPerUser,
    messages, setMessages,
    setIsChatConnected, isChatConnected
  } = useStore();

  const cleanupOldMessages = async () => {
    if (!isSupabaseConfigured) return;
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .lt('created_at', sixHoursAgo);
      
      if (error) console.error('Error cleaning up old messages:', error);
    } catch (err) {
      console.error('Failed to cleanup messages:', err);
    }
  };

  const fetchMessages = async () => {
    if (!isSupabaseConfigured || !currentUser) return;
    
    // Cleanup first
    await cleanupOldMessages();

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .gt('created_at', sixHoursAgo)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedMessages: Message[] = data.map(m => ({
          id: m.id,
          from: {
            username: m.from_username,
            cnpj: m.from_cnpj,
            role: m.from_role as 'user' | 'admin'
          },
          to: m.to_cnpj ? {
            cnpj: m.to_cnpj,
            username: m.to_username
          } : undefined,
          text: m.text,
          timestamp: m.created_at
        }));
        setMessages(mappedMessages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured) return;

    fetchMessages();
    setIsChatConnected(true);

    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new;
          const mappedMessage: Message = {
            id: newMessage.id,
            from: {
              username: newMessage.from_username,
              cnpj: newMessage.from_cnpj,
              role: newMessage.from_role as 'user' | 'admin'
            },
            to: newMessage.to_cnpj ? {
              cnpj: newMessage.to_cnpj,
              username: newMessage.to_username
            } : undefined,
            text: newMessage.text,
            timestamp: newMessage.created_at
          };

          setMessages(prev => {
            if (prev.some(existing => existing.id === mappedMessage.id)) return prev;
            return [...prev, mappedMessage];
          });

          // Handle notifications
          const state = useStore.getState();
          const normalizedUserCnpj = currentUser.cnpj.replace(/[^\d]/g, '');
          const normalizedFromCnpj = mappedMessage.from.cnpj.replace(/[^\d]/g, '');
          const isFromMe = normalizedFromCnpj === normalizedUserCnpj && mappedMessage.from.username === currentUser.username;
          
          if (!isFromMe) {
            // Play sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(e => console.log('Audio play blocked'));

            let shouldNotify = false;
            if (!state.isSupportChatOpen) {
              shouldNotify = true;
            } else if (userRole === 'admin') {
              if (mappedMessage.from.cnpj !== state.selectedUserCnpj) {
                shouldNotify = true;
              }
            } else if (document.hidden) {
              shouldNotify = true;
            }

            if (shouldNotify) {
              const senderName = mappedMessage.from.role === 'admin' ? 'Suporte SmartPrice' : mappedMessage.from.username;
              
              if (userRole === 'admin' && mappedMessage.from.role === 'user') {
                if (mappedMessage.from.cnpj !== state.selectedUserCnpj) {
                  setUnreadPerUser(mappedMessage.from.cnpj, prev => {
                    const newCount = typeof prev === 'number' ? prev + 1 : 1;
                    setUnreadSupportCount(current => (typeof current === 'number' ? current + 1 : 1));
                    return newCount;
                  });
                }
              } else if (userRole === 'user' && mappedMessage.from.role === 'admin') {
                setUnreadSupportCount(prev => (typeof prev === 'number' ? prev + 1 : 1));
              }

              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`Nova mensagem de ${senderName}`, { 
                  body: mappedMessage.text,
                  icon: '/favicon.ico'
                });
              }

              toast.info(`Mensagem de ${senderName}`, {
                description: mappedMessage.text,
                duration: 8000,
                action: {
                  label: 'Responder',
                  onClick: () => {
                    useStore.getState().setSupportChatOpen(true);
                    if (userRole === 'admin' && mappedMessage.from.cnpj) {
                      useStore.getState().setSelectedUserCnpj(mappedMessage.from.cnpj);
                    }
                  }
                }
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages(prev => prev.filter(m => m.id !== deletedId));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsChatConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsChatConnected(false);
        }
      });

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Set up periodic cleanup (every 30 minutes)
    const cleanupInterval = setInterval(cleanupOldMessages, 30 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
    };
  }, [currentUser, userRole, setMessages, setUnreadPerUser, setUnreadSupportCount, setIsChatConnected]);


  const sendMessage = async (text: string, toCnpj?: string) => {
    if (!isSupabaseConfigured || !currentUser || !userRole) return;

    const normalizedToCnpj = toCnpj ? toCnpj.replace(/[^\d]/g, '') : undefined;
    const normalizedFromCnpj = currentUser.cnpj.replace(/[^\d]/g, '');
    const targetStore = toCnpj ? useStore.getState().allowedStores.find(s => s.cnpj.replace(/[^\d]/g, '') === normalizedToCnpj) : null;
    const toUsername = userRole === 'user' ? 'Suporte SmartPrice' : (targetStore?.bandeira || null);

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          id: messageId,
          from_username: currentUser.username || 'Usuário',
          from_cnpj: normalizedFromCnpj,
          from_role: userRole,
          to_cnpj: normalizedToCnpj || null,
          to_username: toUsername,
          text: text
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const clearMessages = async (cnpj: string) => {
    if (!isSupabaseConfigured) return;
    
    const normalizedCnpj = cnpj.replace(/[^\d]/g, '');
    
    try {
      // Delete messages from/to this CNPJ
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .or(`from_cnpj.eq.${normalizedCnpj},to_cnpj.eq.${normalizedCnpj}`);

      if (error) throw error;
      
      setMessages(prev => prev.filter(m => 
        m.from.cnpj.replace(/[^\d]/g, '') !== normalizedCnpj && 
        m.to?.cnpj?.replace(/[^\d]/g, '') !== normalizedCnpj
      ));
    } catch (err) {
      console.error('Error clearing messages:', err);
      toast.error('Erro ao limpar mensagens');
    }
  };

  return { messages, setMessages, sendMessage, clearMessages, isConnected: isChatConnected };
}


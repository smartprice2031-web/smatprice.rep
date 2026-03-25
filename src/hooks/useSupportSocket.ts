import { useEffect, useState } from 'react';
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
  };
  text: string;
  attachment?: string; // base64 or URL
  attachmentType?: 'image' | 'file';
  timestamp: string;
}

export function useSupportSocket() {
  const { 
    currentUser, userRole, 
    setUnreadSupportCount, setUnreadPerUser,
    messages, setMessages,
    setIsChatConnected, isChatConnected
  } = useStore();

  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured) return;

    // Initial fetch of messages
    const fetchMessages = async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .gt('created_at', sixHoursAgo)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const formattedMessages: Message[] = data.map(m => ({
        id: m.id,
        text: m.text,
        timestamp: m.created_at,
        from: {
          cnpj: m.from_cnpj,
          username: m.from_username,
          role: m.from_role
        },
        to: m.to_cnpj ? { cnpj: m.to_cnpj } : undefined,
        attachment: m.attachment,
        attachmentType: m.attachment_type
      }));

      // Filter messages for the user
      const filtered = formattedMessages.filter(m => 
        userRole === 'admin' || m.from.cnpj === currentUser.cnpj || m.to?.cnpj === currentUser.cnpj
      );

      setMessages(filtered);
      setIsChatConnected(true);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('chat_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const m = payload.new;
        const newMessage: Message = {
          id: m.id,
          text: m.text,
          timestamp: m.created_at,
          from: {
            cnpj: m.from_cnpj,
            username: m.from_username,
            role: m.from_role
          },
          to: m.to_cnpj ? { cnpj: m.to_cnpj } : undefined,
          attachment: m.attachment,
          attachmentType: m.attachment_type
        };

        // Check if message is relevant to this user
        const isRelevant = userRole === 'admin' || 
                           newMessage.from.cnpj === currentUser.cnpj || 
                           newMessage.to?.cnpj === currentUser.cnpj;

        if (isRelevant) {
          setMessages(prev => {
            if (prev.some(existing => existing.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // Handle notifications
          const state = useStore.getState();
          const isFromMe = newMessage.from.cnpj === currentUser.cnpj && newMessage.from.username === currentUser.username;
          
          if (!isFromMe) {
            // Play sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(e => console.log('Audio play blocked'));

            let shouldNotify = false;
            if (!state.isSupportChatOpen) {
              shouldNotify = true;
            } else if (userRole === 'admin') {
              if (newMessage.from.cnpj !== state.selectedUserCnpj) {
                shouldNotify = true;
              }
            } else if (document.hidden) {
              shouldNotify = true;
            }

            if (userRole === 'admin' && newMessage.from.role === 'user') {
              if (newMessage.from.cnpj !== state.selectedUserCnpj) {
                setUnreadPerUser(newMessage.from.cnpj, prev => (typeof prev === 'number' ? prev + 1 : 1));
              }
            }

            if (shouldNotify) {
              setUnreadSupportCount(prev => (typeof prev === 'number' ? prev + 1 : 1));
              const senderName = newMessage.from.role === 'admin' ? 'Suporte SmartPrice' : newMessage.from.username;
              
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`Nova mensagem de ${senderName}`, { body: newMessage.text });
              }

              toast.info(`Nova mensagem de ${senderName}`, {
                description: newMessage.text,
                action: {
                  label: 'Ver',
                  onClick: () => {
                    useStore.getState().setSupportChatOpen(true);
                    if (userRole === 'admin' && newMessage.from.cnpj) {
                      useStore.getState().setSelectedUserCnpj(newMessage.from.cnpj);
                    }
                  }
                }
              });
            }
          }
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
        // Handle message deletion (e.g. cleanup or clear chat)
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    // Cleanup old messages every 6 hours (client-side trigger for admin)
    const cleanupOldMessages = async () => {
      if (userRole !== 'admin') return;
      
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .lt('created_at', sixHoursAgo);
      
      if (error) console.error('Cleanup error:', error);
    };

    const cleanupInterval = setInterval(cleanupOldMessages, 30 * 60 * 1000); // Check every 30 mins
    cleanupOldMessages(); // Run once on mount

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
    };
  }, [currentUser, userRole, setMessages, setUnreadPerUser, setUnreadSupportCount, setIsChatConnected]);

  const sendMessage = async (text: string, toCnpj?: string, attachment?: { data: string, type: 'image' | 'file' }) => {
    if (!currentUser || !isSupabaseConfigured) return;

    const targetStore = toCnpj ? useStore.getState().allowedStores.find(s => s.cnpj === toCnpj) : null;

    const newMessage = {
      from_cnpj: currentUser.cnpj,
      from_username: currentUser.username,
      from_role: userRole,
      to_cnpj: userRole === 'admin' ? (toCnpj || null) : null,
      to_username: userRole === 'admin' ? (targetStore?.bandeira || null) : null,
      text,
      attachment: attachment?.data || null,
      attachment_type: attachment?.type || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('chat_messages')
      .insert([newMessage]);

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const clearMessages = async (cnpj: string) => {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .or(`from_cnpj.eq.${cnpj},to_cnpj.eq.${cnpj}`);

    if (error) {
      console.error('Error clearing messages:', error);
      toast.error('Erro ao limpar conversa');
    } else {
      setMessages(prev => prev.filter(m => m.from.cnpj !== cnpj && m.to?.cnpj !== cnpj));
      toast.success('Conversa limpa com sucesso!');
    }
  };

  return { messages, setMessages, sendMessage, clearMessages, isConnected: isChatConnected };
}


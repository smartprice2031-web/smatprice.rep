import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'user' | 'admin';
  text: string;
  timestamp: string;
  pending?: boolean;
}

export function useSupportSocket() {
  const { 
    currentUser, userRole, 
    setUnreadSupportCount, setUnreadPerUser,
    messages, setMessages,
    setIsChatConnected, isChatConnected,
    selectedUserCnpj,
    activeConversationId, setActiveConversationId,
    conversations, setConversations,
    isChatLoading: isLoading, setIsChatLoading: setIsLoading
  } = useStore();

  const activeConversationIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const fetchConversations = async () => {
    if (!isSupabaseConfigured || userRole !== 'admin') return;
    
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('status', 'open')
        .order('updated_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.error('Table support_conversations does not exist');
          toast.error('Tabela support_conversations não encontrada. Execute o SQL de configuração.');
        }
        throw error;
      }
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const getOrCreateConversation = async (cnpj: string, name: string) => {
    if (!isSupabaseConfigured) return null;
    
    const normalizedCnpj = cnpj?.replace(/[^\d]/g, '');
    if (!normalizedCnpj) return null;
    
    try {
      // Try to find existing open conversation - take the most recent one
      const { data: existing, error: findError } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('user_id', normalizedCnpj)
        .eq('status', 'open')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (findError) {
        console.error('Error finding conversation:', findError);
      }

      if (existing && existing.length > 0) return existing[0].id;

      // Create new one if not found
      const { data: created, error: createError } = await supabase
        .from('support_conversations')
        .insert({
          user_id: normalizedCnpj,
          user_name: name || 'Usuário',
          status: 'open',
          updated_at: new Date().toISOString()
        })
        .select('id')
        .maybeSingle();

      if (createError) {
        console.error('Error creating conversation:', createError);
        if (createError.code === '42P01') {
          toast.error('Tabela support_conversations não encontrada.');
        } else {
          toast.error(`Erro ao iniciar chat: ${createError.message}`);
        }
        return null;
      }
      
      // Refresh conversations list for admin
      if (userRole === 'admin') fetchConversations();
      
      return created?.id || null;
    } catch (err) {
      console.error('Error in getOrCreateConversation:', err);
      return null;
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!isSupabaseConfigured || !conversationId) return;
    
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          toast.error('Tabela support_messages não encontrada.');
        }
        throw error;
      }

      if (data) {
        const mappedMessages: Message[] = data.map(m => ({
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          sender_name: m.sender_name,
          sender_type: m.sender_type as 'user' | 'admin',
          text: m.message,
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

    let isMounted = true;

    const initChat = async () => {
      setIsLoading(true);
      
      try {
        if (userRole === 'admin') {
          await fetchConversations();
          if (selectedUserCnpj) {
            const convId = await getOrCreateConversation(selectedUserCnpj, selectedUserCnpj);
            if (convId && isMounted) {
              setActiveConversationId(convId);
              activeConversationIdRef.current = convId;
              await fetchMessages(convId);
            }
          } else {
            if (isMounted) {
              setActiveConversationId(null);
              activeConversationIdRef.current = null;
              setMessages([]);
            }
          }
        } else {
          const convId = await getOrCreateConversation(currentUser.cnpj, currentUser.username);
          if (convId && isMounted) {
            setActiveConversationId(convId);
            activeConversationIdRef.current = convId;
            await fetchMessages(convId);
          }
        }
      } catch (err) {
        console.error('Error in initChat:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsChatConnected(true);
        }
      }
    };

    initChat();

    const channel = supabase
      .channel('support_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages' },
        (payload: any) => {
          if (payload.event === 'INSERT') {
            const newMessage = payload.new;
            
            if (userRole === 'admin') {
              fetchConversations();
            }

            const isForActiveConversation = activeConversationIdRef.current && String(newMessage.conversation_id) === String(activeConversationIdRef.current);
            const normalizedSelectedCnpj = useStore.getState().selectedUserCnpj?.replace(/[^\d]/g, '');
            const isFromSelectedUser = userRole === 'admin' && normalizedSelectedCnpj && newMessage.sender_id === normalizedSelectedCnpj;

            if (isForActiveConversation || isFromSelectedUser) {
              // If it's from the selected user but a different conversation ID, switch to it
              if (isFromSelectedUser && !isForActiveConversation) {
                setActiveConversationId(newMessage.conversation_id);
                activeConversationIdRef.current = newMessage.conversation_id;
                fetchMessages(newMessage.conversation_id);
                return;
              }

              const mappedMessage: Message = {
                id: newMessage.id,
                conversation_id: newMessage.conversation_id,
                sender_id: newMessage.sender_id,
                sender_name: newMessage.sender_name,
                sender_type: newMessage.sender_type as 'user' | 'admin',
                text: newMessage.message,
                timestamp: newMessage.created_at
              };

              setMessages(prev => {
                if (prev.some(existing => existing.id === mappedMessage.id)) return prev;
                return [...prev, mappedMessage];
              });
            }

            handleNewMessageNotification(newMessage);
          } else if (payload.event === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations' },
        () => {
          if (userRole === 'admin') fetchConversations();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && isMounted) setIsChatConnected(true);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.cnpj, userRole, selectedUserCnpj]); // Re-init when user or selection changes

  const handleNewMessageNotification = (msg: any) => {
    const state = useStore.getState();
    const normalizedUserCnpj = currentUser?.cnpj?.replace(/[^\d]/g, '');
    const isFromMe = msg.sender_id === (userRole === 'admin' ? 'admin' : normalizedUserCnpj);
    
    if (isFromMe) return;

    // Play sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(() => {});

    const normalizedSelectedCnpj = state.selectedUserCnpj?.replace(/[^\d]/g, '');
    const isSelectedUser = userRole === 'admin' && msg.sender_id === normalizedSelectedCnpj;

    if (!state.isSupportChatOpen || (userRole === 'admin' && !isSelectedUser)) {
      if (userRole === 'admin') {
        setUnreadPerUser(msg.sender_id, prev => (typeof prev === 'number' ? prev + 1 : 1));
      }
      setUnreadSupportCount(prev => (typeof prev === 'number' ? prev + 1 : 1));
      
      toast.info(`Nova mensagem de ${msg.sender_name}`, {
        description: msg.message,
        action: {
          label: 'Ver',
          onClick: () => state.setSupportChatOpen(true)
        }
      });
    }
  };

  const sendMessage = async (text: string, toCnpj?: string) => {
    if (!isSupabaseConfigured || !currentUser || !activeConversationId) {
      if (!activeConversationId) {
        toast.error('Chat não inicializado. Tente recarregar a página.');
        console.error('Cannot send message: activeConversationId is null');
      }
      return;
    }

    const tempId = `temp-${crypto.randomUUID()}`;
    const senderId = userRole === 'admin' ? 'admin' : currentUser?.cnpj?.replace(/[^\d]/g, '') || '';
    const tempMsg: Message = {
      id: tempId,
      conversation_id: activeConversationId,
      sender_id: senderId,
      sender_name: currentUser.username || 'Usuário',
      sender_type: userRole as 'user' | 'admin',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      pending: true
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: senderId,
          sender_name: tempMsg.sender_name,
          sender_type: tempMsg.sender_type,
          message: text.trim()
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase error sending message:', error);
        throw error;
      }
      
      if (data) {
        const realMsg: Message = {
          id: data.id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          sender_name: data.sender_name,
          sender_type: data.sender_type as 'user' | 'admin',
          text: data.message,
          timestamp: data.created_at
        };

        setMessages(prev => {
          // If Realtime already added it, just remove temp
          if (prev.some(m => m.id === realMsg.id)) {
            return prev.filter(m => m.id !== tempId);
          }
          // Otherwise replace temp with real
          return prev.map(m => m.id === tempId ? realMsg : m);
        });
      }

      // Update conversation updated_at
      await supabase
        .from('support_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConversationId);

      if (userRole === 'admin') fetchConversations();
    } catch (err) {
      // Rollback on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error('Error sending message:', err);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const clearMessages = async (cnpj: string) => {
    // In the new structure, we might just close the conversation
    if (!isSupabaseConfigured || !activeConversationId) return;
    
    try {
      const { error } = await supabase
        .from('support_conversations')
        .update({ status: 'closed' })
        .eq('id', activeConversationId);

      if (error) throw error;
      
      setMessages([]);
      setActiveConversationId(null);
      toast.success('Conversa encerrada');
    } catch (err) {
      console.error('Error closing conversation:', err);
    }
  };

  return { 
    messages, 
    sendMessage, 
    clearMessages, 
    isConnected: isChatConnected,
    isLoading,
    activeConversationId,
    conversations
  };
}


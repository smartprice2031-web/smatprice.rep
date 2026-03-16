import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { toast } from 'sonner';

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

let socketInstance: Socket | null = null;
let listenersAttached = false;

export function useSupportSocket() {
  const { 
    currentUser, userRole, 
    setUnreadSupportCount, setUnreadPerUser,
    messages, setMessages,
    setIsChatConnected, isChatConnected
  } = useStore();

  useEffect(() => {
    if (!currentUser) return;

    if (!socketInstance) {
      socketInstance = io({
        path: '/socket.io/',
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        timeout: 10000
      });
    }

    const socket = socketInstance;

    const onConnect = () => {
      console.log('Connected to support server with ID:', socket.id);
      setIsChatConnected(true);
      socket.emit('user:join', { ...currentUser, role: userRole });
      
      // Request notification permission
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    };

    const onConnectError = (err: any) => {
      console.error('Socket connection error details:', err.message, err);
      setIsChatConnected(false);
    };

    const onReconnect = (attempt: number) => {
      console.log('Socket reconnected after', attempt, 'attempts');
      setIsChatConnected(true);
      toast.success('Chat de suporte reconectado!');
    };

    const onDisconnect = () => {
      console.log('Socket disconnected');
      setIsChatConnected(false);
    };

    const onHistory = (history: Message[]) => {
      setMessages(history);
    };

    const onReceive = (message: Message) => {
      // Avoid duplicate messages in state
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      
      const state = useStore.getState();
      const isFromMe = message.from.cnpj === currentUser.cnpj && message.from.username === currentUser.username;
      
      if (!isFromMe) {
        // Always play sound for incoming messages
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.play().catch(e => console.log('Audio play blocked by browser policy'));

        // Notification logic
        let shouldNotify = false;
        
        if (!state.isSupportChatOpen) {
          shouldNotify = true;
        } else if (userRole === 'admin') {
          if (message.from.cnpj !== state.selectedUserCnpj) {
            shouldNotify = true;
          }
        } else {
          if (document.hidden) {
            shouldNotify = true;
          }
        }

        // Update unread counts
        if (userRole === 'admin' && message.from.cnpj && message.from.role === 'user') {
          if (message.from.cnpj !== state.selectedUserCnpj) {
            setUnreadPerUser(message.from.cnpj, prev => prev + 1);
          }
        }

        if (shouldNotify) {
          setUnreadSupportCount(prev => prev + 1);

          const senderName = message.from.role === 'admin' ? 'Suporte SmartPrice' : message.from.username;

          // System Notification
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              const n = new Notification(`Nova mensagem de ${senderName}`, {
                body: message.text,
                icon: '/favicon.ico'
              });
              n.onclick = () => {
                window.focus();
                useStore.getState().setSupportChatOpen(true);
                if (userRole === 'admin' && message.from.cnpj) {
                  useStore.getState().setSelectedUserCnpj(message.from.cnpj);
                }
              };
            } catch (e) {
              console.error('Error showing system notification:', e);
            }
          }

          toast.info(`Nova mensagem de ${senderName}`, {
            description: message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text,
            duration: 5000,
            action: {
              label: 'Ver',
              onClick: () => {
                useStore.getState().setSupportChatOpen(true);
                if (userRole === 'admin' && message.from.cnpj) {
                  useStore.getState().setSelectedUserCnpj(message.from.cnpj);
                  useStore.getState().setUnreadPerUser(message.from.cnpj, 0);
                }
              }
            }
          });
        }
      }
    };

    const onCleared = (data: { cnpj: string }) => {
      const state = useStore.getState();
      if (userRole === 'admin') {
        if (state.selectedUserCnpj === data.cnpj) {
          setMessages([]);
        }
      } else {
        if (currentUser.cnpj === data.cnpj) {
          setMessages([]);
        }
      }
      toast.success('Conversa limpa com sucesso!');
    };

    if (!listenersAttached) {
      socket.on('connect', onConnect);
      socket.on('connect_error', onConnectError);
      socket.on('reconnect', onReconnect);
      socket.on('disconnect', onDisconnect);
      socket.on('message:history', onHistory);
      socket.on('message:receive', onReceive);
      socket.on('message:cleared', onCleared);
      listenersAttached = true;
    }

    // If already connected, trigger the join logic
    if (socket.connected) {
      onConnect();
    }

    // Local cleanup: remove messages older than 6 hours from state
    const cleanupInterval = setInterval(() => {
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      setMessages(prev => prev.filter(m => new Date(m.timestamp).getTime() > sixHoursAgo));
    }, 60000); // Check every minute

    return () => {
      // We don't remove listeners here because we want them to persist across hook instances
      // since we're using a global socketInstance and listenersAttached flag.
      // This ensures that even if SupportChat unmounts, the App.tsx instance keeps listening.
      clearInterval(cleanupInterval);
    };
  }, [currentUser, userRole, setMessages, setUnreadPerUser, setUnreadSupportCount, setIsChatConnected]); 

  const sendMessage = (text: string, toCnpj?: string, attachment?: { data: string, type: 'image' | 'file' }) => {
    if (!socketInstance || !socketInstance.connected || !currentUser) return;

    const messageData = {
      from: { ...currentUser, role: userRole },
      text,
      attachment: attachment?.data,
      attachmentType: attachment?.type,
      to: userRole === 'admin' ? (toCnpj ? { cnpj: toCnpj } : undefined) : undefined
    };

    socketInstance.emit('message:send', messageData);
  };

  const clearMessages = (cnpj: string) => {
    if (!socketInstance || !socketInstance.connected) return;
    socketInstance.emit('message:clear', { cnpj, role: userRole });
  };

  return { messages, setMessages, sendMessage, clearMessages, isConnected: isChatConnected };
}

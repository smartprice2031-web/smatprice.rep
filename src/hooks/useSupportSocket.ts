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

export function useSupportSocket() {
  const { 
    currentUser, userRole, 
    setUnreadSupportCount, setUnreadPerUser,
    messages, setMessages 
  } = useStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const socket = io(); // Connect to same host/port
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to support server');
      socket.emit('user:join', { ...currentUser, role: userRole });
      
      // Request notification permission
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      toast.error('Erro ao conectar ao chat de suporte. Tentando reconectar...');
    });

    socket.on('message:history', (history: Message[]) => {
      setMessages(history);
    });

    socket.on('message:receive', (message: Message) => {
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
        if (userRole === 'admin' && message.from.cnpj && message.from.cnpj !== state.selectedUserCnpj) {
          setUnreadPerUser(message.from.cnpj, prev => prev + 1);
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
    });

    // Local cleanup: remove messages older than 6 hours from state
    const cleanupInterval = setInterval(() => {
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      setMessages(prev => prev.filter(m => new Date(m.timestamp).getTime() > sixHoursAgo));
    }, 60000); // Check every minute

    return () => {
      socket.disconnect();
      clearInterval(cleanupInterval);
    };
  }, [currentUser, userRole, setMessages, setUnreadPerUser, setUnreadSupportCount]); 

  const sendMessage = (text: string, toCnpj?: string, attachment?: { data: string, type: 'image' | 'file' }) => {
    if (!socketRef.current || !currentUser) return;

    const messageData = {
      from: { ...currentUser, role: userRole },
      text,
      attachment: attachment?.data,
      attachmentType: attachment?.type,
      to: userRole === 'admin' ? (toCnpj ? { cnpj: toCnpj } : undefined) : undefined
    };

    socketRef.current.emit('message:send', messageData);
  };

  return { messages, setMessages, sendMessage };
}

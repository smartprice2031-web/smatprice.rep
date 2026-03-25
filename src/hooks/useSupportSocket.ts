import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

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

let globalSocket: Socket | null = null;

export function useSupportSocket() {
  const { 
    currentUser, userRole, 
    setUnreadSupportCount, setUnreadPerUser,
    messages, setMessages,
    setIsChatConnected, isChatConnected
  } = useStore();

  useEffect(() => {
    if (!currentUser) return;

    const emitJoin = () => {
      if (globalSocket?.connected) {
        const normalizedCnpj = currentUser.cnpj.replace(/[^\d]/g, '');
        console.log('Emitting user:join', currentUser.username, normalizedCnpj);
        globalSocket.emit('user:join', {
          username: currentUser.username,
          cnpj: normalizedCnpj,
          role: userRole
        });
      }
    };

    if (!globalSocket) {
      // Connect to Socket.io
      globalSocket = io(window.location.origin, {
        path: '/socket.io/',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      globalSocket.on('connect', () => {
        console.log('Chat connected');
        setIsChatConnected(true);
        emitJoin();
      });

      globalSocket.on('disconnect', () => {
        console.log('Chat disconnected');
        setIsChatConnected(false);
      });

      globalSocket.on('message:history', (history: Message[]) => {
        // Filter for last 6 hours just in case server sends more
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
        const filtered = history.filter(m => new Date(m.timestamp).getTime() > sixHoursAgo);
        setMessages(filtered);
      });

      globalSocket.on('message:receive', (newMessage: Message) => {
        setMessages(prev => {
          if (prev.some(existing => existing.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        // Handle notifications
        const state = useStore.getState();
        const normalizedUserCnpj = currentUser.cnpj.replace(/[^\d]/g, '');
        const normalizedFromCnpj = newMessage.from.cnpj.replace(/[^\d]/g, '');
        const isFromMe = normalizedFromCnpj === normalizedUserCnpj && newMessage.from.username === currentUser.username;
        
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

          if (shouldNotify) {
            const senderName = newMessage.from.role === 'admin' ? 'Suporte SmartPrice' : newMessage.from.username;
            
            if (userRole === 'admin' && newMessage.from.role === 'user') {
              if (newMessage.from.cnpj !== state.selectedUserCnpj) {
                setUnreadPerUser(newMessage.from.cnpj, prev => {
                  const newCount = typeof prev === 'number' ? prev + 1 : 1;
                  // Update global count for admins
                  setUnreadSupportCount(current => (typeof current === 'number' ? current + 1 : 1));
                  return newCount;
                });
              }
            } else if (userRole === 'user' && newMessage.from.role === 'admin') {
              setUnreadSupportCount(prev => (typeof prev === 'number' ? prev + 1 : 1));
            }

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Nova mensagem de ${senderName}`, { 
                body: newMessage.text,
                icon: '/favicon.ico'
              });
            }

            toast.info(`Mensagem de ${senderName}`, {
              description: newMessage.text,
              duration: 8000,
              action: {
                label: 'Responder',
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
      });

      globalSocket.on('message:cleared', ({ cnpj }: { cnpj: string }) => {
        setMessages(prev => prev.filter(m => m.from.cnpj !== cnpj && m.to?.cnpj !== cnpj));
      });
    } else {
      // Socket already exists, but currentUser or userRole might have changed
      emitJoin();
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      // Don't disconnect here if we want background notifications
      // socket.disconnect();
    };
  }, [currentUser, userRole, setMessages, setUnreadPerUser, setUnreadSupportCount, setIsChatConnected]);


  const sendMessage = (text: string, toCnpj?: string) => {
    if (!globalSocket || !currentUser) return;

    const normalizedToCnpj = toCnpj ? toCnpj.replace(/[^\d]/g, '') : undefined;
    const normalizedFromCnpj = currentUser.cnpj.replace(/[^\d]/g, '');
    const targetStore = toCnpj ? useStore.getState().allowedStores.find(s => s.cnpj.replace(/[^\d]/g, '') === normalizedToCnpj) : null;

    const messageData = {
      from: {
        username: currentUser.username,
        cnpj: normalizedFromCnpj,
        role: userRole
      },
      to: normalizedToCnpj ? {
        cnpj: normalizedToCnpj,
        username: targetStore?.bandeira || null
      } : null,
      text,
      timestamp: new Date().toISOString()
    };

    globalSocket.emit('message:send', messageData);
  };

  const clearMessages = (cnpj: string) => {
    if (!globalSocket) return;
    globalSocket.emit('message:clear', { cnpj, role: userRole });
  };

  return { messages, setMessages, sendMessage, clearMessages, isConnected: isChatConnected };
}


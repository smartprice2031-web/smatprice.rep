import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useSupportSocket, Message } from '../hooks/useSupportSocket';
import { MessageCircle, Send, X, User, Trash2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SupportChat() {
  const { 
    currentUser, userRole, isSupportChatOpen, setSupportChatOpen,
    setUnreadSupportCount, selectedUserCnpj, setSelectedUserCnpj,
    unreadPerUser, setUnreadPerUser, messages, allowedStores
  } = useStore();
  const { sendMessage, clearMessages, isConnected } = useSupportSocket();
  const [inputText, setInputText] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleReconnect = () => {
    toast.promise(
      new Promise((resolve) => {
        // Re-trigger socket connection logic if needed, but io() handles it.
        // We can just wait for isConnected to become true.
        const check = setInterval(() => {
          if (useStore.getState().isChatConnected) {
            clearInterval(check);
            resolve(true);
          }
        }, 500);
        setTimeout(() => {
          clearInterval(check);
          resolve(false);
        }, 5000);
      }),
      {
        loading: 'Tentando reconectar...',
        success: 'Conectado!',
        error: 'Não foi possível conectar. Tente novamente mais tarde.'
      }
    );
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isAtBottom);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText, selectedUserCnpj || undefined);
    setInputText('');
  };

  useEffect(() => {
    if (isSupportChatOpen && userRole === 'user') {
      setUnreadSupportCount(0);
    }
  }, [isSupportChatOpen, userRole, setUnreadSupportCount]);

  useEffect(() => {
    if (selectedUserCnpj && userRole === 'admin') {
      const currentUnread = useStore.getState().unreadPerUser[selectedUserCnpj] || 0;
      if (currentUnread > 0) {
        setUnreadSupportCount(prev => Math.max(0, (typeof prev === 'number' ? prev : 0) - currentUnread));
        setUnreadPerUser(selectedUserCnpj, 0);
      }
    }
  }, [selectedUserCnpj, userRole, setUnreadSupportCount, setUnreadPerUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSupportChatOpen]);

  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearChat = () => {
    clearMessages(userRole === 'admin' ? selectedUserCnpj! : currentUser?.cnpj!);
    setConfirmClear(false);
  };

  if (!isSupportChatOpen) return null;

  // Filter messages for the current view
  // If user: only show messages between them and admin
  // If admin: show all messages, but maybe group by user
  const filteredMessages = userRole === 'admin' 
    ? (selectedUserCnpj ? messages.filter(m => m.from.cnpj === selectedUserCnpj || m.to?.cnpj === selectedUserCnpj) : [])
    : messages;

  // For admin: get list of all authorized users
  const chatUsers = userRole === 'admin' 
    ? allowedStores.map(store => {
        const lastMsg = [...messages].reverse().find(m => m.from.cnpj === store.cnpj || m.to?.cnpj === store.cnpj);
        return { 
          cnpj: store.cnpj, 
          username: store.cnpj, // Using CNPJ as username if not found in messages
          bandeira: store.bandeira,
          lastMessage: lastMsg?.text,
          lastTimestamp: lastMsg?.timestamp
        };
      }).sort((a, b) => {
        if (!a.lastTimestamp) return 1;
        if (!b.lastTimestamp) return -1;
        return new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime();
      })
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 md:p-4 no-print">
      <div className={cn(
        "bg-white dark:bg-zinc-900 w-full rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800 transition-all duration-300",
        userRole === 'admin' ? "max-w-6xl w-[95vw] h-[85vh]" : "max-w-2xl h-[70vh]"
      )}>
        {/* Header */}
        <div className={cn(
          "border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50",
          userRole === 'admin' ? "p-3 md:p-4" : "p-6"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20",
              userRole === 'admin' ? "p-1.5" : "p-2"
            )}>
              <MessageCircle className={userRole === 'admin' ? "w-5 h-5" : "w-6 h-6"} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-black tracking-tighter uppercase",
                  userRole === 'admin' ? "text-base" : "text-xl"
                )}>Suporte SmartPrice</h3>
                <div className={cn(
                  "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
                  isConnected && "animate-pulse"
                )} />
              </div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {userRole === 'admin' ? 'Central de Atendimento' : 'Suporte Online'}
              </p>
              {userRole === 'user' && (
                <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter mt-0.5">
                  Adm: (99) 9 8470-1752 | (99) 9 8199-0035
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setSupportChatOpen(false)} 
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 md:w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {userRole === 'admin' && (
            <div className="w-48 md:w-56 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-y-auto">
              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Lojas</p>
              </div>
              {chatUsers.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-[10px] text-zinc-500 font-medium">Nenhuma loja.</p>
                </div>
              ) : (
                chatUsers.map(user => (
                  <button
                    key={user.cnpj}
                    onClick={() => setSelectedUserCnpj(user.cnpj)}
                    className={cn(
                      "w-full p-3 flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left border-b border-zinc-100 dark:border-zinc-800/50",
                      selectedUserCnpj === user.cnpj && "bg-blue-50 dark:bg-blue-900/10 border-l-4 border-l-blue-600"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="overflow-hidden flex-grow">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold truncate">{user.bandeira}</p>
                        {user.lastTimestamp && (
                          <span className="text-[7px] text-zinc-400">
                            {new Date(user.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-500 truncate">{user.cnpj}</p>
                    </div>
                    {unreadPerUser[user.cnpj] > 0 && (
                      <div className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                        {unreadPerUser[user.cnpj]}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-grow flex flex-col bg-white dark:bg-zinc-900 relative">
            {userRole === 'admin' && !selectedUserCnpj ? (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-zinc-400" />
                </div>
                <h4 className="text-lg font-bold mb-2">Selecione uma conversa</h4>
                <p className="text-sm text-zinc-500 max-w-xs">
                  Escolha um usuário na lista ao lado para visualizar as mensagens e responder.
                </p>
              </div>
            ) : (
              <>
                {/* Messages List */}
                <div 
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex-grow overflow-y-auto p-4 space-y-2 bg-[#e5ddd5] dark:bg-zinc-950 relative"
                  style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay' }}
                >
                  <div className="sticky top-0 right-0 z-10 flex justify-end p-2 pointer-events-none">
                    <div className="pointer-events-auto">
                      {confirmClear ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-1 rounded-full border border-red-200 dark:border-red-900/30 shadow-lg animate-in fade-in zoom-in duration-200">
                          <span className="text-[8px] font-black uppercase tracking-widest text-red-500 px-2">Limpar?</span>
                          <button 
                            onClick={handleClearChat}
                            className="px-3 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                          >
                            Sim
                          </button>
                          <button 
                            onClick={() => setConfirmClear(false)}
                            className="px-3 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmClear(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700 rounded-full text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {showScrollButton && (
                    <button 
                      onClick={scrollToBottom}
                      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl animate-bounce flex items-center gap-2"
                    >
                      Novas Mensagens Abaixo
                    </button>
                  )}

                  {filteredMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="p-4 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl">
                        <AlertCircle className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="max-w-xs bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-4 rounded-2xl">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Inicie uma conversa</p>
                        <p className="text-xs text-zinc-500">
                          {userRole === 'admin' 
                            ? "Envie uma resposta para ajudar o usuário." 
                            : "Descreva o problema ou o produto que está faltando. Nossa equipe responderá em breve."}
                        </p>
                      </div>
                    </div>
                  )}

                  {filteredMessages.map((msg, idx) => {
                    const isMe = msg.from.cnpj === currentUser?.cnpj && msg.from.username === currentUser?.username;
                    const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
                    const isFirstInGroup = !prevMsg || prevMsg.from.cnpj !== msg.from.cnpj;
                    
                    return (
                      <div 
                        key={msg.id}
                        className={cn(
                          "flex flex-col w-full",
                          isMe ? "items-end" : "items-start",
                          isFirstInGroup ? "mt-4" : "mt-1"
                        )}
                      >
                        <div className={cn(
                          "relative max-w-[85%] px-3 py-1.5 shadow-sm",
                          isMe 
                            ? "bg-[#dcf8c6] dark:bg-emerald-900/40 text-zinc-900 dark:text-zinc-100 rounded-lg rounded-tr-none" 
                            : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg rounded-tl-none"
                        )}>
                          {/* Tail */}
                          {isFirstInGroup && (
                            <div className={cn(
                              "absolute top-0 w-2 h-2",
                              isMe 
                                ? "right-[-8px] border-l-[8px] border-l-[#dcf8c6] dark:border-l-emerald-900/40 border-b-[8px] border-b-transparent" 
                                : "left-[-8px] border-r-[8px] border-r-white dark:border-r-zinc-800 border-b-[8px] border-b-transparent"
                            )} />
                          )}
                          
                          {!isMe && isFirstInGroup && userRole === 'admin' && (
                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                              {msg.from.username}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-end gap-2">
                            <p className="text-sm leading-relaxed break-words max-w-full">
                              {msg.text}
                            </p>
                            <div className="flex items-center gap-1 ml-auto pt-1">
                              <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                <div className="flex items-center -space-x-1">
                                  <svg viewBox="0 0 16 15" width="12" height="11" className="text-blue-500 fill-current">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L5.066 9.879a.32.32 0 0 1-.484.033L1.582 7.13a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l3.413 3.274c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"></path>
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input Area */}
                <div className={cn(
                  "border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
                  userRole === 'admin' ? "p-2 md:p-3" : "p-4 md:p-6"
                )}>
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      className="flex-grow bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

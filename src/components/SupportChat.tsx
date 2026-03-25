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
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                )} />
              </div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {isConnected ? (userRole === 'admin' ? 'Central de Atendimento' : 'Suporte Online') : (
                  <span className="text-emerald-600/50 flex items-center gap-1 animate-pulse">
                    Sincronizando...
                  </span>
                )}
              </p>
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
                  className="flex-grow overflow-y-auto p-6 space-y-4 bg-zinc-50/30 dark:bg-zinc-950/30 relative"
                >
                  <div className="absolute top-4 right-4 z-10">
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                        Limpar Histórico
                      </button>
                    )}
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
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                        <AlertCircle className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Inicie uma conversa</p>
                        <p className="text-xs text-zinc-500">
                          {userRole === 'admin' 
                            ? "Envie uma resposta para ajudar o usuário." 
                            : "Descreva o problema ou o produto que está faltando. Nossa equipe responderá em breve."}
                        </p>
                      </div>
                    </div>
                  )}
                  {filteredMessages.map((msg) => {
                    const isMe = msg.from.cnpj === currentUser?.cnpj && msg.from.username === currentUser?.username;
                    return (
                      <div 
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[80%]",
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          {!isMe && (
                            <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-400">
                              {msg.from.role === 'admin' ? 'Suporte' : msg.from.username}
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-400 font-medium">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm font-medium shadow-sm",
                          isMe 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-700 rounded-tl-none"
                        )}>
                          {msg.text}
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

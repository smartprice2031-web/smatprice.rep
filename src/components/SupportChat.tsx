import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useSupportSocket, Message } from '../hooks/useSupportSocket';
import { MessageCircle, Send, X, User, Shield, Clock, AlertCircle, Paperclip, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
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
  const [attachment, setAttachment] = useState<{ data: string, type: 'image' | 'file', name: string } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        setAttachment({ 
          data, 
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isSupportChatOpen) {
      setUnreadSupportCount(0);
    }
  }, [isSupportChatOpen, setUnreadSupportCount]);

  useEffect(() => {
    if (selectedUserCnpj) {
      setUnreadPerUser(selectedUserCnpj, 0);
    }
  }, [selectedUserCnpj, setUnreadPerUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSupportChatOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    sendMessage(inputText, selectedUserCnpj || undefined, attachment ? { data: attachment.data, type: attachment.type } : undefined);
    setInputText('');
    setAttachment(null);
  };

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 no-print">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tighter uppercase">Suporte SmartPrice</h3>
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  isConnected ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                )} />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {isConnected ? (userRole === 'admin' ? 'Central de Atendimento' : 'Enviar mensagem para o suporte') : 'Desconectado - Tentando reconectar...'}
              </p>
              {userRole === 'user' && (
                <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter mt-0.5">
                  WhatsApp Adm: (99) 9 8470-1752 • (99) 9 8199-0035
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setSupportChatOpen(false)} 
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow flex overflow-hidden">
          {userRole === 'admin' && (
            <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-y-auto">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Lojas Autorizadas</p>
              </div>
              {chatUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-zinc-500 font-medium">Nenhuma loja cadastrada.</p>
                </div>
              ) : (
                chatUsers.map(user => (
                  <button
                    key={user.cnpj}
                    onClick={() => setSelectedUserCnpj(user.cnpj)}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left border-b border-zinc-100 dark:border-zinc-800/50",
                      selectedUserCnpj === user.cnpj && "bg-blue-50 dark:bg-blue-900/10 border-l-4 border-l-blue-600"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="overflow-hidden flex-grow">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold truncate">{user.bandeira}</p>
                        {user.lastTimestamp && (
                          <span className="text-[8px] text-zinc-400">
                            {new Date(user.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate">{user.cnpj}</p>
                      {user.lastMessage && (
                        <p className="text-[10px] text-zinc-400 truncate mt-1 italic">"{user.lastMessage}"</p>
                      )}
                    </div>
                    {unreadPerUser[user.cnpj] > 0 && (
                      <div className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {unreadPerUser[user.cnpj]}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-grow flex flex-col bg-white dark:bg-zinc-900">
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
                          {msg.attachment && (
                            <div className="mb-2">
                              {msg.attachmentType === 'image' ? (
                                <img 
                                  src={msg.attachment} 
                                  alt="Anexo" 
                                  className="max-w-full rounded-lg border border-white/20 cursor-pointer hover:scale-[1.02] transition-transform"
                                  onClick={() => window.open(msg.attachment, '_blank')}
                                />
                              ) : (
                                <a 
                                  href={msg.attachment} 
                                  download="anexo"
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg border",
                                    isMe ? "bg-white/10 border-white/20 text-white" : "bg-zinc-100 dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600"
                                  )}
                                >
                                  <FileText className="w-4 h-4" />
                                  <span className="text-xs font-bold truncate max-w-[150px]">Arquivo Anexo</span>
                                </a>
                              )}
                            </div>
                          )}
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  {/* Attachment Preview */}
                  {attachment && (
                    <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3">
                        {attachment.type === 'image' ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            <img src={attachment.data} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold truncate max-w-[200px]">{attachment.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{attachment.type === 'image' ? 'Imagem' : 'Arquivo'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAttachment(null)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}


                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 p-4 rounded-2xl transition-all active:scale-95"
                        title="Anexar Arquivo"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      className="flex-grow bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() && !attachment}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
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

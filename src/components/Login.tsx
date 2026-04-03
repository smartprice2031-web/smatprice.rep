import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { ShoppingBag, Building2, Flag, User, Lock, ArrowRight, Moon, Sun, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Login() {
  const { login, allowedStores, flags, theme, toggleTheme } = useStore();
  const [formData, setFormData] = useState({
    cnpj: '',
    bandeira: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastCnpj, setLastCnpj] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    const savedCnpj = localStorage.getItem('smartprice_last_cnpj');
    if (savedCnpj) {
      setLastCnpj(savedCnpj);
    }
  }, []);

  const isAdmin = formData.username.toLowerCase() === 'adm';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isAdmin) {
        if (formData.password === '8814') {
          await login('admin', {
            username: formData.username,
            cnpj: 'Administrativo',
            bandeira: 'Master'
          });
        } else {
          setError('Senha de administrador incorreta.');
          setIsLoading(false);
        }
      } else {
        if (formData.cnpj && formData.bandeira && formData.username) {
          // Normalize CNPJ for comparison
          const normalizedInputCnpj = formData.cnpj.replace(/[^\d]/g, '');
          
          // Check if CNPJ is allowed
          const isAllowed = allowedStores.some(store => store.cnpj?.replace(/[^\d]/g, '') === normalizedInputCnpj);
          
          if (isAllowed) {
            // Save last used CNPJ
            localStorage.setItem('smartprice_last_cnpj', formData.cnpj);
            
            await login('user', {
              username: formData.username,
              cnpj: formData.cnpj,
              bandeira: formData.bandeira
            });
          } else {
            setError('Este CNPJ não está autorizado a acessar o sistema.');
            setIsLoading(false);
          }
        } else {
          setError('Por favor, preencha todos os campos.');
          setIsLoading(false);
        }
      }
    } catch (err) {
      setError('Erro ao acessar o sistema. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Theme Toggle */}
        <div className="flex flex-col items-center mb-8 relative">
          <button 
            onClick={toggleTheme}
            className="absolute -top-2 -right-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all active:scale-95"
            title={theme === 'dark' ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">
            SMART<span className="text-blue-600">PRICE</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest">Acesso ao Sistema</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl shadow-black/5 dark:shadow-black/20 border border-zinc-200 dark:border-zinc-800 p-8 md:p-10 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isAdmin && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 ml-1">CNPJ da Loja</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      onFocus={() => lastCnpj && setShowSuggestion(true)}
                      onBlur={() => setTimeout(() => setShowSuggestion(false), 200)}
                    />
                    {showSuggestion && lastCnpj && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, cnpj: lastCnpj });
                            setShowSuggestion(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                        >
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">{lastCnpj}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 ml-1">Bandeira</label>
                  <div className="relative">
                    <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <select
                      className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                      value={formData.bandeira}
                      onChange={(e) => setFormData({ ...formData, bandeira: e.target.value })}
                    >
                      <option value="" className="bg-white dark:bg-zinc-900">Selecione a Bandeira</option>
                      {flags.map(flag => (
                        <option key={flag} value={flag} className="bg-white dark:bg-zinc-900">{flag}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 ml-1">Usuário</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Seu usuário"
                  className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 ml-1">Senha de Administrador</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="password"
                    placeholder="••••"
                    className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-xs font-bold text-center animate-pulse">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-tighter py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Atualizando Dados...
                </>
              ) : (
                <>
                  Acessar Sistema
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          SmartPrice v1.1 • Gestão de Etiquetas Inteligentes
        </p>
      </div>
    </div>
  );
}

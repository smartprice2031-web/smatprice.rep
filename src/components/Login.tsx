import React, { useState } from 'react';
import { useStore } from '../store';
import { ShoppingBag, Building2, Flag, User, Lock, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Login() {
  const { login, allowedStores, addAccessLog, flags } = useStore();
  const [formData, setFormData] = useState({
    cnpj: '',
    bandeira: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const isAdmin = formData.username.toLowerCase() === 'adm';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isAdmin) {
      if (formData.password === '8814') {
        addAccessLog({
          cnpj: 'Administrativo',
          username: formData.username,
          bandeira: 'Master'
        });
        login('admin', {
          username: formData.username,
          cnpj: 'Administrativo',
          bandeira: 'Master'
        });
      } else {
        setError('Senha de administrador incorreta.');
      }
    } else {
      if (formData.cnpj && formData.bandeira && formData.username) {
        // Check if CNPJ is allowed
        const isAllowed = allowedStores.some(store => store.cnpj === formData.cnpj);
        
        if (isAllowed) {
          addAccessLog({
            cnpj: formData.cnpj,
            username: formData.username,
            bandeira: formData.bandeira
          });
          login('user', {
            username: formData.username,
            cnpj: formData.cnpj,
            bandeira: formData.bandeira
          });
        } else {
          setError('Este CNPJ não está autorizado a acessar o sistema.');
        }
      } else {
        setError('Por favor, preencha todos os campos.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">
            SMART<span className="text-blue-600">PRICE</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest">Acesso ao Sistema</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-zinc-200 dark:border-zinc-800 p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isAdmin && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-white ml-1">CNPJ da Loja</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-300" />
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-white ml-1">Bandeira</label>
                  <div className="relative">
                    <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-300" />
                    <select
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                      value={formData.bandeira}
                      onChange={(e) => setFormData({ ...formData, bandeira: e.target.value })}
                    >
                      <option value="">Selecione a Bandeira</option>
                      {flags.map(flag => (
                        <option key={flag} value={flag}>{flag}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-white ml-1">Usuário</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-300" />
                <input
                  type="text"
                  placeholder="Seu usuário"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-white ml-1">Senha de Administrador</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-300" />
                  <input
                    type="password"
                    placeholder="••••"
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-tighter py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group transition-all active:scale-95"
            >
              Acessar Sistema
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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

import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Trash2, Shield, Store, Search, X, History, User, Calendar, Clock, Flag, Pencil, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function UserManagement() {
  const { allowedStores, addAllowedStore, removeAllowedStore, accessLogs, flags, addFlag, removeFlag, updateFlag, saveUsersAndFlags } = useStore();
  const [activeTab, setActiveTab] = useState<'stores' | 'history' | 'flags'>('stores');
  const [newCnpj, setNewCnpj] = useState('');
  const [newBandeira, setNewBandeira] = useState('');
  const [newFlagName, setNewFlagName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fix: Ensure newBandeira is set when flags are loaded
  React.useEffect(() => {
    if (!newBandeira && flags.length > 0) {
      setNewBandeira(flags[0]);
    }
  }, [flags, newBandeira]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCnpj.trim()) return;
    
    addAllowedStore({
      cnpj: newCnpj.trim(),
      bandeira: newBandeira
    });
    
    setNewCnpj('');
  };

  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [editFlagName, setEditFlagName] = useState('');

  const handleAddFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagName.trim()) return;
    addFlag(newFlagName.trim());
    setNewFlagName('');
  };

  const handleUpdateFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlag || !editFlagName.trim()) return;
    updateFlag(editingFlag, editFlagName.trim());
    setEditingFlag(null);
    setEditFlagName('');
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveUsersAndFlags();
      toast.success('Configurações de usuários e bandeiras salvas com sucesso no Supabase!');
    } catch (error) {
      toast.error('Erro ao salvar no Supabase. Verifique sua conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (flag: string) => {
    setEditingFlag(flag);
    setEditFlagName(flag);
  };

  const filteredStores = allowedStores.filter(store => 
    store.cnpj.includes(searchTerm) || 
    store.bandeira.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = accessLogs.filter(log =>
    log.cnpj.includes(searchTerm) ||
    log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.bandeira.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFlags = flags.filter(flag => 
    flag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6">
        <div className="flex overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('stores')}
            className={cn(
              "py-4 px-6 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all whitespace-nowrap",
              activeTab === 'stores' 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <Store className="w-4 h-4" />
            Lojas Autorizadas
          </button>
          <button 
            onClick={() => setActiveTab('flags')}
            className={cn(
              "py-4 px-6 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all whitespace-nowrap",
              activeTab === 'flags' 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <Flag className="w-4 h-4" />
            Bandeiras
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "py-4 px-6 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all whitespace-nowrap",
              activeTab === 'history' 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <History className="w-4 h-4" />
            Histórico de Acesso
          </button>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Alterações
        </button>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto">
        {activeTab === 'stores' ? (
          <>
            {/* Add New Store Form */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg">Autorizar Novo Acesso</h3>
              </div>
              
              <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">CNPJ da Loja</label>
                  <input
                    type="text"
                    value={newCnpj}
                    onChange={(e) => setNewCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Bandeira</label>
                  <select
                    value={newBandeira}
                    onChange={(e) => setNewBandeira(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  >
                    {flags.map(flag => (
                      <option key={flag} value={flag}>{flag}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full h-[46px] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-tighter rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    Autorizar CNPJ
                  </button>
                </div>
              </form>
            </div>

            {/* Allowed Stores List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-zinc-400" />
                  <h3 className="font-bold text-lg">Lojas Autorizadas</h3>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full font-black">
                    {allowedStores.length}
                  </span>
                </div>
                
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar CNPJ ou Bandeira..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredStores.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Nenhuma loja encontrada</p>
                  </div>
                ) : (
                  filteredStores.map((store) => (
                    <div 
                      key={store.cnpj}
                      className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
                          <Store className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{store.cnpj}</p>
                          <p className="text-xs font-black uppercase tracking-tighter text-blue-600">{store.bandeira}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeAllowedStore(store.cnpj)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remover Autorização"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase leading-relaxed">
                Atenção: Apenas os CNPJs listados acima poderão acessar o sistema SmartPrice. 
                O acesso administrativo (usuário "Adm") ignora esta restrição para permitir o gerenciamento.
              </p>
            </div>
          </>
        ) : activeTab === 'flags' ? (
          <div className="space-y-8">
            {/* Add New Flag Form */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <Flag className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg">Adicionar Nova Bandeira</h3>
              </div>
              
              <form onSubmit={handleAddFlag} className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome da Bandeira</label>
                  <input
                    type="text"
                    value={newFlagName}
                    onChange={(e) => setNewFlagName(e.target.value)}
                    placeholder="Ex: Farmácia Popular"
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    required
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="h-[46px] px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-tighter rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar
                  </button>
                </div>
              </form>
            </div>

            {/* Flags List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-zinc-400" />
                  <h3 className="font-bold text-lg">Bandeiras Disponíveis</h3>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full font-black">
                    {flags.length}
                  </span>
                </div>
                
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar bandeira..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredFlags.length === 0 ? (
                   <div className="col-span-full text-center py-12 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Nenhuma bandeira encontrada</p>
                  </div>
                ) : (
                  filteredFlags.map((flag) => (
                    <div 
                      key={flag}
                      className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500/50 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
                          <Flag className="w-5 h-5" />
                        </div>
                        
                        {editingFlag === flag ? (
                          <form onSubmit={handleUpdateFlag} className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={editFlagName}
                              onChange={(e) => setEditFlagName(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                              autoFocus
                            />
                            <button type="submit" className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg">
                              <Plus className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setEditingFlag(null)} className="p-2 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </form>
                        ) : (
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{flag}</p>
                        )}
                      </div>
                      
                      {editingFlag !== flag && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => startEditing(flag)}
                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-all"
                            title="Editar Bandeira"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => removeFlag(flag)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                            title="Remover Bandeira"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-zinc-400" />
                <h3 className="font-bold text-lg">Histórico de Acessos</h3>
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {accessLogs.length}
                </span>
              </div>
              
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar histórico..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Data/Hora</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">CNPJ</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Usuário</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Bandeira</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                        Nenhum registro de acesso
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">{log.cnpj}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                              <User className="w-3 h-3" />
                            </div>
                            <span className="text-xs font-bold">{log.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-black uppercase tracking-tighter text-zinc-600 dark:text-zinc-400">
                            {log.bandeira}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

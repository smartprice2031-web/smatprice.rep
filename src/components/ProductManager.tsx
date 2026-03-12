import React, { useState, useEffect } from 'react';
import { useStore, Product } from '../store';
import { Plus, Search, Edit2, Trash2, Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { toast } from 'sonner';

const ProductManager = () => {
  const { products, fetchProducts, selectProduct } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    price: '',
    image: null,
    category: '',
  });

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ id: string | number } | null>(null);

  const checkConnection = async () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      setConnectionError("Credenciais do Supabase não configuradas.");
      return false;
    }
    return true;
  };

  const handleSync = async () => {
    if (!await checkConnection()) return;
    setIsSyncing(true);
    setConnectionError(null);
    try {
      await fetchProducts();
    } catch (err) {
      setConnectionError("Erro ao conectar com o Supabase.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productsToInsert = JSON.parse(bulkData);
      if (!Array.isArray(productsToInsert)) throw new Error('O formato deve ser um array de objetos.');
      
      const { error } = await supabase
        .from('products')
        .insert(productsToInsert.map(p => ({
          name: p.name || 'Sem nome',
          description: p.description || '',
          price: p.price || 'R$ 0,00',
          image: p.image || null,
          category: p.category || ''
        })));

      if (error) throw error;
      
      setIsBulkModalOpen(false);
      setBulkData('');
      await fetchProducts();
      toast.success('Produtos adicionados com sucesso!');
    } catch (error: any) {
      console.error("Error bulk inserting products:", error);
      toast.error("Erro ao importar produtos. Verifique se o formato JSON está correto.");
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await fetchProducts();
        // If fetch succeeds and products is empty, but we have no error, it might just be empty.
        // But let's check if the connection is actually valid.
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!url || !key) {
          setConnectionError("Credenciais do Supabase não configuradas no ambiente.");
        }
      } catch (err) {
        setConnectionError("Falha ao carregar produtos. Verifique sua conexão e tabelas.");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct && editingProduct.id) {
        const { error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([{ ...formData }]);
        
        if (error) throw error;
        toast.success('Produto cadastrado com sucesso!');
      }
      
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', image: null, category: '' });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product to Supabase:", error);
      toast.error("Erro ao salvar produto no Supabase.");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Produto excluído com sucesso!');
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product from Supabase:", error);
      toast.error("Erro ao excluir produto.");
    } finally {
      setConfirmDelete(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Gerenciar Produtos
            <span className="text-sm font-normal text-zinc-500 ml-2 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              {products.length} {products.length === 1 ? 'produto' : 'produtos'}
            </span>
          </h2>
          {connectionError && (
            <p className="text-xs text-red-500 font-medium flex items-center gap-1">
              ⚠️ {connectionError}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold disabled:opacity-50"
            title="Sincronizar com o banco de dados"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold"
          >
            Adicionar em Massa
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', description: '', price: '', image: null, category: '' });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar produtos..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="font-medium">Carregando produtos...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product, index) => (
            <div 
              key={product.id || `product-${index}`}
              className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-4 hover:shadow-md transition-shadow group"
            >
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-700 rounded-lg overflow-hidden flex-shrink-0">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <Package className="w-8 h-8" />
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <h3 className="font-bold text-lg uppercase">{product.name}</h3>
                <p className="text-sm text-zinc-500 line-clamp-1">{product.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-blue-600 font-bold">{product.price}</span>
                  {product.category && (
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded text-zinc-500">
                      {product.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingProduct(product);
                    setFormData({
                      name: product.name,
                      description: product.description,
                      price: product.price,
                      image: product.image,
                      category: product.category,
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => product.id !== undefined && setConfirmDelete({ id: product.id })}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center text-zinc-500 bg-white dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Nenhum produto encontrado.</p>
            <p className="text-sm opacity-60">Tente buscar por outro nome ou cadastre um novo produto.</p>
          </div>
        )}
      </div>

      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Adicionar em Massa</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">&times;</button>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Dados JSON (Array de objetos)</label>
                <textarea
                  rows={10}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-xs"
                  placeholder='[{"name": "Produto A", "price": "R$ 10,00"}, {"name": "Produto B", "price": "R$ 20,00"}]'
                  value={bulkData}
                  onChange={e => setBulkData(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Importar Produtos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Nome do Produto</label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Preço</label>
                  <input
                    required
                    type="text"
                    placeholder="R$ 0,00"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">URL da Imagem do Produto</label>
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                      value={formData.image || ''}
                      onChange={e => setFormData({ ...formData, image: e.target.value })}
                    />
                    
                    {formData.image && (
                      <div className="relative inline-block">
                        <img 
                          src={formData.image} 
                          alt="Preview" 
                          className="h-32 w-32 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Erro+na+URL';
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, image: null })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    {!formData.image && (
                      <div className="py-8 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-lg text-center">
                        <Package className="mx-auto h-8 w-8 text-zinc-400 opacity-50" />
                        <p className="text-xs text-zinc-500 mt-2">Insira a URL para visualizar a imagem</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-sm text-zinc-500">
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;

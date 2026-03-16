import React, { useState, useEffect, useMemo } from 'react';
import { useStore, Product } from '../store';
import { Search, Package, Check, X, RefreshCw } from 'lucide-react';

const ProductSelector: React.FC<{ onSelect?: (product: Product) => void }> = ({ onSelect }) => {
  const { 
    products, fetchProducts, selectProduct, 
    textElements1, textElements2, textElements3, 
    productImage3, setElement,
    layouts, activeLayoutIndex
  } = useStore();

  const showThirdProduct = productImage3.visible;
  const [searchTerm1, setSearchTerm1] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [searchTerm3, setSearchTerm3] = useState('');
  const [generalSearchTerm, setGeneralSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchProducts();
    } finally {
      setIsSyncing(false);
    }
  };

  const filterProducts = (term: string) => {
    if (!term.trim()) return products; // Show all products by default when not searching
    const lowerTerm = term.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerTerm) ||
      (p.category && p.category.toLowerCase().includes(lowerTerm)) ||
      (p.description && p.description.toLowerCase().includes(lowerTerm))
    );
  };

  const filteredProducts1 = useMemo(() => filterProducts(searchTerm1), [searchTerm1, products]);
  const filteredProducts2 = useMemo(() => filterProducts(searchTerm2), [searchTerm2, products]);
  const filteredProducts3 = useMemo(() => filterProducts(searchTerm3), [searchTerm3, products]);
  const generalFilteredProducts = useMemo(() => filterProducts(generalSearchTerm), [generalSearchTerm, products]);

  if (onSelect) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar produto pelo nome..."
            className="w-full pl-10 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            value={generalSearchTerm}
            onChange={(e) => setGeneralSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {generalFilteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => onSelect(product)}
              className="w-full text-left p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-zinc-900 transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                {product.image ? (
                  <img src={product.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="w-full h-full p-2 text-zinc-400" />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="font-bold text-sm truncate uppercase">{product.name}</h4>
                <p className="text-xs text-emerald-600 font-black">{product.price}</p>
              </div>
            </button>
          ))}
          {generalFilteredProducts.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm italic">
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <ProductSlot 
        slot={1}
        searchTerm={searchTerm1}
        setSearchTerm={setSearchTerm1}
        filteredProducts={filteredProducts1}
        currentPrice={textElements1.price.text}
        currentName={textElements1.name.text}
        currentDescription={textElements1.description.text}
        setElement={setElement}
        selectProduct={selectProduct}
        isSyncing={isSyncing}
        handleSync={handleSync}
      />
      
      <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

      <ProductSlot 
        slot={2}
        searchTerm={searchTerm2}
        setSearchTerm={setSearchTerm2}
        filteredProducts={filteredProducts2}
        currentPrice={textElements2.price.text}
        currentName={textElements2.name.text}
        currentDescription={textElements2.description.text}
        setElement={setElement}
        selectProduct={selectProduct}
        isSyncing={isSyncing}
        handleSync={handleSync}
      />

      {showThirdProduct && (
        <>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

          <ProductSlot 
            slot={3}
            searchTerm={searchTerm3}
            setSearchTerm={setSearchTerm3}
            filteredProducts={filteredProducts3}
            currentPrice={textElements3.price.text}
            currentName={textElements3.name.text}
            currentDescription={textElements3.description.text}
            setElement={setElement}
            selectProduct={selectProduct}
            isSyncing={isSyncing}
            handleSync={handleSync}
          />
        </>
      )}
    </div>
  );
};

const ProductSlot = ({ 
  slot, 
  searchTerm, 
  setSearchTerm, 
  filteredProducts, 
  currentPrice, 
  currentName,
  currentDescription,
  setElement,
  selectProduct,
  isSyncing,
  handleSync
}: { 
  slot: 1 | 2 | 3, 
  searchTerm: string, 
  setSearchTerm: (v: string) => void, 
  filteredProducts: any[], 
  currentPrice: string,
  currentName: string,
  currentDescription: string,
  setElement: any,
  selectProduct: any,
  isSyncing: boolean,
  handleSync: () => void
}) => (
  <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-800">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">
        Produto {slot === 1 ? 'Superior' : slot === 2 ? 'Inferior' : 'Central'}
      </h3>
      <button 
        onClick={handleSync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 px-2 py-1 text-zinc-400 hover:text-blue-600 transition-colors disabled:opacity-50 text-[10px] font-black uppercase tracking-tighter"
        title="Sincronizar produtos"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Sincronizando...' : 'Atualizar'}
      </button>
    </div>

    {/* Manual Info Editing */}
    <div className="grid grid-cols-1 gap-3">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          Nome do Produto
        </label>
        <input
          type="text"
          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
          value={currentName}
          onChange={(e) => setElement(slot, 'name', { text: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          Descrição
        </label>
        <textarea
          rows={2}
          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          value={currentDescription}
          onChange={(e) => setElement(slot, 'description', { text: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          Preço
        </label>
        <input
          type="text"
          placeholder="Ex: R$ 9,99"
          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
          value={currentPrice}
          onChange={(e) => setElement(slot, 'price', { text: e.target.value })}
        />
      </div>
    </div>

    {/* Search Input */}
    <div className="space-y-1">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
        Buscar Produto
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" />
        <input
          type="text"
          placeholder="Digite para pesquisar..."
          className="w-full pl-9 pr-10 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>

    {/* Product List */}
    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
      {filteredProducts.length > 0 ? (
        filteredProducts.map((product) => {
          const isSelected = currentName === product.name;
          return (
            <button
              key={product.id}
              onClick={() => {
                selectProduct(slot, product);
                setSearchTerm('');
              }}
              className={`w-full text-left p-2 rounded-xl border transition-all flex items-center gap-3 group ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                {product.image ? (
                  <img src={product.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="w-full h-full p-1.5 text-zinc-400" />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="font-bold text-xs truncate uppercase">{product.name}</h4>
                <p className="text-[10px] text-blue-600 font-black">{product.price}</p>
              </div>
              {isSelected && <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />}
            </button>
          );
        })
      ) : (
        <div className="text-center py-4 text-zinc-500 text-xs">
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  </div>
);

export default ProductSelector;

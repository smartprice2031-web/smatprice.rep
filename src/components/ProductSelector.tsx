import React, { useState, useEffect, useMemo } from 'react';
import { useStore, Product } from '../store';
import { Search, Package, Check, X, RefreshCw } from 'lucide-react';

const ProductSelector: React.FC<{ onSelect?: (product: Product) => void }> = ({ onSelect }) => {
  const { 
    products, fetchProducts, selectProduct, 
    textElements1, textElements2, textElements3, 
    productImage3, setElement,
    layouts, activeLayoutIndex,
    optionalText1, optionalText2, optionalText3, setOptionalText
  } = useStore();

  const currentLayoutName = layouts[activeLayoutIndex]?.name || '';
  const isIdosoLayout = currentLayoutName === 'DIA DO IDOSO PL (PI)';

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
    return products.filter(p => {
      const nameMatch = (p.name || '').toLowerCase().includes(lowerTerm);
      const categoryMatch = (p.category || '').toLowerCase().includes(lowerTerm);
      const descriptionMatch = (p.description || '').toLowerCase().includes(lowerTerm);
      
      return nameMatch || categoryMatch || descriptionMatch;
    });
  };

  const filteredProducts1 = useMemo(() => filterProducts(searchTerm1), [searchTerm1, products]);
  const filteredProducts2 = useMemo(() => filterProducts(searchTerm2), [searchTerm2, products]);
  const filteredProducts3 = useMemo(() => filterProducts(searchTerm3), [searchTerm3, products]);
  const generalFilteredProducts = useMemo(() => filterProducts(generalSearchTerm), [generalSearchTerm, products]);

  if (onSelect) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black dark:text-white opacity-40 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar produto pelo nome..."
            className="w-full pl-10 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl text-sm text-black dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
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
                  <Package className="w-full h-full p-2 text-black dark:text-white opacity-40" />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="font-bold text-sm truncate uppercase text-black dark:text-white">{product.name}</h4>
                <p className="text-xs text-emerald-600 font-black">{product.price}</p>
              </div>
            </button>
          ))}
          {generalFilteredProducts.length === 0 && (
            <div className="text-center py-12 text-black dark:text-white opacity-60 text-sm italic">
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
        optionalText={optionalText1}
        setOptionalText={(updates) => setOptionalText(1, updates)}
        showOptionalText={activeLayoutIndex === 11 || activeLayoutIndex === 12}
        isIdosoLayout={isIdosoLayout}
        layouts={layouts}
        activeLayoutIndex={activeLayoutIndex}
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
        optionalText={optionalText2}
        setOptionalText={(updates) => setOptionalText(2, updates)}
        showOptionalText={activeLayoutIndex === 11 || activeLayoutIndex === 12}
        isIdosoLayout={isIdosoLayout}
        layouts={layouts}
        activeLayoutIndex={activeLayoutIndex}
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
            optionalText={optionalText3}
            setOptionalText={(updates) => setOptionalText(3, updates)}
            showOptionalText={activeLayoutIndex === 12}
            isIdosoLayout={isIdosoLayout}
            layouts={layouts}
            activeLayoutIndex={activeLayoutIndex}
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
  handleSync,
  optionalText,
  setOptionalText,
  showOptionalText,
  isIdosoLayout,
  layouts,
  activeLayoutIndex
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
  handleSync: () => void,
  optionalText?: any,
  setOptionalText?: (updates: any) => void,
  showOptionalText?: boolean,
  isIdosoLayout?: boolean,
  layouts?: any[],
  activeLayoutIndex?: number
}) => {
  const { isSingleProduct, setSingleProduct } = useStore();

  return (
    <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">
          Produto {slot === 1 ? 'Superior' : slot === 2 ? 'Inferior' : 'Central'}
        </h3>
        {slot === 1 ? (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-800">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-tight">Confeccionar apenas um produto</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={isSingleProduct}
                onChange={(e) => setSingleProduct(e.target.checked)}
              />
              <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ) : (
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2 py-1 text-black dark:text-white opacity-60 hover:text-blue-600 transition-colors disabled:opacity-50 text-[10px] font-black uppercase tracking-tighter"
            title="Sincronizar produtos"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Atualizar'}
          </button>
        )}
      </div>

    {/* Optional Text for Modelo 12 and 13 */}
    {showOptionalText && optionalText && setOptionalText && (
      <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/30 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Texto Opcional
          </h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={optionalText.active}
              onChange={(e) => setOptionalText({ active: e.target.checked })}
            />
            <div className="w-7 h-3.5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
          </label>
        </div>
        
        {optionalText.active && (
          <input
            type="text"
            placeholder="Digite o texto opcional..."
            className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-900/30 rounded-lg text-[11px] font-bold focus:ring-2 focus:ring-amber-500 outline-none"
            value={optionalText.text}
            onChange={(e) => setOptionalText({ text: e.target.value })}
          />
        )}
      </div>
    )}

    {/* Manual Info Editing */}
    <div className="grid grid-cols-1 gap-3">
      <div className="space-y-1">
        <label className="text-[10px] font-black text-black dark:text-white opacity-60 uppercase tracking-widest">
          Nome do Produto
        </label>
        <input
          type="text"
          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none text-black dark:text-white"
          value={currentName}
          onChange={(e) => setElement(slot, 'name', { text: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-black dark:text-white opacity-60 uppercase tracking-widest">
          Descrição
        </label>
        <textarea
          rows={2}
          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none text-black dark:text-white"
          value={currentDescription}
          onChange={(e) => setElement(slot, 'description', { text: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-black dark:text-white opacity-60 uppercase tracking-widest">
            {currentPrice.includes('%') ? 'Valor do Desconto' : 'Preço do Produto'}
          </label>
          
          {isIdosoLayout && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-800">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-tight">Ativar Desconto</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={currentPrice.includes('%')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setElement(slot, 'price', { text: '0%', visible: true });
                    } else {
                      setElement(slot, 'price', { text: 'R$ 0,00', visible: true });
                    }
                  }}
                />
                <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder={currentPrice.includes('%') ? "Ex: 15" : "Ex: R$ 9,99"}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-black text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={currentPrice.includes('%') ? currentPrice.replace('%', '') : currentPrice}
            onChange={(e) => {
              const val = e.target.value;
              if (currentPrice.includes('%')) {
                // Ensure it always has the % suffix
                const cleanVal = val.replace('%', '');
                setElement(slot, 'price', { text: cleanVal + '%' });
              } else {
                setElement(slot, 'price', { text: val });
              }
            }}
          />
          {currentPrice.includes('%') && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 font-black text-sm">%</span>
          )}
        </div>
      </div>
    </div>

    {/* Search Input */}
    <div className="space-y-1">
      <label className="text-[10px] font-black text-black dark:text-white opacity-60 uppercase tracking-widest">
        Buscar Produto
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black dark:text-white opacity-40 w-3.5 h-3.5" />
        <input
          type="text"
          placeholder="Digite para pesquisar..."
          className="w-full pl-9 pr-10 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-black dark:text-white opacity-40 hover:opacity-100"
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
                  <Package className="w-full h-full p-1.5 text-black dark:text-white opacity-40" />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="font-bold text-xs truncate uppercase text-black dark:text-white">{product.name}</h4>
                <p className="text-[10px] text-blue-600 font-black">{product.price}</p>
              </div>
              {isSelected && <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />}
            </button>
          );
        })
      ) : (
        <div className="text-center py-4 text-black dark:text-white opacity-60 text-xs">
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  </div>
  );
};

export default ProductSelector;

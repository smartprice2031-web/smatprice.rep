import React from 'react';
import { useStore, TextSettings, createDefaultLayout, Layout as LayoutType } from '../store';
import { Settings, Type, Image as ImageIcon, Layout, Eye, EyeOff, Lock, Unlock, AlignLeft, AlignCenter, AlignRight, Bold } from 'lucide-react';

const Adjustments = () => {
  const { 
    textElements1, textElements2, 
    productImage1, productImage2, 
    background, setElement, setProductImage, setBackground,
    userRole, layouts, setLayoutName
  } = useStore();

  const handleBackgroundUrlChange = (url: string) => {
    setBackground({ url });
  };

  const TextControl = ({ slot, label, elementKey, textElements }: { 
    slot: 1 | 2, 
    label: string, 
    elementKey: keyof typeof textElements1,
    textElements: typeof textElements1
  }) => {
    const el = textElements[elementKey];
    return (
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-xs flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-blue-500" />
            {label}
          </h4>
          <button 
            onClick={() => setElement(slot, elementKey, { visible: !el.visible })}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          >
            {el.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
          </button>
        </div>

        <div className="space-y-2">
          {elementKey === 'description' ? (
            <textarea 
              rows={3}
              value={el.text}
              onChange={(e) => setElement(slot, elementKey, { text: e.target.value })}
              className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-xs resize-none"
            />
          ) : (
            <input 
              type="text" 
              value={el.text}
              onChange={(e) => setElement(slot, elementKey, { text: e.target.value })}
              className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-xs"
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-0.5">Tamanho: {el.fontSize}px</label>
              <input 
                type="range" min="10" max="300" 
                value={el.fontSize}
                onChange={(e) => setElement(slot, elementKey, { fontSize: parseInt(e.target.value) })}
                className="w-full h-1.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-0.5">Cor</label>
              <input 
                type="color" 
                value={el.color}
                onChange={(e) => setElement(slot, elementKey, { color: e.target.value })}
                className="w-full h-6 p-0 border-none bg-transparent cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setElement(slot, elementKey, { isBold: !el.isBold })}
              className={`p-1.5 rounded border ${el.isBold ? 'bg-blue-100 border-blue-300 text-blue-600' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <div className="flex border border-zinc-200 dark:border-zinc-700 rounded overflow-hidden">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => setElement(slot, elementKey, { align })}
                  className={`p-1.5 ${el.align === align ? 'bg-blue-100 text-blue-600' : 'bg-white dark:bg-zinc-900'}`}
                >
                  {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                  {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                  {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleProductImageUrlChange = (slot: 1 | 2, url: string) => {
    setProductImage(slot, { url });
  };

  const ProductImageControl = ({ slot, productImage }: { slot: 1 | 2, productImage: typeof productImage1 }) => (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
          Imagem do Produto {slot === 1 ? 'Superior' : 'Inferior'}
        </span>
        <div className="flex gap-2">
          <button 
            onClick={() => setProductImage(slot, { visible: !productImage.visible })}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          >
            {productImage.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
          </button>
          <button 
            onClick={() => setProductImage(slot, { locked: !productImage.locked })}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          >
            {productImage.locked ? <Lock className="w-3.5 h-3.5 text-blue-600" /> : <Unlock className="w-3.5 h-3.5 text-zinc-400" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">URL da Imagem</label>
          <input 
            type="url" 
            placeholder="https://exemplo.com/imagem.jpg"
            value={productImage.url || ''}
            onChange={(e) => handleProductImageUrlChange(slot, e.target.value)}
            className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 block mb-0.5">Opacidade: {Math.round(productImage.opacity * 100)}%</label>
          <input 
            type="range" min="0" max="1" step="0.1" 
            value={productImage.opacity}
            onChange={(e) => setProductImage(slot, { opacity: parseFloat(e.target.value) })}
            className="w-full h-1.5"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 block mb-0.5">Rotação: {productImage.rotation}°</label>
          <input 
            type="range" min="0" max="360" 
            value={productImage.rotation}
            onChange={(e) => setProductImage(slot, { rotation: parseInt(e.target.value) })}
            className="w-full h-1.5"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 pb-20">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="w-6 h-6 text-blue-600" />
        Ajustes e Estilos
      </h2>

      {/* Admin: Rename Layouts */}
      {userRole === 'admin' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Nomes dos Modelos
            </h3>
            <button 
              onClick={() => {
                if (confirm('Deseja resetar todos os modelos para o padrão? Isso apagará as customizações de nomes e posições.')) {
                  useStore.setState((state) => ({
                    layouts: [
                      createDefaultLayout('Modelo 1'),
                      createDefaultLayout('Modelo 2'),
                      createDefaultLayout('Modelo 3'),
                      createDefaultLayout('Modelo 4'),
                      createDefaultLayout('Modelo 5'),
                      createDefaultLayout('Modelo 6'),
                      createDefaultLayout('Modelo 7'),
                      createDefaultLayout('Modelo 8'),
                      createDefaultLayout('Modelo 9'),
                      createDefaultLayout('Modelo 10'),
                      createDefaultLayout('Padrão Ultra'),
                    ]
                  }));
                  useStore.getState().saveLayout();
                }
              }}
              className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest"
            >
              Resetar Modelos
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {layouts.map((layout, index) => (
              <div key={index} className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 ml-1">Modelo {index + 1}</label>
                <input 
                  type="text"
                  value={layout.name}
                  onChange={(e) => setLayoutName(index, e.target.value)}
                  className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Background Section */}
      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Layout className="w-4 h-4" />
          Fundo Geral
        </h3>
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-grow">
              <label className="block text-xs font-medium mb-1">URL da Imagem de Fundo (A4)</label>
              <input 
                type="url" 
                placeholder="https://exemplo.com/fundo.jpg"
                value={background.url || ''}
                onChange={(e) => handleBackgroundUrlChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button 
                onClick={() => setBackground({ mode: 'cover' })}
                className={`px-3 py-1 text-xs rounded-full border ${background.mode === 'cover' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-900'}`}
              >
                Cover
              </button>
              <button 
                onClick={() => setBackground({ mode: 'contain' })}
                className={`px-3 py-1 text-xs rounded-full border ${background.mode === 'contain' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-900'}`}
              >
                Contain
              </button>
            </div>
            <button 
              onClick={() => setBackground({ locked: !background.locked })}
              className={`p-2 rounded ${background.locked ? 'text-blue-600' : 'text-zinc-400'}`}
            >
              {background.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      {/* Product 1 Section */}
      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
          Produto Superior
        </h3>
        <div className="space-y-4">
          <ProductImageControl slot={1} productImage={productImage1} />
          <TextControl slot={1} label="Nome" elementKey="name" textElements={textElements1} />
          <TextControl slot={1} label="Subtítulo" elementKey="subtitle" textElements={textElements1} />
          <TextControl slot={1} label="Descrição" elementKey="description" textElements={textElements1} />
          <TextControl slot={1} label="Preço" elementKey="price" textElements={textElements1} />
        </div>
      </section>

      <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

      {/* Product 2 Section */}
      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
          Produto Inferior
        </h3>
        <div className="space-y-4">
          <ProductImageControl slot={2} productImage={productImage2} />
          <TextControl slot={2} label="Nome" elementKey="name" textElements={textElements2} />
          <TextControl slot={2} label="Subtítulo" elementKey="subtitle" textElements={textElements2} />
          <TextControl slot={2} label="Descrição" elementKey="description" textElements={textElements2} />
          <TextControl slot={2} label="Preço" elementKey="price" textElements={textElements2} />
        </div>
      </section>
    </div>
  );
};

export default Adjustments;

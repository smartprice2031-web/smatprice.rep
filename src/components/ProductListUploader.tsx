import React, { useState, useEffect } from 'react';
import { useStore, Product } from '../store';
import { 
  Search, ArrowLeft, Plus, Trash2, 
  LayoutGrid, Package, CheckCircle2, 
  AlertCircle, Loader2, Play, FileText,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export default function ProductListUploader() {
  const { 
    setView, layouts, activeLayoutIndex, setActiveLayout, 
    userRole, currentUser, allowedStores,
    selectProduct, setElement, addToQueue, orientation
  } = useStore();

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);

  // Filter layouts based on user permissions (re-implement logic from App.tsx)
  const filteredLayouts = React.useMemo(() => {
    if (!Array.isArray(layouts)) return [];
    
    let baseLayouts = layouts.map((l, i) => ({ ...l, originalIndex: i }));

    if (userRole !== 'admin') {
      const normalizedUserCnpj = currentUser?.cnpj?.replace(/[^\d]/g, '') || '';
      const store = allowedStores.find(s => s?.cnpj?.replace(/[^\d]/g, '') === normalizedUserCnpj);
      
      if (!store || !store.allowedLayouts || store.allowedLayouts.length === 0) {
        return [];
      }
      
      const allowedIndices = store.allowedLayouts || [];
      baseLayouts = baseLayouts.filter((_, index) => allowedIndices.includes(index));
    }

    return baseLayouts.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [layouts, userRole, currentUser, allowedStores]);

  const parseProductList = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => {
      // Priority: match "NAME PRICE" where price is at the end
      // Price pattern: 0,00 or R$ 0,00
      const priceMatch = line.match(/(?:R\$\s*)?(\d+[,.]\d{2})$/i);
      if (priceMatch) {
        const price = priceMatch[1].replace('.', ',');
        const name = line.replace(priceMatch[0], '').trim();
        return { name, price };
      }
      return { name: line.trim(), price: null };
    });
  };

  const processList = async () => {
    const items = parseProductList(inputText);
    if (items.length === 0) {
      toast.error('A lista está vazia!');
      return;
    }

    setIsProcessing(true);
    setTotal(items.length);
    setProgress(0);
    setMissingProducts([]);
    setIsDone(false);

    try {
      // Fetch all products to match
      const { data: dbProducts, error } = await supabase
        .from('products')
        .select('*');

      if (error) throw error;

      // Helper for intelligent search
      const normalize = (str: string) => 
        str.toLowerCase()
           .normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "") // Remove accents
           .replace(/[^\w\s]/gi, ' ')       // Replace special chars with spaces
           .trim();

      const getMatchScore = (productName: string, query: string) => {
        const pNormalized = normalize(productName);
        const qNormalized = normalize(query);
        
        const qTokens = qNormalized.split(/\s+/).filter(t => t.length > 1);
        if (qTokens.length === 0) return 0;

        let matches = 0;
        qTokens.forEach(qt => {
          // Check if the token is present in the product name
          // We use includes to handle things like "aer" matching "aerosol"
          if (pNormalized.includes(qt)) {
            matches++;
          }
        });

        return matches / qTokens.length;
      };

      const missing: string[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Intelligent search: 
        // 1. Try exact match first
        let found = dbProducts.find((p: Product) => 
          p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );

        // 2. If no exact match, try scoring
        if (!found) {
          const scoredProducts = dbProducts
            .map((p: Product) => ({ product: p, score: getMatchScore(p.name, item.name) }))
            .filter(res => res.score >= 0.7) // Threshold: at least 70% of tokens must match
            .sort((a, b) => b.score - a.score);
          
          if (scoredProducts.length > 0) {
            found = scoredProducts[0].product;
          }
        }

        if (found) {
          // 1. Update Layout with product
          // Use slot 1 for simplicity in batch creation
          selectProduct(1, found);
          
          // 2. If a price was provided in the list, override the DB price
          if (item.price) {
            setElement(1, 'price', { text: `R$ ${item.price}` });
          }

          // 3. Wait for image to potentially load and Konva to render
          // This is a bit of a hack since we don't have a direct promise for canvas readiness
          await new Promise(resolve => setTimeout(resolve, 800));

          // 4. Capture Canvas
          const canvasData = (window as any).getCanvasData?.();
          if (canvasData) {
            const isLandscape = orientation === 'landscape';
            
            addToQueue(canvasData, isLandscape);
          }
        } else {
          missing.push(item.name);
        }
        
        setProgress(i + 1);
      }

      setMissingProducts(missing);
      setIsDone(true);
      toast.success('Processamento concluído!');
    } catch (error) {
      console.error('Error processing list:', error);
      toast.error('Erro ao processar lista.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-zinc-50 dark:bg-zinc-950 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('editor')}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-black dark:text-white">Lista de Produtos</h2>
              <p className="text-sm font-medium text-zinc-500">Crie plaquinhas em massa a partir de uma lista de texto</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Layout Selecionado</span>
              <span className="text-sm font-bold text-blue-600 uppercase">{layouts[activeLayoutIndex]?.name}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Step 1: Select Layout */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">1</div>
              <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">Escolha o Modelo</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredLayouts.map((layout) => (
                <button
                  key={layout.originalIndex}
                  onClick={() => setActiveLayout(layout.originalIndex)}
                  className={cn(
                    "relative p-3 rounded-2xl border-2 transition-all text-left space-y-2 group",
                    activeLayoutIndex === layout.originalIndex
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/10"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <LayoutGrid className={cn(
                      "w-4 h-4",
                      activeLayoutIndex === layout.originalIndex ? "text-blue-600" : "text-zinc-400"
                    )} />
                    {activeLayoutIndex === layout.originalIndex && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <span className={cn(
                    "block text-[10px] font-black uppercase tracking-tight leading-tight",
                    activeLayoutIndex === layout.originalIndex ? "text-blue-700 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400"
                  )}>
                    {layout.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Input List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">2</div>
              <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">Lista de Itens</h3>
            </div>
            
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={"Arroz Tio João 5kg 25,90\nFeijão Kicaldo 1kg 8,50\nLeite Ninho 400g"}
                className="w-full h-[400px] p-4 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl focus:border-blue-600 outline-none transition-all font-mono text-sm resize-none custom-scrollbar"
                disabled={isProcessing}
              />
              <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-full pointer-events-none">
                {inputText.split('\n').filter(l => l.trim()).length} Linhas
              </div>
            </div>

            <button
              onClick={processList}
              disabled={isProcessing || !inputText.trim()}
              className={cn(
                "w-full py-4 rounded-2xl font-black uppercase tracking-tight flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl",
                isProcessing || !inputText.trim()
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando... ({progress}/{total})
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Avançar e Gerar Plaquinhas
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results / Missing Products Modal/Overlay */}
        {isDone && missingProducts.length > 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-2xl font-black tracking-tighter uppercase text-black dark:text-white">Produtos Não Encontrados</h3>
                <p className="text-zinc-500 text-sm font-medium">Os seguintes itens não foram localizados no cadastro e não puderam ser gerados:</p>
                
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-4 max-h-[200px] overflow-y-auto custom-scrollbar text-left border border-zinc-100 dark:border-zinc-800">
                  <ul className="space-y-2">
                    {missingProducts.map((name, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs font-bold text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsDone(false)}
                    className="flex-1 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-tight hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Entendido
                  </button>
                  <button 
                    onClick={() => setView('queue')}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-tight hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Ver Fila
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDone && missingProducts.length === 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black tracking-tighter uppercase text-black dark:text-white">Sucesso Total!</h3>
                <p className="text-zinc-500 text-sm font-medium">Todos os produtos foram encontrados e as plaquinhas foram adicionadas à fila de impressão.</p>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsDone(false)}
                    className="flex-1 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-tight hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={() => setView('queue')}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-tight hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Ver Fila
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

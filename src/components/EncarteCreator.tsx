import React, { useState, useRef } from 'react';
import { useStore, Product } from '../store';
import { 
  Plus, 
  Trash2, 
  Printer, 
  ArrowLeft, 
  ShoppingBag,
  Package,
  X,
  Settings2,
  Layout as LayoutIcon,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileDown,
  Image as ImageIcon2,
  MoveUp,
  MoveDown,
  MoveLeft,
  MoveRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ProductSelector from './ProductSelector';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EncarteModel {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  bgClass: string;
  borderClass: string;
  fontFamily?: string;
}

const ENCARTE_MODELS: EncarteModel[] = [
  { id: 'classic', name: 'Clássico Esmeralda', primaryColor: '#059669', secondaryColor: '#10b981', accentColor: '#059669', textColor: '#065f46', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-600' },
  { id: 'modern-blue', name: 'Moderno Azul', primaryColor: '#2563eb', secondaryColor: '#3b82f6', accentColor: '#1d4ed8', textColor: '#1e3a8a', bgClass: 'bg-blue-600', borderClass: 'border-blue-600' },
  { id: 'golden', name: 'Premium Dourado', primaryColor: '#b45309', secondaryColor: '#d97706', accentColor: '#92400e', textColor: '#78350f', bgClass: 'bg-amber-600', borderClass: 'border-amber-600' },
  { id: 'discount-red', name: 'Oferta Vermelha', primaryColor: '#dc2626', secondaryColor: '#ef4444', accentColor: '#b91c1c', textColor: '#7f1d1d', bgClass: 'bg-red-600', borderClass: 'border-red-600' },
  { id: 'night-purple', name: 'Noite Roxa', primaryColor: '#7c3aed', secondaryColor: '#8b5cf6', accentColor: '#6d28d9', textColor: '#4c1d95', bgClass: 'bg-violet-600', borderClass: 'border-violet-600' },
  { id: 'fresh-orange', name: 'Laranja Fresh', primaryColor: '#ea580c', secondaryColor: '#f97316', accentColor: '#c2410c', textColor: '#7c2d12', bgClass: 'bg-orange-600', borderClass: 'border-orange-600' },
  { id: 'minimal-gray', name: 'Minimalista Cinza', primaryColor: '#4b5563', secondaryColor: '#6b7280', accentColor: '#374151', textColor: '#111827', bgClass: 'bg-zinc-600', borderClass: 'border-zinc-600' },
  { id: 'eco-green', name: 'Eco Verde', primaryColor: '#16a34a', secondaryColor: '#22c55e', accentColor: '#15803d', textColor: '#14532d', bgClass: 'bg-green-600', borderClass: 'border-green-600' },
  { id: 'beauty-pink', name: 'Beleza Rosa', primaryColor: '#db2777', secondaryColor: '#ec4899', accentColor: '#be185d', textColor: '#831843', bgClass: 'bg-pink-600', borderClass: 'border-pink-600' },
  { id: 'cyber-neon', name: 'Cyber Neon', primaryColor: '#000000', secondaryColor: '#00ff00', accentColor: '#00ff00', textColor: '#00ff00', bgClass: 'bg-black', borderClass: 'border-green-500' },
];

interface SelectedProduct extends Product {
  id: string;
  subtitle?: string;
  offsetX?: number;
  offsetY?: number;
}

interface EncarteSlot {
  name: string;
  frontBgUrl: string;
  backBgUrl: string;
  frontProducts: (SelectedProduct | null)[];
  backProducts: (SelectedProduct | null)[];
}

export default function EncarteCreator() {
  const { setView } = useStore();
  const [encartes, setEncartes] = useState<EncarteSlot[]>(
    Array(10).fill(null).map((_, i) => ({
      name: `Modelo ${i + 1}`,
      frontBgUrl: '',
      backBgUrl: '',
      frontProducts: Array(12).fill(null),
      backProducts: Array(12).fill(null),
    }))
  );
  const [activeEncarteIndex, setActiveEncarteIndex] = useState(0);
  const [currentSide, setCurrentSide] = useState<'frente' | 'verso'>('frente');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'adjustments'>('products');
  const [selectedModel, setSelectedModel] = useState<EncarteModel>(ENCARTE_MODELS[3]);
  const [isExporting, setIsExporting] = useState(false);

  const currentEncarte = encartes[activeEncarteIndex];
  const currentProducts = currentSide === 'frente' ? currentEncarte.frontProducts : currentEncarte.backProducts;

  const updateActiveEncarte = (updates: Partial<EncarteSlot>) => {
    const newEncartes = [...encartes];
    newEncartes[activeEncarteIndex] = { ...newEncartes[activeEncarteIndex], ...updates };
    setEncartes(newEncartes);
  };

  const handleAddProduct = (product: Product) => {
    if (activeSlot === null) return;
    
    const newProducts = [...currentProducts];
    newProducts[activeSlot] = { 
      ...product, 
      id: Math.random().toString(36).substr(2, 9),
      subtitle: product.description || '',
      offsetX: 0,
      offsetY: 0
    };

    if (currentSide === 'frente') {
      updateActiveEncarte({ frontProducts: newProducts });
    } else {
      updateActiveEncarte({ backProducts: newProducts });
    }

    setIsSelectorOpen(false);
    setActiveSlot(null);
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = [...currentProducts];
    newProducts[index] = null;
    if (currentSide === 'frente') {
      updateActiveEncarte({ frontProducts: newProducts });
    } else {
      updateActiveEncarte({ backProducts: newProducts });
    }
  };

  const handleUpdateProduct = (index: number, field: keyof SelectedProduct, value: any) => {
    const newProducts = [...currentProducts];
    const product = newProducts[index];
    if (product) {
      newProducts[index] = { ...product, [field]: value };
      if (currentSide === 'frente') {
        updateActiveEncarte({ frontProducts: newProducts });
      } else {
        updateActiveEncarte({ backProducts: newProducts });
      }
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down' | 'left' | 'right') => {
    const product = currentProducts[index];
    if (!product) return;

    const step = 2;
    let newX = product.offsetX || 0;
    let newY = product.offsetY || 0;

    if (direction === 'up') newY -= step;
    if (direction === 'down') newY += step;
    if (direction === 'left') newX -= step;
    if (direction === 'right') newX += step;

    handleUpdateProduct(index, 'offsetX', newX);
    handleUpdateProduct(index, 'offsetY', newY);
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      const frente = document.getElementById('print-frente');
      const verso = document.getElementById('print-verso');

      if (frente) {
        const canvas = await html2canvas(frente, { scale: 2, useCORS: true });
        const link = document.createElement('a');
        link.download = `encarte-${currentEncarte.name}-frente-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }

      if (verso) {
        const canvas = await html2canvas(verso, { scale: 2, useCORS: true });
        const link = document.createElement('a');
        link.download = `encarte-${currentEncarte.name}-verso-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (error) {
      console.error('Erro ao exportar PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const frente = document.getElementById('print-frente');
      const verso = document.getElementById('print-verso');
      const pdf = new jsPDF('p', 'mm', 'a4');

      if (frente) {
        const canvas = await html2canvas(frente, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      if (verso) {
        pdf.addPage();
        const canvas = await html2canvas(verso, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      pdf.save(`encarte-${currentEncarte.name}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openSelector = (index: number) => {
    setActiveSlot(index);
    setIsSelectorOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col no-print">
      {/* Header */}
      <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('editor')}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg", selectedModel.bgClass)}>
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase">Encarte Online</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <button
              onClick={() => setCurrentSide('frente')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                currentSide === 'frente' 
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" 
                  : "text-zinc-500"
              )}
            >
              Frente
            </button>
            <button
              onClick={() => setCurrentSide('verso')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                currentSide === 'verso' 
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" 
                  : "text-zinc-500"
              )}
            >
              Verso
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportPNG}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-tighter shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Exportar PNG"
            >
              <ImageIcon2 className="w-4 h-4" />
              PNG
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-tighter shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Exportar PDF"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl transition-all text-xs font-black uppercase tracking-tighter shadow-lg hover:scale-105 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow p-8 flex gap-8 overflow-hidden">
        {/* Controls */}
        <div className="w-96 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Tabs */}
          <div className="flex p-1 bg-zinc-200 dark:bg-zinc-800 rounded-2xl">
            <button
              onClick={() => setActiveTab('products')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'products' 
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" 
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Package className="w-4 h-4" />
              Produtos
            </button>
            <button
              onClick={() => setActiveTab('adjustments')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'adjustments' 
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" 
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <Settings2 className="w-4 h-4" />
              Ajustes
            </button>
          </div>

          {activeTab === 'products' ? (
            <>
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Modelos de Encarte</h3>
                
                <div className="grid grid-cols-5 gap-2">
                  {encartes.map((encarte, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveEncarteIndex(index)}
                      className={cn(
                        "py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2",
                        activeEncarteIndex === index
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg scale-105"
                          : "bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      )}
                      title={encarte.name}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] font-bold text-zinc-400 uppercase text-center">
                  Editando: <span className="text-zinc-900 dark:text-white">{currentEncarte.name}</span>
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex-grow overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Produtos ({currentSide})</h3>
                  <button 
                    onClick={() => {
                      if (currentSide === 'frente') {
                        updateActiveEncarte({ frontProducts: Array(12).fill(null) });
                      } else {
                        updateActiveEncarte({ backProducts: Array(12).fill(null) });
                      }
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                  >
                    Limpar Lado
                  </button>
                </div>
                
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                  {currentProducts.map((product, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Posição {index + 1}</span>
                        {product && (
                          <button 
                            onClick={() => handleRemoveProduct(index)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      
                      {product ? (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-100 dark:border-zinc-700 flex-shrink-0">
                              {product.image ? (
                                <img src={product.image} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                              ) : (
                                <Package className="w-6 h-6 text-zinc-400" />
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <input 
                                type="text"
                                value={product.name}
                                onChange={(e) => handleUpdateProduct(index, 'name', e.target.value)}
                                className="w-full bg-transparent text-xs font-black uppercase tracking-tighter outline-none border-b border-transparent focus:border-emerald-500"
                              />
                              <input 
                                type="text"
                                value={product.subtitle || ''}
                                onChange={(e) => handleUpdateProduct(index, 'subtitle', e.target.value)}
                                className="w-full bg-transparent text-[10px] font-bold text-zinc-500 outline-none border-b border-transparent focus:border-emerald-500"
                                placeholder="Subdescrição..."
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-zinc-400 uppercase">Preço:</span>
                              <input 
                                type="text"
                                value={product.price}
                                onChange={(e) => handleUpdateProduct(index, 'price', e.target.value)}
                                className="w-24 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg text-xs font-black text-emerald-600 outline-none border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500"
                              />
                            </div>

                            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                              <button onClick={() => handleMove(index, 'left')} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded shadow-sm transition-all"><MoveLeft className="w-3 h-3" /></button>
                              <div className="flex flex-col gap-1">
                                <button onClick={() => handleMove(index, 'up')} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded shadow-sm transition-all"><MoveUp className="w-3 h-3" /></button>
                                <button onClick={() => handleMove(index, 'down')} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded shadow-sm transition-all"><MoveDown className="w-3 h-3" /></button>
                              </div>
                              <button onClick={() => handleMove(index, 'right')} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded shadow-sm transition-all"><MoveRight className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => openSelector(index)}
                          className="w-full py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all flex flex-col items-center gap-1"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Adicionar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Model Settings */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Ajustes do Modelo {activeEncarteIndex + 1}</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome do Modelo</label>
                    <input 
                      type="text"
                      value={currentEncarte.name}
                      onChange={(e) => updateActiveEncarte({ name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Background Images */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Imagens de Fundo</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Fundo Frente (A4)</label>
                    <input 
                      type="text"
                      placeholder="URL da imagem..."
                      value={currentEncarte.frontBgUrl}
                      onChange={(e) => updateActiveEncarte({ frontBgUrl: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Fundo Verso (A4)</label>
                    <input 
                      type="text"
                      placeholder="URL da imagem..."
                      value={currentEncarte.backBgUrl}
                      onChange={(e) => updateActiveEncarte({ backBgUrl: e.target.value })}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Models Selection */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <LayoutIcon className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Modelos de Encarte</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ENCARTE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className={cn(
                        "p-3 rounded-2xl border-2 transition-all text-left group",
                        selectedModel.id === model.id
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                          : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className={cn("w-full h-12 rounded-lg mb-2 shadow-inner", model.bgClass)} />
                      <p className={cn(
                        "text-[9px] font-black uppercase tracking-tighter leading-tight",
                        selectedModel.id === model.id ? "text-emerald-600" : "text-zinc-500"
                      )}>
                        {model.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-grow bg-zinc-200 dark:bg-zinc-900 rounded-[2.5rem] p-12 overflow-y-auto flex flex-col items-center gap-12">
          {/* A4 Page - Current Side */}
          <div 
            className="w-[210mm] h-[297mm] bg-white shadow-2xl p-[10mm] flex flex-col print:shadow-none print:p-0 relative overflow-hidden flex-shrink-0" 
            id="encarte-page"
          >
            {/* Background Image Layer */}
            {(currentSide === 'frente' ? currentEncarte.frontBgUrl : currentEncarte.backBgUrl) && (
              <div className="absolute inset-0 z-0">
                <img 
                  src={currentSide === 'frente' ? currentEncarte.frontBgUrl : currentEncarte.backBgUrl} 
                  alt="Background" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className={cn("border-[2px] p-4 flex-grow flex flex-col relative z-10", selectedModel.borderClass)}>
              {/* Products Grid - 3x4 */}
              <div className="grid grid-cols-3 grid-rows-4 gap-4 flex-grow content-start pt-8">
                {currentProducts.map((product, index) => (
                  <div 
                    key={index} 
                    className="p-2 rounded-xl flex flex-col relative overflow-hidden bg-white/95 backdrop-blur-sm min-h-0"
                    style={{ 
                      transform: product ? `translate(${product.offsetX || 0}px, ${product.offsetY || 0}px)` : 'none'
                    }}
                  >
                    {product ? (
                      <>
                        <div className="mb-0.5">
                          <h4 className="text-[10px] font-black tracking-tight leading-[1.1] uppercase text-zinc-900 line-clamp-2">
                            {product.name}
                          </h4>
                          <p className="text-[8px] font-bold text-zinc-800 uppercase leading-none mt-0 truncate">
                            {product.subtitle}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-auto">
                          {/* Price Box */}
                          <div className="bg-red-600 text-white p-1.5 flex flex-col items-center justify-center min-w-[55px] rounded-sm relative">
                            <div className="absolute top-0.5 left-1 flex flex-col items-start leading-none">
                              <span className="text-[5px] font-black uppercase">POR</span>
                              <span className="text-[7px] font-black">R$</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter leading-none ml-2">
                              {product.price}
                            </span>
                            <span className="absolute bottom-0.5 right-1 text-[5px] font-black uppercase">UNI</span>
                          </div>
                          
                          {/* Product Image */}
                          <div className="flex-grow h-16 flex items-center justify-center">
                            {product.image ? (
                              <img src={product.image} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <Package className="w-8 h-8 text-zinc-200" />
                            )}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hidden Print Pages */}
          <div className="hidden print:block">
            {/* Page 1 - Frente */}
            <div className="w-[210mm] h-[297mm] bg-white p-[10mm] flex flex-col relative overflow-hidden" id="print-frente">
               {currentEncarte.frontBgUrl && (
                <div className="absolute inset-0 z-0">
                  <img src={currentEncarte.frontBgUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className={cn("p-4 flex-grow flex flex-col relative z-10", selectedModel.borderClass)}>
                <div className="grid grid-cols-3 grid-rows-4 gap-4 flex-grow content-start pt-8">
                  {currentEncarte.frontProducts.map((product, index) => (
                    <div 
                      key={index} 
                      className="p-2 rounded-xl flex flex-col relative overflow-hidden bg-white/95 backdrop-blur-sm min-h-0"
                      style={{ 
                        transform: product ? `translate(${product.offsetX || 0}px, ${product.offsetY || 0}px)` : 'none'
                      }}
                    >
                      {product && (
                        <>
                          <div className="mb-0.5">
                            <h4 className="text-[10px] font-black tracking-tight leading-[1.1] uppercase text-zinc-900 line-clamp-2">{product.name}</h4>
                            <p className="text-[8px] font-bold text-zinc-800 uppercase leading-none mt-0 truncate">{product.subtitle}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-auto">
                            <div className="bg-red-600 text-white p-1.5 flex flex-col items-center justify-center min-w-[55px] rounded-sm relative">
                              <div className="absolute top-0.5 left-1 flex flex-col items-start leading-none">
                                <span className="text-[5px] font-black uppercase">POR</span>
                                <span className="text-[7px] font-black">R$</span>
                              </div>
                              <span className="text-2xl font-black tracking-tighter leading-none ml-2">{product.price}</span>
                              <span className="absolute bottom-0.5 right-1 text-[5px] font-black uppercase">UNI</span>
                            </div>
                            <div className="flex-grow h-16 flex items-center justify-center">
                              {product.image && <img src={product.image} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Page 2 - Verso */}
            <div className="w-[210mm] h-[297mm] bg-white p-[10mm] flex flex-col relative overflow-hidden break-before-page" id="print-verso">
               {currentEncarte.backBgUrl && (
                <div className="absolute inset-0 z-0">
                  <img src={currentEncarte.backBgUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className={cn("p-4 flex-grow flex flex-col relative z-10", selectedModel.borderClass)}>
                <div className="grid grid-cols-3 grid-rows-4 gap-4 flex-grow content-start pt-8">
                  {currentEncarte.backProducts.map((product, index) => (
                    <div 
                      key={index} 
                      className="p-2 rounded-xl flex flex-col relative overflow-hidden bg-white/95 backdrop-blur-sm min-h-0"
                      style={{ 
                        transform: product ? `translate(${product.offsetX || 0}px, ${product.offsetY || 0}px)` : 'none'
                      }}
                    >
                      {product && (
                        <>
                          <div className="mb-0.5">
                            <h4 className="text-[10px] font-black tracking-tight leading-[1.1] uppercase text-zinc-900 line-clamp-2">{product.name}</h4>
                            <p className="text-[8px] font-bold text-zinc-800 uppercase leading-none mt-0 truncate">{product.subtitle}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-auto">
                            <div className="bg-red-600 text-white p-1.5 flex flex-col items-center justify-center min-w-[55px] rounded-sm relative">
                              <div className="absolute top-0.5 left-1 flex flex-col items-start leading-none">
                                <span className="text-[5px] font-black uppercase">POR</span>
                                <span className="text-[7px] font-black">R$</span>
                              </div>
                              <span className="text-2xl font-black tracking-tighter leading-none ml-2">{product.price}</span>
                              <span className="absolute bottom-0.5 right-1 text-[5px] font-black uppercase">UNI</span>
                            </div>
                            <div className="flex-grow h-16 flex items-center justify-center">
                              {product.image && <img src={product.image} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Product Selector Modal */}
      {isSelectorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Package className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black tracking-tighter uppercase">Selecionar Produto</h3>
              </div>
              <button 
                onClick={() => setIsSelectorOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6">
              <ProductSelector onSelect={handleAddProduct} />
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-frente, #print-frente *, #print-verso, #print-verso * {
            visibility: visible;
          }
          #print-frente {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
          }
          #print-verso {
            position: absolute;
            left: 0;
            top: 297mm;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 0;
          }
          .break-before-page {
            page-break-before: always;
          }
        }
      `}} />
    </div>
  );
}

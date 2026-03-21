import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import CanvasPreview from './components/CanvasPreview';
import ProductManager from './components/ProductManager';
import ProductSelector from './components/ProductSelector';
import Adjustments from './components/Adjustments';
import PrintQueue from './components/PrintQueue';
import UserManagement from './components/UserManagement';
import SupportChat from './components/SupportChat';
import Login from './components/Login';
import EncarteCreator from './components/EncarteCreator';
import { 
  Printer, FileDown, 
  LayoutDashboard, Package, Settings as SettingsIcon,
  ShoppingBag, Search, Database, X, ListPlus, LayoutGrid,
  ArrowLeft, LogOut, Users, MessageCircle, AlertTriangle,
  RefreshCw, Layout
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster } from 'sonner';
import { useSupportSocket } from './hooks/useSupportSocket';
import { isSupabaseConfigured } from './lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { toast } from 'sonner';

export default function App() {
  const { 
    theme, toggleTheme, textElements1, 
    isProductModalOpen, setProductModalOpen, 
    loadLayout, setPrinting, setSelectedId,
    currentView, setView, addToQueue, printQueue, isPrinting,
    isAuthenticated, logout, userRole, isUserModalOpen, setUserModalOpen,
    isSupportChatOpen, setSupportChatOpen, unreadSupportCount,
    activeLayoutIndex, layouts, setActiveLayout,
    currentUser, allowedStores, lastLoginTimestamp,
    saveUsersAndFlags, loadUsersAndFlags
  } = useStore();
  const [activeTab, setActiveTab] = useState<'select' | 'adjustments'>('select');

  // Filter layouts based on user permissions
  const filteredLayouts = React.useMemo(() => {
    if (userRole === 'admin') return layouts.map((l, i) => ({ ...l, originalIndex: i }));
    
    // Normalize CNPJ for comparison
    const normalizedUserCnpj = currentUser?.cnpj.replace(/[^\d]/g, '');
    const store = allowedStores.find(s => s.cnpj.replace(/[^\d]/g, '') === normalizedUserCnpj);
    
    // If no store found or allowedLayouts is undefined/empty, show NOTHING (Total Control)
    if (!store || !store.allowedLayouts || store.allowedLayouts.length === 0) {
      return [];
    }
    
    // Filter by index
    return layouts
      .map((l, i) => ({ ...l, originalIndex: i }))
      .filter((_, index) => store.allowedLayouts?.includes(index));
  }, [layouts, userRole, currentUser, allowedStores]);

  // Map filtered index back to original index for setActiveLayout
  const handleLayoutSelect = (originalIndex: number) => {
    if (originalIndex !== -1) {
      setActiveLayout(originalIndex);
    }
  };

  // Ensure activeLayoutIndex points to an allowed layout
  React.useEffect(() => {
    if (filteredLayouts.length > 0) {
      const isAllowed = filteredLayouts.some(l => l.originalIndex === activeLayoutIndex);
      
      if (!isAllowed) {
        handleLayoutSelect(filteredLayouts[0].originalIndex);
      }
    }
  }, [filteredLayouts, activeLayoutIndex]);

  // Initialize support socket globally for background notifications
  useSupportSocket();

  useEffect(() => {
    if (userRole !== 'admin' && activeTab === 'adjustments') {
      setActiveTab('select');
    }
  }, [userRole, activeTab]);

  useEffect(() => {
    // Force logout on fresh access (new tab/window)
    const sessionActive = sessionStorage.getItem('smartprice_session_active');
    if (!sessionActive) {
      logout();
      sessionStorage.setItem('smartprice_session_active', 'true');
    }

    if (isAuthenticated && lastLoginTimestamp) {
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      
      const checkSession = () => {
        const now = Date.now();
        if (now - lastLoginTimestamp > SIX_HOURS) {
          logout();
        }
      };

      // Check on mount
      checkSession();

      // Check every minute
      const interval = setInterval(checkSession, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, lastLoginTimestamp, logout]);

  useEffect(() => {
    loadLayout();
    loadUsersAndFlags();

    const handleBeforePrint = () => setPrinting(true);
    const handleAfterPrint = () => setPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const styleId = 'landscape-print-style';
    if (activeLayoutIndex === 10) {
      document.body.classList.add('landscape-mode');
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `@media print { @page { size: A4 landscape !important; margin: 0 !important; } }`;
        document.head.appendChild(style);
      }
    } else {
      document.body.classList.remove('landscape-mode');
      const style = document.getElementById(styleId);
      if (style) style.remove();
    }
  }, [activeLayoutIndex]);

  useEffect(() => {
    if (isPrinting) {
      document.body.classList.add('is-printing');
    } else {
      document.body.classList.remove('is-printing');
    }
  }, [isPrinting]);

  const handlePrint = () => {
    setSelectedId(null);
    setPrinting(true);
    // Automatically trigger print dialog like Ctrl+P
    setTimeout(() => {
      window.print();
      // Keep printing state for a bit so user can see it
    }, 500);
  };

  const confirmPrint = () => {
    window.print();
    setTimeout(() => setPrinting(false), 500);
  };

  const handleDownloadPDF = async () => {
    const canvasData = (window as any).getCanvasData?.();
    if (!canvasData) return;

    const toastId = toast.loading('Gerando PDF...');

    try {
      const pdf = new jsPDF({
        orientation: activeLayoutIndex === 10 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(canvasData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Using JPEG for better performance and smaller file size
      pdf.addImage(canvasData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      const fileName = `smartprice_placa_${textElements1.name.text.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      pdf.save(fileName);
      toast.success('PDF baixado com sucesso!', { id: toastId });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.', { id: toastId });
    }
  };

  const handleAddToQueue = () => {
    setSelectedId(null);
    const toastId = toast.loading('Adicionando à fila...');
    
    // Small timeout to allow Konva to re-render without the transformer
    setTimeout(() => {
      try {
        const canvasData = (window as any).getCanvasData?.();
        if (!canvasData) {
          toast.error('Erro ao capturar imagem.', { id: toastId });
          return;
        }
        addToQueue(canvasData, activeLayoutIndex === 10);
        toast.success('Adicionado à fila com sucesso!', { id: toastId });
      } catch (error) {
        console.error('Erro ao adicionar à fila:', error);
        toast.error('Erro ao adicionar à fila.', { id: toastId });
      }
    }, 100);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  if (currentView === 'queue') {
    return <PrintQueue />;
  }

  if (currentView === 'encarte') {
    return <EncarteCreator />;
  }

  return (
    <div className={cn(
      "min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col",
      isPrinting && "bg-white p-0 m-0 overflow-visible"
    )}>
      {/* Dedicated Print Area for Single Tag */}
      {isPrinting && currentView === 'editor' && (
        <div className="hidden print:block">
          <CanvasPreview id="placa" />
        </div>
      )}

      {isPrinting && (
        <div className="fixed inset-0 bg-zinc-100 dark:bg-zinc-950 z-[9999999] overflow-y-auto no-scrollbar no-print">
          <div className="sticky top-0 z-[10000] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setPrinting(false)}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black tracking-tighter uppercase">Pré-visualização de Impressão</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Plaquinha Individual A4</span>
              <button 
                onClick={confirmPrint}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-black uppercase tracking-tighter shadow-lg hover:bg-blue-700 transition-all"
              >
                <Printer className="w-4 h-4" />
                Confirmar Impressão
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center py-12 px-4 no-print">
            <div className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] w-[210mm] h-[297mm] flex items-center justify-center overflow-hidden border border-zinc-200">
              <CanvasPreview id="placa-preview" />
            </div>
          </div>
        </div>
      )}
      {/* Supabase Config Warning */}
      {!isSupabaseConfigured && !isPrinting && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider no-print">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span>Supabase não configurado! Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do seu domínio.</span>
          <button 
            onClick={() => window.open('https://app.supabase.com', '_blank')}
            className="ml-4 px-3 py-1 bg-white text-amber-600 rounded-md hover:bg-amber-50 transition-colors"
          >
            Configurar Agora
          </button>
        </div>
      )}

      {/* Header */}
      {!isPrinting && (
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-6 sticky top-0 z-40 no-print">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tighter">
              SMART<span className="text-blue-600">PRICE</span>
            </h1>
            
            {/* User Info Badge */}
            <div className="hidden lg:flex flex-col items-start ml-4 pl-4 border-l border-zinc-200 dark:border-zinc-800">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Acesso Identificado</span>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none">{currentUser?.username}</span>
                  <span className="text-[10px] text-zinc-500 font-medium leading-none mt-1">{currentUser?.bandeira}</span>
                </div>
                <div className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">{currentUser?.cnpj}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button 
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all text-sm font-bold"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all text-sm font-bold"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>
              <button 
                onClick={handleAddToQueue}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md shadow-md hover:scale-105 transition-all text-sm font-bold"
                title="Adicionar à Fila Silenciosamente"
              >
                <ListPlus className="w-4 h-4" />
                Fila
              </button>
              <button 
                onClick={() => setView('queue')}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md shadow-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all text-sm font-bold"
              >
                <LayoutGrid className="w-4 h-4" />
                Ir para a Fila
                {printQueue.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {printQueue.length}
                  </span>
                )}
              </button>
            </div>

            {/* Encarte Online Button */}
            {(userRole === 'admin' || allowedStores.find(s => s.cnpj.replace(/[^\d]/g, '') === currentUser?.cnpj.replace(/[^\d]/g, ''))?.hasEncarteAccess) && (
              <button 
                onClick={() => setView('encarte')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-tighter shadow-lg hover:scale-105 active:scale-95",
                  (currentView as string) === 'encarte'
                    ? "bg-emerald-600 text-white"
                    : "bg-white dark:bg-zinc-800 text-emerald-600 border border-emerald-600/20"
                )}
              >
                <Layout className="w-4 h-4" />
                Encarte Online
              </button>
            )}

            <div className="h-6 w-px bg-zinc-200 dark:border-zinc-800 mx-2" />
            
            {userRole === 'admin' && (
              <button 
                onClick={() => setProductModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl transition-all text-xs font-black uppercase tracking-tighter shadow-lg hover:scale-105 active:scale-95"
              >
                <Database className="w-4 h-4" />
                Gerenciador de Produtos
              </button>
            )}

            {userRole === 'admin' && (
              <button 
                onClick={() => setUserModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl transition-all text-xs font-black uppercase tracking-tighter shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95"
              >
                <Users className="w-4 h-4" />
                Gerenciar Usuários
              </button>
            )}

            <button 
              onClick={() => setSupportChatOpen(true)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-tighter shadow-lg hover:scale-105 active:scale-95",
                userRole === 'admin' 
                  ? "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900" 
                  : "bg-blue-600 text-white"
              )}
              title={userRole === 'admin' ? "Central de Suporte" : "Enviar mensagem para o suporte (adicionar produto que está faltando)"}
            >
              <MessageCircle className="w-4 h-4" />
              {userRole === 'admin' ? "Central de Suporte" : "Suporte"}
              {unreadSupportCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-white dark:border-zinc-900">
                  {unreadSupportCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => {
                toast.info('O app agora está configurado para usar o Supabase (PostgreSQL na nuvem). Certifique-se de criar as tabelas "products" e "settings" no seu painel do Supabase.');
              }}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
              title="Info sobre Supabase"
            >
              <Database className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all text-zinc-600 dark:text-zinc-400 text-xs font-black uppercase tracking-tighter"
                title="Atualizar Página (F5)"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
              
              {userRole === 'admin' && (
                <button 
                  onClick={async () => {
                    try {
                      await saveUsersAndFlags();
                      toast.success('Modificações enviadas com sucesso!');
                    } catch (error) {
                      toast.error('Erro ao enviar modificações.');
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-all text-[9px] font-black uppercase tracking-tighter shadow-sm"
                  title="Enviar modificações para a base de dados"
                >
                  <Database className="w-3 h-3" />
                  ENVIAR MOD
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-zinc-200 dark:border-zinc-800 mx-2" />

            <button 
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all text-xs font-black uppercase tracking-tighter"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn("flex-grow flex overflow-hidden", isPrinting && "overflow-visible")}>
        {/* Left: Preview */}
        <div className={cn(
          "flex-grow relative border-r border-zinc-200 dark:border-zinc-800 print-area overflow-hidden",
          isPrinting && "overflow-visible"
        )}>
          {userRole === 'user' && filteredLayouts.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 z-50 p-8 text-center">
              <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Acesso Restrito</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                    Sua conta ainda não possui modelos de etiquetas liberados pelo administrador para o CNPJ <span className="font-mono font-bold text-blue-600">{currentUser?.cnpj}</span>.
                  </p>
                  <div className="pt-2 flex flex-col items-center gap-1">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Contatos Administrativos:</p>
                    <p className="text-xs font-bold text-blue-600">(99) 9 8470-1752 • (99) 9 8199-0035</p>
                  </div>
                </div>
                <div className="pt-4">
                  <button 
                    onClick={() => setSupportChatOpen(true)}
                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-tighter shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Contatar Suporte
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <CanvasPreview />
          )}
        </div>

        {/* Right: Editor Panel */}
        {!isPrinting && (
          <aside className="w-[400px] flex-shrink-0 bg-white dark:bg-zinc-900 flex flex-col no-print">
            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
              <button 
                onClick={() => setActiveTab('select')}
                className={cn(
                  "flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all",
                  activeTab === 'select' 
                    ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10" 
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Search className="w-4 h-4" />
                SELECIONAR
              </button>
              {userRole === 'admin' && (
                <button 
                  onClick={() => setActiveTab('adjustments')}
                  className={cn(
                    "flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all",
                    activeTab === 'adjustments' 
                      ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10" 
                      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  <SettingsIcon className="w-4 h-4" />
                  AJUSTES
                </button>
              )}
            </div>

            {/* Layout Switcher Buttons */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
              <div className="grid grid-cols-4 gap-1.5">
                {filteredLayouts.map((layout) => {
                  return (
                    <button
                      key={`${layout.name}-${layout.originalIndex}`}
                      onClick={() => handleLayoutSelect(layout.originalIndex)}
                      className={cn(
                        "py-2 px-0.5 text-[8px] font-black uppercase tracking-tighter rounded-lg border transition-all truncate",
                        activeLayoutIndex === layout.originalIndex
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
                      )}
                      title={layout.name}
                    >
                      {layout.name.replace('Modelo ', '')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-grow overflow-y-auto">
              {activeTab === 'select' ? <ProductSelector /> : <Adjustments />}
            </div>

            {/* Footer Info */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 text-center uppercase tracking-widest font-bold">
              SmartPrice v1.1 • Pronto para Impressão A4
            </div>
          </aside>
        )}
      </main>

      {/* Product Management Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Gerenciar Estoque</h3>
                  <p className="text-xs text-zinc-500">Cadastre e edite seus produtos para as plaquinhas</p>
                </div>
              </div>
              <button 
                onClick={() => setProductModalOpen(false)} 
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto">
              <ProductManager />
            </div>
          </div>
        </div>
      )}
      {/* User Management Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Gerenciar Usuários</h3>
                  <p className="text-xs text-zinc-500">Controle quais CNPJs podem acessar o sistema</p>
                </div>
              </div>
              <button 
                onClick={() => setUserModalOpen(false)} 
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto">
              <UserManagement />
            </div>
          </div>
        </div>
      )}
      <SupportChat />
      
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

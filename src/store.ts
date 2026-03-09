import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from './lib/supabase';

export interface TextSettings {
  text: string;
  fontSize: number;
  color: string;
  isBold: boolean;
  x: number;
  y: number;
  width: number;
  align: 'left' | 'center' | 'right';
  visible: boolean;
}

export interface ImageSettings {
  url: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface Product {
  id?: string | number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  category: string;
}

export interface Layout {
  name: string;
  background: {
    url: string | null;
    mode: 'cover' | 'contain';
    locked: boolean;
  };
  productImage1: ImageSettings;
  productImage2: ImageSettings;
  textElements1: {
    name: TextSettings;
    description: TextSettings;
    subtitle: TextSettings;
    price: TextSettings;
  };
  textElements2: {
    name: TextSettings;
    description: TextSettings;
    subtitle: TextSettings;
    price: TextSettings;
  };
}

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Tag Settings
  background: {
    url: string | null;
    mode: 'cover' | 'contain';
    locked: boolean;
  };
  
  productImage1: ImageSettings;
  productImage2: ImageSettings;
  
  textElements1: {
    name: TextSettings;
    description: TextSettings;
    subtitle: TextSettings;
    price: TextSettings;
  };
  textElements2: {
    name: TextSettings;
    description: TextSettings;
    subtitle: TextSettings;
    price: TextSettings;
  };

  activeLayoutIndex: number;
  layouts: Layout[];
  setActiveLayout: (index: number) => void;
  setLayoutName: (index: number, name: string) => void;

  setElement: (slot: 1 | 2, key: keyof AppState['textElements1'], settings: Partial<TextSettings>) => void;
  setProductImage: (slot: 1 | 2, settings: Partial<ImageSettings>) => void;
  setBackground: (settings: Partial<AppState['background']>) => void;
  
  // Products
  products: Product[];
  isProductModalOpen: boolean;
  setProductModalOpen: (open: boolean) => void;
  isUserModalOpen: boolean;
  setUserModalOpen: (open: boolean) => void;
  fetchProducts: () => Promise<void>;
  selectProduct: (slot: 1 | 2, product: Product) => void;
  
  // Persistence
  saveLayout: () => Promise<void>;
  saveLayoutDebounced: () => void;
  loadLayout: () => Promise<void>;

  zoom: number;
  setZoom: (zoom: number) => void;

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isPrinting: boolean;
  setPrinting: (isPrinting: boolean) => void;

  printQueue: string[];
  addToQueue: (imageData: string) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  currentView: 'editor' | 'queue';
  setView: (view: 'editor' | 'queue') => void;
  realtimeInitialized: boolean;
  
  // Auth
  flags: string[];
  addFlag: (flag: string) => void;
  removeFlag: (flag: string) => void;
  updateFlag: (oldFlag: string, newFlag: string) => void;
  allowedStores: { cnpj: string; bandeira: string }[];
  addAllowedStore: (store: { cnpj: string; bandeira: string }) => void;
  removeAllowedStore: (cnpj: string) => void;
  accessLogs: { cnpj: string; username: string; bandeira: string; timestamp: string }[];
  addAccessLog: (log: { cnpj: string; username: string; bandeira: string }) => void;
  isAuthenticated: boolean;
  userRole: 'user' | 'admin' | null;
  currentUser: { username: string; cnpj: string; bandeira: string } | null;
  isSupportChatOpen: boolean;
  setSupportChatOpen: (open: boolean) => void;
  unreadSupportCount: number;
  setUnreadSupportCount: (count: number | ((prev: number) => number)) => void;
  selectedUserCnpj: string | null;
  setSelectedUserCnpj: (cnpj: string | null) => void;
  unreadPerUser: Record<string, number>;
  setUnreadPerUser: (cnpj: string, count: number | ((prev: number) => number)) => void;
  messages: any[];
  setMessages: (messages: any[] | ((prev: any[]) => any[])) => void;
  
  // GitHub Sync
  isSyncingGithub: boolean;
  syncProgress: number;
  syncWithGithub: () => Promise<void>;

  login: (role: 'user' | 'admin', user: { username: string; cnpj: string; bandeira: string }) => void;
  logout: () => void;
}

let saveTimeout: NodeJS.Timeout | null = null;

const DEFAULT_TEXT = {
  fontSize: 40,
  color: '#000000',
  isBold: true,
  x: 50,
  y: 50,
  width: 700,
  align: 'center' as const,
  visible: true,
};

export const createDefaultLayout = (name: string): Layout => ({
  name,
  background: {
    url: null,
    mode: 'cover',
    locked: false,
  },
  productImage1: {
    url: null,
    x: 50,
    y: 150,
    width: 250,
    height: 250,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  },
  productImage2: {
    url: null,
    x: 50,
    y: 650,
    width: 250,
    height: 250,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  },
  textElements1: {
    name: { ...DEFAULT_TEXT, text: 'PRODUTO 1', y: 100, fontSize: 50 },
    description: { ...DEFAULT_TEXT, text: 'Descrição do produto 1.', y: 180, fontSize: 25, isBold: false },
    subtitle: { ...DEFAULT_TEXT, text: 'OFERTA ESPECIAL', y: 140, fontSize: 20 },
    price: { ...DEFAULT_TEXT, text: 'R$ 0,00', y: 400, fontSize: 100, color: '#e11d48' },
  },
  textElements2: {
    name: { ...DEFAULT_TEXT, text: 'PRODUTO 2', y: 600, fontSize: 50 },
    description: { ...DEFAULT_TEXT, text: 'Descrição do produto 2.', y: 680, fontSize: 25, isBold: false },
    subtitle: { ...DEFAULT_TEXT, text: 'OFERTA ESPECIAL', y: 640, fontSize: 20 },
    price: { ...DEFAULT_TEXT, text: 'R$ 0,00', y: 900, fontSize: 100, color: '#e11d48' },
  },
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      activeLayoutIndex: 0,
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
      ],

      background: {
        url: null,
        mode: 'cover',
        locked: false,
      },

      productImage1: {
        url: null,
        x: 50,
        y: 150,
        width: 250,
        height: 250,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
      },
      productImage2: {
        url: null,
        x: 50,
        y: 650,
        width: 250,
        height: 250,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
      },

      textElements1: {
        name: { ...DEFAULT_TEXT, text: 'PRODUTO 1', y: 100, fontSize: 50 },
        description: { ...DEFAULT_TEXT, text: 'Descrição do produto 1.', y: 180, fontSize: 25, isBold: false },
        subtitle: { ...DEFAULT_TEXT, text: 'OFERTA ESPECIAL', y: 140, fontSize: 20 },
        price: { ...DEFAULT_TEXT, text: 'R$ 0,00', y: 400, fontSize: 100, color: '#e11d48' },
      },
      textElements2: {
        name: { ...DEFAULT_TEXT, text: 'PRODUTO 2', y: 600, fontSize: 50 },
        description: { ...DEFAULT_TEXT, text: 'Descrição do produto 2.', y: 680, fontSize: 25, isBold: false },
        subtitle: { ...DEFAULT_TEXT, text: 'OFERTA ESPECIAL', y: 640, fontSize: 20 },
        price: { ...DEFAULT_TEXT, text: 'R$ 0,00', y: 900, fontSize: 100, color: '#e11d48' },
      },

      setActiveLayout: (index) => {
        const state = get();
        const currentLayout: Layout = {
          name: state.layouts[state.activeLayoutIndex].name,
          background: state.background,
          productImage1: state.productImage1,
          productImage2: state.productImage2,
          textElements1: state.textElements1,
          textElements2: state.textElements2,
        };

        const newLayouts = [...state.layouts];
        newLayouts[state.activeLayoutIndex] = currentLayout;

        const nextLayout = newLayouts[index];
        set({
          activeLayoutIndex: index,
          layouts: newLayouts,
          background: nextLayout.background,
          productImage1: nextLayout.productImage1,
          productImage2: nextLayout.productImage2,
          textElements1: nextLayout.textElements1,
          textElements2: nextLayout.textElements2,
        });
        get().saveLayout();
      },

      setLayoutName: (index, name) => {
        set((state) => {
          const newLayouts = [...state.layouts];
          newLayouts[index] = { ...newLayouts[index], name };
          return { layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      setElement: (slot, key, settings) => {
        const elementKey = slot === 1 ? 'textElements1' : 'textElements2';
        set((state) => ({
          [elementKey]: {
            ...state[elementKey],
            [key]: { ...state[elementKey][key], ...settings }
          }
        } as any));
        get().saveLayoutDebounced();
      },

      setProductImage: (slot, settings) => {
        const imageKey = slot === 1 ? 'productImage1' : 'productImage2';
        set((state) => ({
          [imageKey]: { ...state[imageKey], ...settings }
        } as any));
        get().saveLayoutDebounced();
      },

      setBackground: (settings) => {
        set((state) => ({
          background: { ...state.background, ...settings }
        }));
        get().saveLayoutDebounced();
      },

      products: [],
      isProductModalOpen: false,
      setProductModalOpen: (open) => set({ isProductModalOpen: open }),
      isUserModalOpen: false,
      setUserModalOpen: (open) => set({ isUserModalOpen: open }),
      fetchProducts: async () => {
        if (!isSupabaseConfigured) {
          console.warn("Supabase not configured. Skipping fetch.");
          return;
        }
        try {
          // Fetching with a high limit to ensure "all" products are loaded
          // We only select the necessary fields to avoid timeout if images are large
          const { data, error } = await supabase
            .from('products')
            .select('id, name, description, price, image, category')
            .order('name', { ascending: true })
            .limit(10000);
          
          if (error) throw error;
          set({ products: data as Product[] });

          // Set up realtime subscription if not already active
          if (!get().realtimeInitialized) {
            const channel = supabase.channel('products-realtime');
            channel
              .on(
                'postgres_changes' as any, 
                { event: '*', table: 'products', schema: 'public' }, 
                async () => {
                  const { data: updatedData } = await supabase
                    .from('products')
                    .select('id, name, description, price, image, category')
                    .order('name', { ascending: true })
                    .limit(10000);
                  if (updatedData) set({ products: updatedData as Product[] });
                }
              )
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  set({ realtimeInitialized: true });
                }
              });
          }

        } catch (error) {
          console.error("Error fetching products from Supabase:", error);
        }
      },

      selectProduct: (slot, product) => {
        const elementKey = slot === 1 ? 'textElements1' : 'textElements2';
        const imageKey = slot === 1 ? 'productImage1' : 'productImage2';
        set((state) => ({
          [elementKey]: {
            ...state[elementKey],
            name: { ...state[elementKey].name, text: product.name },
            description: { ...state[elementKey].description, text: product.description },
            price: { ...state[elementKey].price, text: product.price },
          },
          [imageKey]: { ...state[imageKey], url: product.image }
        } as any));
        get().saveLayout();
      },

      saveLayoutDebounced: () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          get().saveLayout();
        }, 1000);
      },

      saveLayout: async () => {
        if (!isSupabaseConfigured) return;
        const state = get();
        const layout = {
          background: state.background,
          productImage1: state.productImage1,
          productImage2: state.productImage2,
          textElements1: state.textElements1,
          textElements2: state.textElements2,
          activeLayoutIndex: state.activeLayoutIndex,
          layouts: state.layouts,
          updated_at: new Date().toISOString()
        };
        try {
          const { error } = await supabase
            .from('settings')
            .upsert({ id: 'current_layout', value: layout });
          
          if (error) throw error;
        } catch (error) {
          console.error("Error saving layout to Supabase:", error);
        }
      },

      loadLayout: async () => {
        if (!isSupabaseConfigured) return;
        try {
          const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('id', 'current_layout')
            .single();
          
          if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
          
          if (data?.value) {
            const layout = data.value;
            const currentState = get();
            
            // Ensure we have at least 11 layouts if the user wants them
            let loadedLayouts = layout.layouts || currentState.layouts;
            if (loadedLayouts.length < 11) {
              const defaults = [
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
              ];
              // Merge: keep existing ones, add missing ones from defaults
              const merged = [...loadedLayouts];
              for (let i = merged.length; i < 11; i++) {
                merged.push(defaults[i]);
              }
              loadedLayouts = merged;
            }

            set({
              background: layout.background || currentState.background,
              productImage1: layout.productImage1 || currentState.productImage1,
              productImage2: layout.productImage2 || currentState.productImage2,
              textElements1: layout.textElements1 || currentState.textElements1,
              textElements2: layout.textElements2 || currentState.textElements2,
              activeLayoutIndex: layout.activeLayoutIndex !== undefined ? layout.activeLayoutIndex : currentState.activeLayoutIndex,
              layouts: loadedLayouts,
            } as any);
          }
        } catch (error) {
          console.error("Error loading layout from Supabase:", error);
        }
      },

      zoom: 1,
      setZoom: (zoom) => set({ zoom }),

      selectedId: null,
      setSelectedId: (id) => set({ selectedId: id }),
      isPrinting: false,
      setPrinting: (isPrinting) => set({ isPrinting }),

      printQueue: [],
      addToQueue: (imageData) => set((state) => ({ 
        printQueue: [...state.printQueue, imageData]
      })),
      removeFromQueue: (index) => set((state) => ({
        printQueue: state.printQueue.filter((_, i) => i !== index)
      })),
      clearQueue: () => set({ printQueue: [] }),
      currentView: 'editor',
      setView: (view) => set({ currentView: view }),
      realtimeInitialized: false,
      
      flags: ['Ultra Popular', 'Maxi Popular', 'Entrefarma', 'Farmanorte', 'Outra'],
      addFlag: (flag) => set((state) => ({ 
        flags: state.flags.includes(flag) ? state.flags : [...state.flags, flag] 
      })),
      removeFlag: (flag) => set((state) => ({ 
        flags: state.flags.filter(f => f !== flag) 
      })),
      updateFlag: (oldFlag, newFlag) => set((state) => ({
        flags: state.flags.map(f => f === oldFlag ? newFlag : f)
      })),

      allowedStores: [],
      addAllowedStore: (store) => set((state) => ({ 
        allowedStores: [...state.allowedStores.filter(s => s.cnpj !== store.cnpj), store] 
      })),
      removeAllowedStore: (cnpj) => set((state) => ({ 
        allowedStores: state.allowedStores.filter(s => s.cnpj !== cnpj) 
      })),

      accessLogs: [],
      addAccessLog: (log) => set((state) => ({
        accessLogs: [{ ...log, timestamp: new Date().toISOString() }, ...state.accessLogs].slice(0, 100)
      })),

      isAuthenticated: false,
      userRole: null,
      currentUser: null,
      isSupportChatOpen: false,
      setSupportChatOpen: (open) => set({ isSupportChatOpen: open }),
      unreadSupportCount: 0,
      setUnreadSupportCount: (count) => set((state) => ({ 
        unreadSupportCount: typeof count === 'function' ? count(state.unreadSupportCount) : count 
      })),
      selectedUserCnpj: null,
      setSelectedUserCnpj: (cnpj) => set({ selectedUserCnpj: cnpj }),
      unreadPerUser: {},
      setUnreadPerUser: (cnpj, count) => set((state) => {
        const currentCount = state.unreadPerUser[cnpj] || 0;
        const newCount = typeof count === 'function' ? count(currentCount) : count;
        return {
          unreadPerUser: { ...state.unreadPerUser, [cnpj]: newCount }
        };
      }),
      messages: [],
      setMessages: (messages) => set((state) => ({ 
        messages: typeof messages === 'function' ? messages(state.messages) : messages 
      })),

      isSyncingGithub: false,
      syncProgress: 0,
      syncWithGithub: async () => {
        set({ isSyncingGithub: true, syncProgress: 0 });
        
        // Simulate progress
        for (let i = 0; i <= 100; i += 10) {
          set({ syncProgress: i });
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // In a real app, we would push to GitHub here
        // For now, we'll just simulate success
        set({ isSyncingGithub: false, syncProgress: 0 });
      },

      login: (role, user) => set({ isAuthenticated: true, userRole: role, currentUser: user }),
      logout: () => set({ isAuthenticated: false, userRole: null, currentUser: null }),
    }),
    {
      name: 'smartprice-storage',
      partialize: (state) => ({
        theme: state.theme,
        background: state.background,
        productImage1: state.productImage1,
        productImage2: state.productImage2,
        textElements1: state.textElements1,
        textElements2: state.textElements2,
        activeLayoutIndex: state.activeLayoutIndex,
        layouts: state.layouts,
        zoom: state.zoom,
        allowedStores: state.allowedStores,
        accessLogs: state.accessLogs,
        flags: state.flags,
      }),
    }
  )
);

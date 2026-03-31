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
  bandeira?: string;
  localidade?: string;
  sortOrder?: number;
  background: {
    url: string | null;
    mode: 'cover' | 'contain';
    locked: boolean;
  };
  productImage1: ImageSettings;
  productImage2: ImageSettings;
  productImage3: ImageSettings;
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
  textElements3: {
    name: TextSettings;
    description: TextSettings;
    subtitle: TextSettings;
    price: TextSettings;
  };
  hasThirdProduct?: boolean;
  optionalText1?: {
    text: string;
    active: boolean;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };
  optionalText2?: {
    text: string;
    active: boolean;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };
  optionalText3?: {
    text: string;
    active: boolean;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };
}

export interface UserGroup {
  id: string;
  name: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetType: 'all' | 'group' | 'cnpj';
  targetValue?: string;
  createdAt: string;
}

export type View = 'editor' | 'queue' | 'encarte';

export interface SelectedProduct extends Product {
  id: string;
  subtitle?: string;
  offsetX?: number;
  offsetY?: number;
  textOffsetX?: number;
  textOffsetY?: number;
  displayType?: 'price' | 'discount';
  discountValue?: string;
  priceColor?: string;
  textColor?: string;
  width?: number;
  height?: number;
  bgColor?: string;
  showBg?: boolean;
}

export interface EncarteSlot {
  name: string;
  date?: string;
  dateOffsetX?: number;
  dateOffsetY?: number;
  frontBgUrl: string;
  backBgUrl: string;
  frontProducts: (SelectedProduct | null)[];
  backProducts: (SelectedProduct | null)[];
  productCount: number;
  bubbleShape?: 'rounded' | 'square' | 'circle' | 'pill' | 'burst' | 'badge' | 'diamond' | 'hexagon' | 'star' | 'oval';
  extraProducts?: (SelectedProduct | null)[];
}

export interface EncarteModel {
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
  productImage3: ImageSettings;
  
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
  textElements3: {
    name: TextSettings;
    description: TextSettings;
    subtitle: TextSettings;
    price: TextSettings;
  };
  
  optionalText1: {
    text: string;
    active: boolean;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };
  optionalText2: {
    text: string;
    active: boolean;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };
  optionalText3: {
    text: string;
    active: boolean;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };

  activeLayoutIndex: number;
  layouts: Layout[];
  setActiveLayout: (index: number) => void;
  setLayoutName: (index: number, name: string) => void;
  setLayoutBandeira: (index: number, bandeira: string) => void;
  setLayoutLocalidade: (index: number, localidade: string) => void;
  reorderLayouts: (fromIndex: number, toIndex: number) => void;
  setLayoutHasThirdProduct: (index: number, hasThirdProduct: boolean) => void;

  setElement: (slot: 1 | 2 | 3, key: keyof AppState['textElements1'], settings: Partial<TextSettings>) => void;
  setProductImage: (slot: 1 | 2 | 3, settings: Partial<ImageSettings>) => void;
  setBackground: (settings: Partial<AppState['background']>) => void;
  
  // Products
  products: Product[];
  isProductModalOpen: boolean;
  setProductModalOpen: (open: boolean) => void;
  isUserModalOpen: boolean;
  setUserModalOpen: (open: boolean) => void;
  fetchProducts: () => Promise<void>;
  selectProduct: (slot: 1 | 2 | 3, product: Product) => void;
  
  // Persistence
  saveLayout: () => Promise<void>;
  saveLayoutDebounced: () => void;
  loadLayout: () => Promise<void>;

  zoom: number;
  setZoom: (zoom: number) => void;

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setOptionalText: (slot: 1 | 2 | 3, updates: Partial<AppState['optionalText1']>) => void;
  isPrinting: boolean;
  setPrinting: (isPrinting: boolean) => void;
  isSingleProduct: boolean;
  setSingleProduct: (isSingleProduct: boolean) => void;

  printQueue: { imageData: string; isLandscape: boolean }[];
  addToQueue: (imageData: string, isLandscape: boolean) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  currentView: View;
  setView: (view: View) => void;
  realtimeInitialized: boolean;
  settingsRealtimeInitialized: boolean;
  lastUpdateTimestamp: string | null;
  
  // Auth
  flags: string[];
  addFlag: (flag: string) => void;
  removeFlag: (flag: string) => void;
  updateFlag: (oldFlag: string, newFlag: string) => void;
  
  // User Groups
  userGroups: UserGroup[];
  addUserGroup: (name: string) => void;
  removeUserGroup: (id: string) => void;
  updateUserGroup: (id: string, name: string) => void;
  setUserGroup: (cnpj: string, groupId: string | undefined) => void;

  allowedStores: { cnpj: string; bandeira: string; allowedLayouts?: number[]; hasEncarteAccess?: boolean; groupId?: string }[];
  addAllowedStore: (store: { cnpj: string; bandeira: string; allowedLayouts?: number[]; hasEncarteAccess?: boolean; groupId?: string }) => void;
  removeAllowedStore: (cnpj: string) => void;
  saveUsersAndFlags: () => Promise<void>;
  saveUsersAndFlagsDebounced: () => void;
  loadUsersAndFlags: () => Promise<void>;
  isAuthenticated: boolean;
  lastLoginTimestamp: number | null;
  userRole: 'user' | 'admin' | null;
  currentUser: { username: string; cnpj: string; bandeira: string } | null;
  isSupportChatOpen: boolean;
  setSupportChatOpen: (open: boolean) => void;
  isChatConnected: boolean;
  setIsChatConnected: (connected: boolean) => void;
  unreadSupportCount: number;
  setUnreadSupportCount: (count: number | ((prev: number) => number)) => void;
  selectedUserCnpj: string | null;
  setSelectedUserCnpj: (cnpj: string | null) => void;
  unreadPerUser: Record<string, number>;
  setUnreadPerUser: (cnpj: string, count: number | ((prev: number) => number)) => void;
  messages: any[];
  setMessages: (messages: any[] | ((prev: any[]) => any[])) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  conversations: any[];
  setConversations: (conversations: any[]) => void;
  isChatLoading: boolean;
  setIsChatLoading: (loading: boolean) => void;
  
  // Announcements
  announcements: Announcement[];
  setAnnouncements: (announcements: Announcement[]) => void;
  addAnnouncement: (announcement: Announcement) => void;
  deleteAnnouncement: (id: string) => void;
  isAnnouncementModalOpen: boolean;
  setAnnouncementModalOpen: (open: boolean) => void;
  seenAnnouncements: string[];
  setSeenAnnouncements: (ids: string[]) => void;

  // Encarte Online
  encartes: EncarteSlot[];
  setEncartes: (encartes: EncarteSlot[]) => void;
  selectedEncarteModel: EncarteModel | null;
  setSelectedEncarteModel: (model: EncarteModel) => void;

  login: (role: 'user' | 'admin', user: { username: string; cnpj: string; bandeira: string }) => void;
  logout: () => void;
  setSlotVisibility: (slot: 1 | 2 | 3, visible: boolean) => void;
  toggleEncarteAccess: (cnpj: string) => void;
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

export const THREE_PRODUCT_LAYOUTS = [
  'MARONBA',
  'QUARTA FRALDA PL',
  'SABADÃO PL',
  'QUI KIDS PL',
  'DERMO PL',
  'OFERTA 3',
  'COMBO 3',
  'MODELO 14',
  'MODELO 15',
  'MODELO 16',
  'MODELO 17',
  'MODELO 18',
  'MODELO 19',
  'MODELO 20',
  'PADRÃO ULTRA'
];

export const isThreeProduct = (name: string, index?: number) => {
  const upperName = name.toUpperCase();
  return THREE_PRODUCT_LAYOUTS.includes(upperName) || 
         upperName.includes(' 3') || 
         (index !== undefined && THREE_PRODUCT_LAYOUTS.includes(`MODELO ${index + 1}`));
};

export const createDefaultLayout = (name: string, index?: number): Layout => {
  const showThird = isThreeProduct(name, index);

  return {
    name,
    sortOrder: index ?? 0,
    hasThirdProduct: showThird,
    background: {
      url: null,
      mode: 'cover',
      locked: false,
    },
    productImage1: {
      url: null,
      x: 50,
      y: showThird ? 120 : 150,
      width: showThird ? 200 : 250,
      height: showThird ? 200 : 250,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
    },
    productImage2: {
      url: null,
      x: 50,
      y: showThird ? 780 : 650,
      width: showThird ? 200 : 250,
      height: showThird ? 200 : 250,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
    },
    productImage3: {
      url: null,
      x: 50,
      y: 450,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 1,
      visible: showThird,
      locked: false,
    },
    textElements1: {
      name: { ...DEFAULT_TEXT, text: 'PRODUTO SUPERIOR', y: showThird ? 50 : 100, fontSize: showThird ? 40 : 50 },
      description: { ...DEFAULT_TEXT, text: 'Descrição do produto.', y: showThird ? 100 : 180, fontSize: 20, isBold: false },
      subtitle: { ...DEFAULT_TEXT, text: 'OFERTA', y: showThird ? 80 : 140, fontSize: 15 },
      price: { ...DEFAULT_TEXT, text: 'R$ 0,00', y: showThird ? 300 : 400, fontSize: showThird ? 80 : 100, color: '#e11d48' },
    },
    textElements2: {
      name: { ...DEFAULT_TEXT, text: 'PRODUTO INFERIOR', y: showThird ? 710 : 600, fontSize: showThird ? 40 : 50 },
      description: { ...DEFAULT_TEXT, text: 'Descrição do produto.', y: showThird ? 760 : 680, fontSize: 20, isBold: false },
      subtitle: { ...DEFAULT_TEXT, text: 'OFERTA', y: showThird ? 740 : 640, fontSize: 15 },
      price: { ...DEFAULT_TEXT, text: 'R$ 0,00', y: showThird ? 960 : 900, fontSize: showThird ? 80 : 100, color: '#e11d48' },
    },
    textElements3: {
      name: { ...DEFAULT_TEXT, text: 'PRODUTO CENTRAL', y: 380, fontSize: 40, visible: showThird },
      description: { ...DEFAULT_TEXT, text: 'Descrição do produto.', y: 430, fontSize: 20, isBold: false, visible: showThird },
      subtitle: { ...DEFAULT_TEXT, text: 'OFERTA', y: 410, fontSize: 15, visible: showThird },
      price: { ...DEFAULT_TEXT, text: 'R$ 0,00', y: 630, fontSize: 80, color: '#e11d48', visible: showThird },
    },
    optionalText1: {
      text: '',
      active: false,
      x: 50,
      y: 50,
      fontSize: 30,
      color: '#000000'
    },
    optionalText2: {
      text: '',
      active: false,
      x: 50,
      y: 350,
      fontSize: 30,
      color: '#000000'
    },
    optionalText3: {
      text: '',
      active: false,
      x: 50,
      y: 650,
      fontSize: 30,
      color: '#000000'
    }
  };
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      activeLayoutIndex: 0,
      optionalText1: {
        text: '',
        active: false,
        x: 50,
        y: 50,
        fontSize: 30,
        color: '#000000'
      },
      optionalText2: {
        text: '',
        active: false,
        x: 50,
        y: 350,
        fontSize: 30,
        color: '#000000'
      },
      optionalText3: {
        text: '',
        active: false,
        x: 50,
        y: 650,
        fontSize: 30,
        color: '#000000'
      },
      layouts: [
        createDefaultLayout('QUARTA FRALDA PL', 0),
        createDefaultLayout('SABADÃO PL', 1),
        createDefaultLayout('QUI KIDS PL', 2),
        createDefaultLayout('DERMO PL', 3),
        createDefaultLayout('MARONBA', 4),
        createDefaultLayout('Modelo 6', 5),
        createDefaultLayout('Modelo 7', 6),
        createDefaultLayout('Modelo 8', 7),
        createDefaultLayout('Modelo 9', 8),
        createDefaultLayout('Modelo 10', 9),
        createDefaultLayout('Modelo 11', 10),
        createDefaultLayout('Modelo 12', 11),
        createDefaultLayout('Modelo 13', 12),
        createDefaultLayout('Modelo 14', 13),
        createDefaultLayout('Modelo 15', 14),
        createDefaultLayout('Modelo 16', 15),
        createDefaultLayout('Modelo 17', 16),
        createDefaultLayout('Modelo 18', 17),
        createDefaultLayout('Modelo 19', 18),
        createDefaultLayout('Modelo 20', 19),
        createDefaultLayout('Padrão Ultra', 20),
        createDefaultLayout('Modelo 22', 21),
        createDefaultLayout('Modelo 23', 22),
        createDefaultLayout('Modelo 24', 23),
        createDefaultLayout('Modelo 25', 24),
        createDefaultLayout('Modelo 26', 25),
        createDefaultLayout('Modelo 27', 26),
        createDefaultLayout('Modelo 28', 27),
        createDefaultLayout('Modelo 29', 28),
        createDefaultLayout('Modelo 30', 29),
        createDefaultLayout('Modelo 31', 30),
        createDefaultLayout('Modelo 32', 31),
        createDefaultLayout('Modelo 33', 32),
        createDefaultLayout('Modelo 34', 33),
        createDefaultLayout('Modelo 35', 34),
        createDefaultLayout('Modelo 36', 35),
        createDefaultLayout('Modelo 37', 36),
        createDefaultLayout('Modelo 38', 37),
        createDefaultLayout('Modelo 39', 38),
        createDefaultLayout('Modelo 40', 39),
        createDefaultLayout('Modelo 41', 40),
        createDefaultLayout('Modelo 42', 41),
        createDefaultLayout('Modelo 43', 42),
        createDefaultLayout('Modelo 44', 43),
        createDefaultLayout('Modelo 45', 44),
        createDefaultLayout('Modelo 46', 45),
        createDefaultLayout('Modelo 47', 46),
        createDefaultLayout('Modelo 48', 47),
        createDefaultLayout('Modelo 49', 48),
        createDefaultLayout('Modelo 50', 49),
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
      productImage3: {
        url: null,
        x: 50,
        y: 400,
        width: 250,
        height: 250,
        rotation: 0,
        opacity: 1,
        visible: false,
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
      textElements3: {
        name: { ...DEFAULT_TEXT, text: 'PRODUTO 3', y: 350, fontSize: 50, visible: false },
        description: { ...DEFAULT_TEXT, text: 'Descrição do produto 3.', y: 430, fontSize: 25, isBold: false, visible: false },
        subtitle: { ...DEFAULT_TEXT, text: 'OFERTA ESPECIAL', y: 390, fontSize: 20, visible: false },
        price: { ...DEFAULT_TEXT, text: 'R$ 0,00', y: 550, fontSize: 100, color: '#e11d48', visible: false },
      },

      setActiveLayout: (index) => {
        const state = get();
        if (index < 0 || !state.layouts[index]) return;

        // 1. Save current active layout state into the layouts array
        const currentLayout: Layout = {
          ...state.layouts[state.activeLayoutIndex],
          name: state.layouts[state.activeLayoutIndex]?.name || `Modelo ${state.activeLayoutIndex + 1}`,
          background: state.background,
          productImage1: state.productImage1,
          productImage2: state.productImage2,
          productImage3: state.productImage3,
          textElements1: state.textElements1,
          textElements2: state.textElements2,
          textElements3: state.textElements3,
          optionalText1: state.optionalText1,
          optionalText2: state.optionalText2,
          optionalText3: state.optionalText3,
        };

        const newLayouts = [...state.layouts];
        newLayouts[state.activeLayoutIndex] = currentLayout;

        // 2. Prepare the next layout
        const nextLayout = newLayouts[index];
        const defaultNext = createDefaultLayout(nextLayout.name, index);
        
        set({
          activeLayoutIndex: index,
          layouts: newLayouts,
          background: nextLayout.background ? { ...defaultNext.background, ...nextLayout.background } : defaultNext.background,
          productImage1: nextLayout.productImage1 ? { ...defaultNext.productImage1, ...nextLayout.productImage1 } : defaultNext.productImage1,
          productImage2: nextLayout.productImage2 ? { ...defaultNext.productImage2, ...nextLayout.productImage2 } : defaultNext.productImage2,
          productImage3: nextLayout.productImage3 ? { ...defaultNext.productImage3, ...nextLayout.productImage3 } : defaultNext.productImage3,
          textElements1: nextLayout.textElements1 ? { ...defaultNext.textElements1, ...nextLayout.textElements1 } : defaultNext.textElements1,
          textElements2: nextLayout.textElements2 ? { ...defaultNext.textElements2, ...nextLayout.textElements2 } : defaultNext.textElements2,
          textElements3: nextLayout.textElements3 ? { ...defaultNext.textElements3, ...nextLayout.textElements3 } : defaultNext.textElements3,
          optionalText1: nextLayout.optionalText1 ? { ...defaultNext.optionalText1, ...nextLayout.optionalText1 } : defaultNext.optionalText1,
          optionalText2: nextLayout.optionalText2 ? { ...defaultNext.optionalText2, ...nextLayout.optionalText2 } : defaultNext.optionalText2,
          optionalText3: nextLayout.optionalText3 ? { ...defaultNext.optionalText3, ...nextLayout.optionalText3 } : defaultNext.optionalText3,
        });
        get().saveLayout();
      },

      setLayoutName: (index, name) => {
        set((state) => {
          const newLayouts = [...state.layouts];
          const updatedLayout = { 
            ...newLayouts[index], 
            name
          };
          
          newLayouts[index] = updatedLayout;
          
          return { layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      setLayoutBandeira: (index, bandeira) => {
        set((state) => {
          const newLayouts = [...state.layouts];
          newLayouts[index] = { ...newLayouts[index], bandeira };
          return { layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      setLayoutLocalidade: (index, localidade) => {
        set((state) => {
          const newLayouts = [...state.layouts];
          newLayouts[index] = { ...newLayouts[index], localidade };
          return { layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      reorderLayouts: (fromIndex, toIndex) => {
        set((state) => {
          const newLayouts = [...state.layouts];
          const [movedItem] = newLayouts.splice(fromIndex, 1);
          newLayouts.splice(toIndex, 0, movedItem);
          
          // Update sortOrder for all layouts to match their new positions
          const updatedLayouts = newLayouts.map((l, i) => ({ ...l, sortOrder: i }));
          
          // If the active layout was moved, update activeLayoutIndex
          let newActiveIndex = state.activeLayoutIndex;
          if (state.activeLayoutIndex === fromIndex) {
            newActiveIndex = toIndex;
          } else if (fromIndex < state.activeLayoutIndex && toIndex >= state.activeLayoutIndex) {
            newActiveIndex--;
          } else if (fromIndex > state.activeLayoutIndex && toIndex <= state.activeLayoutIndex) {
            newActiveIndex++;
          }

          return { layouts: updatedLayouts, activeLayoutIndex: newActiveIndex };
        });
        get().saveLayoutDebounced();
      },

      setLayoutHasThirdProduct: (index, hasThirdProduct) => {
        set((state) => {
          const newLayouts = [...state.layouts];
          const updatedLayout = { 
            ...newLayouts[index], 
            hasThirdProduct
          };
          
          newLayouts[index] = updatedLayout;
          
          return { layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      setElement: (slot, key, settings) => {
        const elementKey = slot === 1 ? 'textElements1' : slot === 2 ? 'textElements2' : 'textElements3';
        set((state) => {
          const newState = {
            [elementKey]: {
              ...state[elementKey],
              [key]: { ...state[elementKey][key], ...settings }
            }
          } as any;

          const newLayouts = [...state.layouts];
          if (newLayouts[state.activeLayoutIndex]) {
            newLayouts[state.activeLayoutIndex] = {
              ...newLayouts[state.activeLayoutIndex],
              ...newState
            };
          }

          return { ...newState, layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      setOptionalText: (slot, updates) => {
        const key = slot === 1 ? 'optionalText1' : slot === 2 ? 'optionalText2' : 'optionalText3';
        set((state) => {
          const newOptionalText = { ...state[key], ...updates };
          const newLayouts = [...state.layouts];
          if (newLayouts[state.activeLayoutIndex]) {
            newLayouts[state.activeLayoutIndex] = {
              ...newLayouts[state.activeLayoutIndex],
              [key]: newOptionalText
            };
          }
          return { [key]: newOptionalText, layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      setProductImage: (slot, settings) => {
        const imageKey = slot === 1 ? 'productImage1' : slot === 2 ? 'productImage2' : 'productImage3';
        set((state) => {
          const newState = {
            [imageKey]: { ...state[imageKey], ...settings }
          } as any;

          const newLayouts = [...state.layouts];
          if (newLayouts[state.activeLayoutIndex]) {
            newLayouts[state.activeLayoutIndex] = {
              ...newLayouts[state.activeLayoutIndex],
              ...newState
            };
          }

          return { ...newState, layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      setBackground: (settings) => {
        set((state) => {
          const newState = {
            background: { ...state.background, ...settings }
          };

          const newLayouts = [...state.layouts];
          if (newLayouts[state.activeLayoutIndex]) {
            newLayouts[state.activeLayoutIndex] = {
              ...newLayouts[state.activeLayoutIndex],
              ...newState
            };
          }

          return { ...newState, layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      setSlotVisibility: (slot, visible) => {
        const imageKey = slot === 1 ? 'productImage1' : slot === 2 ? 'productImage2' : 'productImage3';
        const textKey = slot === 1 ? 'textElements1' : slot === 2 ? 'textElements2' : 'textElements3';
        
        set((state) => {
          const newState: any = {
            [imageKey]: { ...state[imageKey], visible },
            [textKey]: {
              name: { ...state[textKey].name, visible },
              description: { ...state[textKey].description, visible },
              subtitle: { ...state[textKey].subtitle, visible },
              price: { ...state[textKey].price, visible },
            }
          };

          const newLayouts = [...state.layouts];
          newLayouts[state.activeLayoutIndex] = {
            ...newLayouts[state.activeLayoutIndex],
            [imageKey]: newState[imageKey],
            [textKey]: newState[textKey]
          };

          return { ...newState, layouts: newLayouts };
        });
        get().saveLayoutDebounced();
      },

      products: [],
      isProductModalOpen: false,
      setProductModalOpen: (open) => set({ isProductModalOpen: open }),
      isUserModalOpen: false,
      setUserModalOpen: (open) => set({ isUserModalOpen: open }),
      isAnnouncementModalOpen: false,
      setAnnouncementModalOpen: (open) => set({ isAnnouncementModalOpen: open }),
      announcements: [],
      setAnnouncements: (announcements) => set({ announcements }),
      addAnnouncement: (announcement) => set((state) => {
        const newAnnouncements = [...state.announcements, announcement];
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return { announcements: newAnnouncements };
      }),
      deleteAnnouncement: (id) => set((state) => {
        const newAnnouncements = state.announcements.filter(a => a.id !== id);
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return { announcements: newAnnouncements };
      }),
      seenAnnouncements: [],
      setSeenAnnouncements: (ids) => set({ seenAnnouncements: ids }),
      fetchProducts: async () => {
        if (!isSupabaseConfigured) {
          console.warn("Supabase not configured. Skipping fetch.");
          return;
        }
        try {
          // Fetching all products using pagination to ensure we get everything
          let allProducts: Product[] = [];
          let from = 0;
          const step = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from('products')
              .select('id, name, description, price, image, category')
              .order('name', { ascending: true })
              .range(from, from + step - 1);
            
            if (error) throw error;
            if (data && data.length > 0) {
              allProducts = [...allProducts, ...(data as Product[])];
              from += step;
              if (data.length < step) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
          
          set({ products: allProducts });

          // Set up realtime subscription if not already active
          if (!get().realtimeInitialized) {
            const channel = supabase.channel('products-realtime');
            channel
              .on(
                'postgres_changes' as any, 
                { event: '*', table: 'products', schema: 'public' }, 
                async () => {
                  // Re-fetch everything on change to keep in sync
                  get().fetchProducts();
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
        const elementKey = slot === 1 ? 'textElements1' : slot === 2 ? 'textElements2' : 'textElements3';
        const imageKey = slot === 1 ? 'productImage1' : slot === 2 ? 'productImage2' : 'productImage3';
        set((state) => {
          const newState = {
            [elementKey]: {
              ...state[elementKey],
              name: { ...state[elementKey].name, text: product.name },
              description: { ...state[elementKey].description, text: product.description },
              price: { ...state[elementKey].price, text: product.price },
            },
            [imageKey]: { ...state[imageKey], url: product.image }
          } as any;

          const newLayouts = [...state.layouts];
          if (newLayouts[state.activeLayoutIndex]) {
            newLayouts[state.activeLayoutIndex] = {
              ...newLayouts[state.activeLayoutIndex],
              ...newState
            };
          }

          return { ...newState, layouts: newLayouts };
        });
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
        const timestamp = new Date().toISOString();
        const layout = {
          background: state.background,
          productImage1: state.productImage1,
          productImage2: state.productImage2,
          productImage3: state.productImage3,
          textElements1: state.textElements1,
          textElements2: state.textElements2,
          textElements3: state.textElements3,
          activeLayoutIndex: state.activeLayoutIndex,
          layouts: state.layouts,
          optionalText1: state.optionalText1,
          optionalText2: state.optionalText2,
          optionalText3: state.optionalText3,
          updated_at: timestamp
        };
        
        // Update local timestamp before saving to avoid reacting to our own change
        set({ lastUpdateTimestamp: timestamp });

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
          // Load users and flags first
          await get().loadUsersAndFlags();

          const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('id', 'current_layout')
            .single();
          
          if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
          
          if (data?.value) {
            const layout = data.value;
            const currentState = get();
            
            // If we have a newer local update, don't overwrite with older DB data
            if (currentState.lastUpdateTimestamp && layout.updated_at && layout.updated_at <= currentState.lastUpdateTimestamp) {
              return;
            }

            // Trust the layouts from the database, but ensure they have all properties
            let rawLayouts = layout.layouts || currentState.layouts;
            
            // Ensure we have at least 50 layouts
            if (rawLayouts.length < 50) {
              const missingCount = 50 - rawLayouts.length;
              const missing = Array.from({ length: missingCount }, (_, i) => {
                const idx = rawLayouts.length + i;
                return createDefaultLayout(`Modelo ${idx + 1}`, idx);
              });
              rawLayouts = [...rawLayouts, ...missing];
            }

            let loadedLayouts = rawLayouts.map((l: any, idx: number) => {
              const name = l.name || `Modelo ${idx + 1}`;
              const defaultL = createDefaultLayout(name, idx);
              
              const merged = {
                ...defaultL,
                ...l,
                textElements1: l.textElements1 ? { ...defaultL.textElements1, ...l.textElements1 } : defaultL.textElements1,
                textElements2: l.textElements2 ? { ...defaultL.textElements2, ...l.textElements2 } : defaultL.textElements2,
                textElements3: l.textElements3 ? { ...defaultL.textElements3, ...l.textElements3 } : defaultL.textElements3,
              };

              return merged;
            }).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

            const activeLayout = loadedLayouts[layout.activeLayoutIndex || 0] || loadedLayouts[0];

            set({
              background: layout.background || currentState.background,
              productImage1: layout.productImage1 || currentState.productImage1,
              productImage2: layout.productImage2 || currentState.productImage2,
              productImage3: layout.productImage3 || currentState.productImage3 || activeLayout.productImage3,
              textElements1: layout.textElements1 || currentState.textElements1,
              textElements2: layout.textElements2 || currentState.textElements2,
              textElements3: layout.textElements3 || currentState.textElements3 || activeLayout.textElements3,
              optionalText1: layout.optionalText1 || currentState.optionalText1 || activeLayout.optionalText1,
              optionalText2: layout.optionalText2 || currentState.optionalText2 || activeLayout.optionalText2,
              optionalText3: layout.optionalText3 || currentState.optionalText3 || activeLayout.optionalText3,
              activeLayoutIndex: layout.activeLayoutIndex !== undefined ? layout.activeLayoutIndex : currentState.activeLayoutIndex,
              layouts: loadedLayouts,
              lastUpdateTimestamp: layout.updated_at || null
            } as any);
          }

          // Set up realtime subscription for settings if not already active
          if (!get().settingsRealtimeInitialized) {
            const channel = supabase.channel('settings-realtime');
            channel
              .on(
                'postgres_changes' as any,
                { event: '*', table: 'settings', schema: 'public', filter: 'id=eq.current_layout' },
                async (payload) => {
                  const newValue = (payload.new as any)?.value;
                  if (newValue) {
                    const currentState = get();
                    // Only update if the new timestamp is newer than our last update
                    if (!currentState.lastUpdateTimestamp || (newValue.updated_at && newValue.updated_at > currentState.lastUpdateTimestamp)) {
                      await get().loadLayout();
                    }
                  }
                }
              )
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  set({ settingsRealtimeInitialized: true });
                }
              });
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
      isSingleProduct: false,
      setSingleProduct: (isSingleProduct) => set({ isSingleProduct }),

      printQueue: [],
      addToQueue: (imageData, isLandscape) => set((state) => ({ 
        printQueue: [...state.printQueue, { imageData, isLandscape }]
      })),
      removeFromQueue: (index) => set((state) => ({
        printQueue: state.printQueue.filter((_, i) => i !== index)
      })),
      clearQueue: () => set({ printQueue: [] }),
      currentView: 'editor',
      setView: (view) => set({ currentView: view }),
      realtimeInitialized: false,
      settingsRealtimeInitialized: false,
      lastUpdateTimestamp: null,
      
      flags: ['Ultra Popular', 'Maxi Popular', 'Entrefarma', 'Farmanorte', 'Outra'],
      addFlag: (flag) => set((state) => {
        const newState = {
          flags: state.flags.includes(flag) ? state.flags : [...state.flags, flag]
        };
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return newState;
      }),
      removeFlag: (flag) => set((state) => {
        const newState = {
          flags: state.flags.filter(f => f !== flag)
        };
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return newState;
      }),
      updateFlag: (oldFlag, newFlag) => set((state) => {
        const newState = {
          flags: state.flags.map(f => f === oldFlag ? newFlag : f)
        };
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return newState;
      }),

      userGroups: [],
      addUserGroup: (name) => set((state) => {
        const newState = {
          userGroups: [...state.userGroups, { id: crypto.randomUUID(), name }]
        };
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return newState;
      }),
      removeUserGroup: (id) => set((state) => {
        const newState = {
          userGroups: state.userGroups.filter(g => g.id !== id),
          allowedStores: state.allowedStores.map(s => s.groupId === id ? { ...s, groupId: undefined } : s)
        };
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return newState;
      }),
      updateUserGroup: (id, name) => set((state) => {
        const newState = {
          userGroups: state.userGroups.map(g => g.id === id ? { ...g, name } : g)
        };
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return newState;
      }),
      setUserGroup: (cnpj, groupId) => set((state) => {
        const normalizedCnpj = cnpj?.replace(/[^\d]/g, '') || '';
        const newAllowedStores = state.allowedStores.map(s => 
          s.cnpj?.replace(/[^\d]/g, '') === normalizedCnpj 
            ? { ...s, groupId }
            : s
        );
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return { allowedStores: newAllowedStores };
      }),

      allowedStores: [],
      addAllowedStore: (store) => set((state) => {
        const normalizedCnpj = store.cnpj?.replace(/[^\d]/g, '') || '';
        const existingIndex = state.allowedStores.findIndex(s => s.cnpj?.replace(/[^\d]/g, '') === normalizedCnpj);
        
        const updatedStore = {
          ...store,
          cnpj: store.cnpj.trim(),
          allowedLayouts: store.allowedLayouts !== undefined ? store.allowedLayouts : (existingIndex !== -1 ? state.allowedStores[existingIndex].allowedLayouts : undefined),
          hasEncarteAccess: store.hasEncarteAccess !== undefined ? store.hasEncarteAccess : (existingIndex !== -1 ? state.allowedStores[existingIndex].hasEncarteAccess : false)
        };

        let newAllowedStores;
        if (existingIndex !== -1) {
          newAllowedStores = [...state.allowedStores];
          newAllowedStores[existingIndex] = updatedStore;
        } else {
          newAllowedStores = [...state.allowedStores, updatedStore];
        }

        setTimeout(() => get().saveUsersAndFlags(), 0);
        return { allowedStores: newAllowedStores };
      }),
      removeAllowedStore: (cnpj) => set((state) => {
        const normalizedCnpj = cnpj?.replace(/[^\d]/g, '') || '';
        const newState = { 
          allowedStores: state.allowedStores.filter(s => s.cnpj?.replace(/[^\d]/g, '') !== normalizedCnpj) 
        };
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return newState;
      }),

      toggleEncarteAccess: (cnpj) => set((state) => {
        const normalizedCnpj = cnpj?.replace(/[^\d]/g, '') || '';
        const newAllowedStores = state.allowedStores.map(s => 
          s.cnpj?.replace(/[^\d]/g, '') === normalizedCnpj 
            ? { ...s, hasEncarteAccess: !s.hasEncarteAccess }
            : s
        );
        setTimeout(() => get().saveUsersAndFlags(), 0);
        return { allowedStores: newAllowedStores };
      }),

      saveUsersAndFlagsDebounced: () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          get().saveUsersAndFlags();
        }, 1000);
      },

      saveUsersAndFlags: async () => {
        if (!isSupabaseConfigured) return;
        const state = get();
        try {
          const { error } = await supabase
            .from('settings')
            .upsert({ 
              id: 'users_and_flags', 
              value: { 
                allowedStores: state.allowedStores, 
                flags: state.flags,
                userGroups: state.userGroups,
                encartes: state.encartes,
                selectedEncarteModel: state.selectedEncarteModel,
                layouts: state.layouts,
                announcements: state.announcements
              } 
            });
          if (error) throw error;
        } catch (error) {
          console.error("Error saving users and flags to Supabase:", error);
          throw error;
        }
      },

      loadUsersAndFlags: async () => {
        if (!isSupabaseConfigured) return;
        try {
          const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('id', 'users_and_flags')
            .single();
          
          if (error && error.code !== 'PGRST116') throw error;
          
          if (data?.value) {
            const currentState = get();
            let loadedLayouts = data.value.layouts || currentState.layouts;
            
            // Ensure we have at least 50 layouts
            if (loadedLayouts.length < 50) {
              const missingCount = 50 - loadedLayouts.length;
              const missing = Array.from({ length: missingCount }, (_, i) => {
                const idx = loadedLayouts.length + i;
                return createDefaultLayout(`Modelo ${idx + 1}`, idx);
              });
              loadedLayouts = [...loadedLayouts, ...missing];
            }

            set({
              allowedStores: data.value.allowedStores || [],
              flags: data.value.flags || get().flags,
              userGroups: data.value.userGroups || [],
              encartes: data.value.encartes || get().encartes,
              selectedEncarteModel: data.value.selectedEncarteModel || get().selectedEncarteModel,
              layouts: loadedLayouts,
              announcements: data.value.announcements || []
            });
          }
        } catch (error) {
          console.error("Error loading users and flags from Supabase:", error);
        }
      },

      isAuthenticated: false,
      lastLoginTimestamp: null,
      userRole: null,
      currentUser: null,
      isSupportChatOpen: false,
      setSupportChatOpen: (open) => set({ isSupportChatOpen: open }),
      isChatConnected: false,
      setIsChatConnected: (connected) => set({ isChatConnected: connected }),
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
      activeConversationId: null,
      setActiveConversationId: (id) => set({ activeConversationId: id }),
      conversations: [],
      setConversations: (conversations) => set({ conversations }),
      isChatLoading: false,
      setIsChatLoading: (loading) => set({ isChatLoading: loading }),

      encartes: Array(10).fill(null).map((_, i) => ({
        name: `Modelo ${i + 1}`,
        frontBgUrl: '',
        backBgUrl: '',
        frontProducts: Array(12).fill(null),
        backProducts: Array(12).fill(null),
        productCount: 12,
        extraProducts: [null, null],
      })),
      setEncartes: (encartes) => {
        set({ encartes });
        get().saveUsersAndFlagsDebounced();
      },
      selectedEncarteModel: null,
      setSelectedEncarteModel: (model) => {
        set({ selectedEncarteModel: model });
        get().saveUsersAndFlagsDebounced();
      },

      login: (role, user) => set({ 
        isAuthenticated: true, 
        userRole: role, 
        currentUser: user,
        lastLoginTimestamp: Date.now() 
      }),
      logout: () => set({ 
        isAuthenticated: false, 
        userRole: null, 
        currentUser: null,
        lastLoginTimestamp: null 
      }),
    }),
    {
      name: 'smartprice-storage',
      partialize: (state) => ({
        theme: state.theme,
        background: state.background,
        productImage1: state.productImage1,
        productImage2: state.productImage2,
        productImage3: state.productImage3,
        textElements1: state.textElements1,
        textElements2: state.textElements2,
        textElements3: state.textElements3,
        activeLayoutIndex: state.activeLayoutIndex,
        layouts: state.layouts,
        zoom: state.zoom,
        allowedStores: state.allowedStores,
        flags: state.flags,
        userGroups: state.userGroups,
        isAuthenticated: state.isAuthenticated,
        lastLoginTimestamp: state.lastLoginTimestamp,
        userRole: state.userRole,
        currentUser: state.currentUser,
        currentView: state.currentView,
        encartes: state.encartes,
        selectedEncarteModel: state.selectedEncarteModel,
        announcements: state.announcements,
        seenAnnouncements: state.seenAnnouncements,
        isSingleProduct: state.isSingleProduct,
      }),
    }
  )
);

import { create } from 'zustand';
import { Product, CartItem, Settings, Bill, DailySummary } from '../types';

interface AppState {
  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: number) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;

  // Discount
  discountPercent: number;
  discountAmount: number;
  setDiscountPercent: (percent: number) => void;
  setDiscountAmount: (amount: number) => void;

  // Payment
  paymentMode: 'cash' | 'upi';
  setPaymentMode: (mode: 'cash' | 'upi') => void;

  // Settings
  settings: Settings | null;
  setSettings: (settings: Settings) => void;

  // Dashboard
  dailySummary: DailySummary | null;
  setDailySummary: (summary: DailySummary) => void;
  recentBills: Bill[];
  setRecentBills: (bills: Bill[]) => void;
  lowStockProducts: Product[];
  setLowStockProducts: (products: Product[]) => void;

  // UI State
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Computed values
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useStore = create<AppState>((set, get) => ({
  // Products
  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (product) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === product.id ? product : p)),
    })),
  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  // Cart
  cart: [],
  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id);
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { cart: [...state.cart, { product, quantity: 1 }] };
    }),
  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.product.id !== productId),
    })),
  updateCartQuantity: (productId, quantity) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    })),
  clearCart: () => set({ cart: [], discountPercent: 0, discountAmount: 0 }),

  // Discount
  discountPercent: 0,
  discountAmount: 0,
  setDiscountPercent: (percent) => {
    const subtotal = get().getSubtotal();
    const amount = (subtotal * percent) / 100;
    set({ discountPercent: percent, discountAmount: Math.round(amount * 100) / 100 });
  },
  setDiscountAmount: (amount) => {
    const subtotal = get().getSubtotal();
    const percent = subtotal > 0 ? (amount / subtotal) * 100 : 0;
    set({ discountAmount: amount, discountPercent: Math.round(percent * 100) / 100 });
  },

  // Payment
  paymentMode: 'cash',
  setPaymentMode: (mode) => set({ paymentMode: mode }),

  // Settings
  settings: null,
  setSettings: (settings) => set({ settings }),

  // Dashboard
  dailySummary: null,
  setDailySummary: (summary) => set({ dailySummary: summary }),
  recentBills: [],
  setRecentBills: (bills) => set({ recentBills: bills }),
  lowStockProducts: [],
  setLowStockProducts: (products) => set({ lowStockProducts: products }),

  // UI State
  selectedCategory: null,
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Computed values
  getSubtotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },
  getTotal: () => {
    const subtotal = get().getSubtotal();
    const { discountAmount } = get();
    return Math.max(0, subtotal - discountAmount);
  },
}));

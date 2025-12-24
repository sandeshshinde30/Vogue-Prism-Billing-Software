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
  addToCart: (product: Product) => boolean; // Returns true if added successfully
  removeFromCart: (productId: number) => void;
  updateCartQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getCartQuantity: (productId: number) => number; // Helper to get current cart quantity
  canAddToCart: (product: Product) => boolean; // Check if product can be added

  // Discount
  discountPercent: number;
  discountAmount: number;
  setDiscountPercent: (percent: number) => void;
  setDiscountAmount: (amount: number) => void;

  // Payment
  paymentMode: 'cash' | 'upi' | 'mixed';
  cashAmount: number;
  upiAmount: number;
  setPaymentMode: (mode: 'cash' | 'upi' | 'mixed') => void;
  setCashAmount: (amount: number) => void;
  setUpiAmount: (amount: number) => void;

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
  
  // Manual total override
  manualTotal: number | null;
  setManualTotal: (total: number | null) => void;
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
  getCartQuantity: (productId) => {
    const { cart } = get();
    const item = cart.find((item) => item.product.id === productId);
    return item ? item.quantity : 0;
  },
  canAddToCart: (product) => {
    const { cart } = get();
    const existing = cart.find((item) => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    return currentQty < product.stock;
  },
  addToCart: (product) => {
    const state = get();
    const existing = state.cart.find((item) => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    
    // Check if adding one more would exceed available stock
    if (currentQty >= product.stock) {
      return false; // Cannot add - stock exceeded
    }
    
    if (existing) {
      const newQuantity = existing.quantity + 1;
      const totalPrice = newQuantity * product.price;
      set({
        cart: state.cart.map((item) =>
          item.product.id === product.id
            ? { 
                ...item, 
                quantity: newQuantity,
                unitPrice: product.price,
                totalPrice: totalPrice,
                productName: product.name
              }
            : item
        ),
      });
    } else {
      set({ 
        cart: [...state.cart, { 
          product, 
          quantity: 1,
          productName: product.name,
          unitPrice: product.price,
          totalPrice: product.price
        }]
      });
    }
    return true; // Successfully added
  },
  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.product.id !== productId),
    })),
  updateCartQuantity: (productId, quantity) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id === productId 
          ? { 
              ...item, 
              quantity,
              totalPrice: quantity * item.unitPrice
            } 
          : item
      ),
    })),
  clearCart: () => set({ cart: [], discountPercent: 0, discountAmount: 0, manualTotal: null, cashAmount: 0, upiAmount: 0 }),

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
  cashAmount: 0,
  upiAmount: 0,
  setPaymentMode: (mode) => set({ paymentMode: mode }),
  setCashAmount: (amount) => set({ cashAmount: amount }),
  setUpiAmount: (amount) => set({ upiAmount: amount }),

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

  // Manual total override
  manualTotal: null,
  setManualTotal: (total) => set({ manualTotal: total }),

  // Computed values
  getSubtotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },
  getTotal: () => {
    const { manualTotal } = get();
    if (manualTotal !== null) {
      return manualTotal;
    }
    const subtotal = get().getSubtotal();
    const { discountAmount } = get();
    return Math.max(0, subtotal - discountAmount);
  },
}));

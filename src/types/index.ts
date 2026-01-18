export interface Product {
  id: number;
  name: string;
  category: Category | string;
  size: Size | string;
  barcode: string;
  costPrice: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Bill {
  id: number;
  billNumber: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMode: 'cash' | 'upi' | 'mixed';
  cashAmount?: number;
  upiAmount?: number;
  customerMobileNumber?: string;
  status: 'completed' | 'cancelled' | 'held';
  createdAt: string;
}

export interface BillItem {
  id: number;
  billId: number;
  productId: number;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  location: string;
  status: 'idle' | 'printing' | 'error' | 'offline' | 'unknown';
  isDefault: boolean;
  deviceUri?: string;
  makeModel?: string;
  paperSize?: string;
  driverName?: string;
  isNetworkPrinter: boolean;
  capabilities?: string[];
}

export interface PrinterSettings {
  selectedPrinter: string;
  paperWidth: '58mm' | '80mm';
  autoPrint: boolean;
  printDensity: 'light' | 'medium' | 'dark';
  cutPaper: boolean;
  printSpeed: 'slow' | 'medium' | 'fast';
  encoding: 'utf8' | 'gb18030' | 'big5';
}

export interface Settings {
  storeName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  gstNumber: string;
  billPrefix: string;
  startingBillNumber: number;
  maxDiscountPercent: number;
  lowStockThreshold: number;
  printerName: string;
  paperWidth: '58mm' | '80mm';
  autoPrint: boolean;
}

export interface StockLog {
  id: number;
  productId: number;
  changeType: 'sale' | 'restock' | 'adjustment';
  quantityChange: number;
  referenceId: number | null;
  createdAt: string;
}

export interface DailySummary {
  totalSales: number;
  totalBills: number;
  cashSales: number;
  upiSales: number;
  itemsSold: number;
}

export const CATEGORIES = [
  'Shirt',
  'T-Shirt',
  'Jacket',
  'Hoodie',
  'Jeans',
  'Formal Pants',
  'Night Pants',
  'Shorts',
  'Underwear',
  'Benian',
] as const;

// Category-specific sizes
export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL'] as const;
export const PANTS_SIZES = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'] as const;
export const UNDERWEAR_SIZES = ['75', '80', '85', '90', '95', '100', '105'] as const;
export const BENIAN_SIZES = ['75', '80', '85', '90', '95', '100', '105'] as const;

// Size mapping for categories
export const CATEGORY_SIZES = {
  'T-Shirt': CLOTHING_SIZES,
  'Shirt': CLOTHING_SIZES,
  'Jacket': CLOTHING_SIZES,
  'Hoodie': CLOTHING_SIZES,
  'Jeans': PANTS_SIZES,
  'Formal Pants': PANTS_SIZES,
  'Night Pants': PANTS_SIZES,
  'Shorts': CLOTHING_SIZES,
  'Underwear': UNDERWEAR_SIZES,
  'Benian': BENIAN_SIZES,
} as const;

// All possible sizes (union of all size types)
export const ALL_SIZES = [
  ...CLOTHING_SIZES,
  ...PANTS_SIZES,
  ...UNDERWEAR_SIZES,
  ...BENIAN_SIZES
] as const;

export type Category = typeof CATEGORIES[number];
export type ClothingSize = typeof CLOTHING_SIZES[number];
export type PantsSize = typeof PANTS_SIZES[number];
export type UnderwearSize = typeof UNDERWEAR_SIZES[number];
export type BenianSize = typeof BENIAN_SIZES[number];
export type Size = typeof ALL_SIZES[number];

// Helper function to get sizes for a category
export function getSizesForCategory(category: Category): readonly string[] {
  return CATEGORY_SIZES[category] || CLOTHING_SIZES;
}

export interface Product {
  id: number;
  name: string;
  category: Category | string;
  size: Size | string;
  barcode: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Bill {
  id: number;
  billNumber: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMode: 'cash' | 'upi';
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
] as const;

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

export type Category = typeof CATEGORIES[number];
export type Size = typeof SIZES[number];

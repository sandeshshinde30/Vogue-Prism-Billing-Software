import { Product, Bill, BillItem, DailySummary, Settings } from './index';

export interface ElectronAPI {
  // Products
  getProducts: () => Promise<Product[]>;
  getProductByBarcode: (barcode: string) => Promise<Product | null>;
  searchProducts: (query: string) => Promise<Product[]>;
  getProductsByCategory: (category: string) => Promise<Product[]>;
  createProduct: (product: Partial<Product>) => Promise<Product>;
  updateProduct: (product: Product) => Promise<Product>;
  deleteProduct: (id: number) => Promise<{ success: boolean }>;
  updateStock: (id: number, quantity: number, changeType: string) => Promise<{ success: boolean }>;
  getLowStockProducts: () => Promise<Product[]>;

  // Bills
  createBill: (billData: {
    items: { product: Product; quantity: number }[];
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
    paymentMode: 'cash' | 'upi';
  }) => Promise<Bill>;
  getBills: (dateFrom?: string, dateTo?: string) => Promise<Bill[]>;
  getBillById: (id: number) => Promise<{ bill: Bill; items: BillItem[] }>;
  getDailySummary: (date?: string) => Promise<DailySummary>;
  getTopSelling: (date?: string) => Promise<{ productName: string; size: string; totalQty: number }[]>;
  getRecentBills: (limit?: number) => Promise<Bill[]>;

  // Reports
  getSalesReport: (dateFrom: string, dateTo: string) => Promise<{
    productName: string;
    size: string;
    category: string;
    quantitySold: number;
    totalAmount: number;
  }[]>;
  exportData: (dateFrom: string, dateTo: string) => Promise<{
    bill_number: string;
    created_at: string;
    product_name: string;
    size: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[]>;

  // Settings
  getSettings: () => Promise<Record<string, string>>;
  updateSetting: (key: string, value: string) => Promise<{ success: boolean }>;
  updateAllSettings: (settings: Record<string, string>) => Promise<{ success: boolean }>;

  // Backup
  exportBackup: () => Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }>;
  importBackup: () => Promise<{ success: boolean; requiresRestart?: boolean; cancelled?: boolean; error?: string }>;

  // Printer
  getPrinters: () => Promise<{ name: string; isDefault: boolean }[]>;
  print: (content: string, printerName?: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

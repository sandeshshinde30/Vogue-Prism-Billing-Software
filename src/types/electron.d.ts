import { Product, Bill, BillItem, DailySummary, Settings } from './index';

export interface ElectronAPI {
  // Products
  getProducts: (includeInactive?: boolean) => Promise<Product[]>;
  getProductByBarcode: (barcode: string) => Promise<Product | null>;
  searchProducts: (query: string) => Promise<Product[]>;
  getProductsByCategory: (category: string) => Promise<Product[]>;
  createProduct: (product: Partial<Product>) => Promise<Product>;
  updateProduct: (product: Product) => Promise<Product>;
  deleteProduct: (id: number, forceDeactivate?: boolean) => Promise<{ success: boolean; deleted?: boolean; deactivated?: boolean; message?: string }>;
  deactivateProduct: (id: number) => Promise<{ success: boolean; message?: string }>;
  reactivateProduct: (id: number) => Promise<{ success: boolean }>;
  updateStock: (id: number, quantity: number, changeType: string) => Promise<{ success: boolean }>;
  getLowStockProducts: () => Promise<Product[]>;

  // Bills
  createBill: (billData: {
    items: { product: Product; quantity: number }[];
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
    paymentMode: 'cash' | 'upi' | 'mixed';
    cashAmount?: number;
    upiAmount?: number;
  }) => Promise<Bill>;
  getBills: (dateFrom?: string, dateTo?: string) => Promise<Bill[]>;
  getBillById: (id: number) => Promise<{ bill: Bill; items: BillItem[] }>;
  getDailySummary: (date?: string) => Promise<DailySummary>;
  getDateRangeSummary: (dateFrom: string, dateTo: string) => Promise<DailySummary>;
  getTopSelling: (date?: string) => Promise<{ productName: string; size: string; totalQty: number }[]>;
  getRecentBills: (limit?: number) => Promise<Bill[]>;
  updateBill: (billId: number, billData: any) => Promise<{ bill: Bill; items: BillItem[] }>;
  deleteBill: (billId: number) => Promise<{ success: boolean; message: string }>;

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
    subtotal: number;
    discount_rate: number;
    discount_amount: number;
    final_total: number;
    payment_mode: string;
    cash_amount?: number;
    upi_amount?: number;
  }[]>;
  getStockMovementReport: (dateFrom: string, dateTo: string) => Promise<{
    productName: string;
    size: string;
    category: string;
    changeType: string;
    quantityChange: number;
    createdAt: string;
    referenceNumber: string | null;
  }[]>;
  getCategorySales: (dateFrom: string, dateTo: string) => Promise<{
    category: string;
    uniqueProducts: number;
    totalQuantity: number;
    totalAmount: number;
  }[]>;
  getPaymentModeSummary: (dateFrom: string, dateTo: string) => Promise<{
    paymentMode: string;
    billCount: number;
    totalAmount: number;
    averageAmount: number;
  }[]>;
  getHourlySales: (date: string) => Promise<{
    hour: string;
    billCount: number;
    totalAmount: number;
  }[]>;
  getLowStockAlert: () => Promise<{
    id: number;
    name: string;
    category: string;
    size: string;
    stock: number;
    lowStockThreshold: number;
    shortfall: number;
  }[]>;
  getProductPerformance: (dateFrom: string, dateTo: string, limit?: number) => Promise<{
    productName: string;
    size: string;
    category: string;
    currentPrice: number;
    billCount: number;
    totalQuantity: number;
    totalRevenue: number;
    averagePrice: number;
  }[]>;

  // Settings
  getSettings: () => Promise<Record<string, string>>;
  getSetting: (key: string) => Promise<string>;
  updateSetting: (key: string, value: string) => Promise<{ success: boolean }>;
  updateAllSettings: (settings: Record<string, string>) => Promise<{ success: boolean }>;
  getTypedSettings: () => Promise<Settings>;

  // Backup
  exportBackup: () => Promise<{ 
    success: boolean; 
    path?: string; 
    cancelled?: boolean; 
    error?: string;
    recordCount?: {
      products: number;
      bills: number;
      bill_items: number;
      stock_logs: number;
      settings: number;
    };
  }>;
  importBackup: () => Promise<{ 
    success: boolean; 
    requiresRestart?: boolean; 
    cancelled?: boolean; 
    error?: string;
    message?: string;
  }>;
  getDatabaseStats: () => Promise<{
    products: { count: number };
    bills: { count: number };
    bill_items: { count: number };
    stock_logs: { count: number };
    settings: { count: number };
    database_size: { bytes: number; mb: number };
  }>;

  // Logs
  getActivityLogs: (limit?: number, offset?: number, entityType?: string, dateFrom?: string, dateTo?: string) => Promise<any[]>;
  getLogsCount: (entityType?: string, dateFrom?: string, dateTo?: string) => Promise<{ count: number }>;
  cleanupLogs: () => Promise<{ success: boolean; deletedCount: number }>;

  // Printer
  getPrinters: () => Promise<import('./index').PrinterInfo[]>;
  refreshPrinters: () => Promise<import('./index').PrinterInfo[]>;
  testPrint: (printerName: string, content?: string) => Promise<{ success: boolean; error?: string }>;
  debugTest: (printerName: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  print: (content: string, printerName?: string, options?: any) => Promise<{ success: boolean; error?: string }>;
  printLabel: (content: string, printerName: string) => Promise<{ success: boolean; error?: string }>;
  getPrinterStatus: (printerName: string) => Promise<{ status: string; details?: any }>;
  setPrinterSettings: (settings: any) => Promise<{ success: boolean }>;
  getPrinterSettings: () => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

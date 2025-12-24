/// <reference types="vite/client" />

interface ElectronAPI {
  // Products
  getProducts: (includeInactive?: boolean) => Promise<any[]>;
  getProductByBarcode: (barcode: string) => Promise<any>;
  searchProducts: (query: string) => Promise<any[]>;
  getProductsByCategory: (category: string) => Promise<any[]>;
  createProduct: (product: any) => Promise<any>;
  updateProduct: (product: any) => Promise<any>;
  deleteProduct: (id: number, forceDeactivate?: boolean) => Promise<{ success: boolean; deleted?: boolean; deactivated?: boolean; message?: string }>;
  deactivateProduct: (id: number) => Promise<{ success: boolean; message?: string }>;
  reactivateProduct: (id: number) => Promise<{ success: boolean }>;
  updateStock: (id: number, quantity: number, changeType: string) => Promise<{ success: boolean }>;
  getLowStockProducts: () => Promise<any[]>;

  // Bills
  createBill: (billData: {
    items: Array<{
      product: {
        id: number;
        name: string;
        size?: string;
        price: number;
      };
      quantity: number;
    }>;
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
    paymentMode: 'cash' | 'upi' | 'mixed';
    cashAmount?: number;
    upiAmount?: number;
  }) => Promise<any>;
  getBills: (dateFrom?: string, dateTo?: string) => Promise<any[]>;
  getBillById: (id: number) => Promise<any>;
  getDailySummary: (date?: string) => Promise<any>;
  getDateRangeSummary: (dateFrom: string, dateTo: string) => Promise<any>;
  getTopSelling: (date?: string) => Promise<any[]>;
  getRecentBills: (limit?: number) => Promise<any[]>;
  updateBill: (billId: number, billData: any) => Promise<any>;
  deleteBill: (billId: number) => Promise<{ success: boolean; message: string }>;

  // Reports
  getSalesReport: (dateFrom: string, dateTo: string) => Promise<any[]>;
  exportData: (dateFrom: string, dateTo: string) => Promise<any[]>;
  getStockMovementReport: (dateFrom: string, dateTo: string) => Promise<any[]>;
  getCategorySales: (dateFrom: string, dateTo: string) => Promise<any[]>;
  getPaymentModeSummary: (dateFrom: string, dateTo: string) => Promise<any[]>;
  getHourlySales: (date: string) => Promise<any[]>;
  getLowStockAlert: () => Promise<any[]>;
  getProductPerformance: (dateFrom: string, dateTo: string, limit?: number) => Promise<any[]>;

  // Settings
  getSettings: () => Promise<Record<string, string>>;
  getSetting: (key: string) => Promise<string>;
  updateSetting: (key: string, value: string) => Promise<{ success: boolean }>;
  updateAllSettings: (settings: Record<string, string>) => Promise<{ success: boolean }>;
  getTypedSettings: () => Promise<any>;

  // Backup
  exportBackup: () => Promise<any>;
  importBackup: () => Promise<any>;
  getDatabaseStats: () => Promise<any>;

  // Printer
  getPrinters: () => Promise<{ name: string; isDefault: boolean }[]>;
  print: (content: string, printerName?: string) => Promise<{ success: boolean; error?: string }>;
  printLabel: (content: string, printerName: string) => Promise<{ success: boolean; error?: string }>;
  printLabelWithImage: (barcode: string, price: number, printerName: string, design?: any) => Promise<{ success: boolean; error?: string }>;
  testPrint: (printerName?: string) => Promise<{ success: boolean; error?: string }>;

  // Logs
  getActivityLogs: (limit?: number, offset?: number, entityType?: string, dateFrom?: string, dateTo?: string) => Promise<any[]>;
  getLogsCount: (entityType?: string, dateFrom?: string, dateTo?: string) => Promise<{ count: number }>;
  cleanupLogs: () => Promise<{ success: boolean; deletedCount: number }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
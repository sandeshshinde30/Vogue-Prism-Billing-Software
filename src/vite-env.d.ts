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
  getBills: (dateFrom?: string, dateTo?: string, searchQuery?: string) => Promise<any[]>;
  getBillById: (id: number) => Promise<any>;
  getDailySummary: (date?: string) => Promise<any>;
  getDateRangeSummary: (dateFrom: string, dateTo: string) => Promise<any>;
  getTopSelling: (date?: string) => Promise<any[]>;
  getRecentBills: (limit?: number) => Promise<any[]>;
  updateBill: (billId: number, billData: any) => Promise<any>;
  deleteBill: (billId: number, reason?: string) => Promise<{ success: boolean; message: string }>;
  getDeletedBills: (limit?: number, offset?: number) => Promise<any[]>;
  getDeletedBillById: (id: number) => Promise<any>;
  restoreBill: (deletedBillId: number) => Promise<{ success: boolean; message: string; billNumber?: string }>;
  permanentlyDeleteBill: (deletedBillId: number) => Promise<{ success: boolean; message: string }>;

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

  // Analytics
  getAnalytics: (dateFrom: string, dateTo: string) => Promise<{
    dailyStats: Array<{ date: string; sales: number; profit: number; cost: number; bills: number }>;
    categoryBreakdown: Array<{ category: string; value: number; profit: number }>;
    paymentModeStats: Array<{ mode: string; value: number; percentage: number }>;
    hourlyStats: Array<{ hour: string; sales: number }>;
    topProducts: Array<{ name: string; quantity: number; revenue: number; profit: number }>;
    summary: {
      totalRevenue: number;
      totalProfit: number;
      totalCost: number;
      totalBills: number;
      avgBillValue: number;
      profitMargin: number;
    };
    salesGrowth: {
      currentRevenue: number;
      previousRevenue: number;
      growthPercentage: number;
      currentPeriodData: Array<{ date: string; sales: number }>;
      previousPeriodData: Array<{ date: string; sales: number }>;
    };
    bestSellingSizes: Array<{ size: string; quantity: number; revenue: number }>;
    customerRetention: {
      repeatCustomers: number;
      newCustomers: number;
      repeatPercentage: number;
    };
    profitableProducts: Array<{ name: string; revenue: number; cost: number; profit: number; profitMargin: number }>;
    lowPerformingProducts: Array<{ name: string; quantitySold: number; revenue: number; daysSinceLastSale: number }>;
    peakSalesDay: Array<{ weekday: string; revenue: number; bills: number }>;
    productBundles: Array<{ productA: string; productB: string; timesBoughtTogether: number }>;
    inventoryRisk: Array<{ product: string; stock: number; avgDailySales: number; daysLeft: number }>;
    discountEffectiveness: {
      revenueWithDiscount: number;
      revenueWithoutDiscount: number;
      avgBillWithDiscount: number;
      avgBillWithoutDiscount: number;
    };
    salesTarget: {
      target: number;
      achieved: number;
      percentage: number;
    };
  }>;

  // Combos
  getCombos: () => Promise<any[]>;
  createCombo: (data: any) => Promise<number>;
  updateCombo: (id: number, data: any) => Promise<{ success: boolean }>;
  deleteCombo: (id: number) => Promise<{ success: boolean }>;

  // Forecast
  getForecast: () => Promise<any>;

  // Cash/UPI Tracking
  addCashUpiTransaction: (data: any) => Promise<{ success: boolean; id: number }>;
  getCashUpiTransactions: (type?: 'cash' | 'upi', transactionType?: 'incoming' | 'outgoing', dateFrom?: string, dateTo?: string, limit?: number, offset?: number) => Promise<any[]>;
  getCashUpiTransactionById: (id: number) => Promise<any>;
  getCashUpiSummary: (dateFrom?: string, dateTo?: string) => Promise<any>;
  getDailyCashUpiSummary: (date?: string) => Promise<any>;
  updateCashUpiTransaction: (id: number, updates: any) => Promise<{ success: boolean }>;
  recordBillPayment: (billNumber: string, paymentMode: string, cashAmount: number, upiAmount: number) => Promise<{ success: boolean }>;
  reverseBillPayment: (billNumber: string, paymentMode: string, cashAmount: number, upiAmount: number) => Promise<{ success: boolean }>;
  updateBillPayment: (billNumber: string, originalPaymentMode: string, originalCashAmount: number, originalUpiAmount: number, newPaymentMode: string, newCashAmount: number, newUpiAmount: number) => Promise<{ success: boolean }>;

  // Network
  network: {
    getStatus: () => Promise<{ isOnline: boolean; speed: number; latency: number; lastChecked: string; connectionType: string }>;
    isAvailable: () => Promise<boolean>;
    getQuality: () => Promise<'excellent' | 'good' | 'fair' | 'poor' | 'offline'>;
  };

  // Config
  config: {
    isConfigured: () => Promise<{ firebase: boolean; twilio: boolean }>;
    getAppConfig: () => Promise<any>;
  };

  // DB Sync
  sync: {
    init: () => Promise<{ success: boolean }>;
    performSync: () => Promise<any>;
    getStatus: () => Promise<any>;
    trackChange: (tableName: string, operation: 'insert' | 'update' | 'delete', recordId: number, data?: Record<string, any>) => Promise<{ success: boolean }>;
    forceFullSync: () => Promise<any>;
    getDBStats: () => Promise<{
      totalSize: number;
      usedSize: number;
      freeSize: number;
      bandwidthUsed: number;
      bandwidthLimit: number;
    }>;
    getUnsyncedBills: () => Promise<any[]>;
    getSyncedBills: () => Promise<any[]>;
    syncSingleBill: (queueId: string) => Promise<{ success: boolean }>;
  };

  // Store Management
  stores: {
    getStores: () => Promise<any[]>;
    getStoreStats: (storeId?: string) => Promise<any[]>;
    pullStoreData: (storeId: string) => Promise<{ success: boolean; storeId: string; recordsPulled: number; lastPullTime: string }>;
    pullAllStoreData: () => Promise<{ success: boolean; storesPulled: string[]; totalRecordsPulled: number; lastPullTime: string }>;
    getSupabaseStores: () => Promise<any[]>;
    getLocalBillCount: (storeId: string) => Promise<number>;
    getSupabaseBillCount: (storeId: string) => Promise<number>;
    getLastSyncTime: (storeId: string) => Promise<string | null>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
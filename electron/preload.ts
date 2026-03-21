import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
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
  createBill: (billData: any) => Promise<any>;
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
  getPrinters: () => Promise<PrinterInfo[]>;
  refreshPrinters: () => Promise<PrinterInfo[]>;
  testPrint: (printerName: string, content?: string) => Promise<{ success: boolean; error?: string }>;
  fastPrint: (printerName: string, content: string) => Promise<{ success: boolean; error?: string }>;
  debugTest: (printerName: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  print: (content: string, printerName?: string, options?: any) => Promise<{ success: boolean; error?: string }>;
  getPrinterStatus: (printerName: string) => Promise<{ status: string; details?: any }>;
  setPrinterSettings: (settings: any) => Promise<{ success: boolean }>;
  getPrinterSettings: () => Promise<any>;

  // Logs
  getActivityLogs: (limit?: number, offset?: number, entityType?: string, dateFrom?: string, dateTo?: string) => Promise<any[]>;
  getLogsCount: (entityType?: string, dateFrom?: string, dateTo?: string) => Promise<{ count: number }>;
  cleanupLogs: () => Promise<{ success: boolean; deletedCount: number }>;

  // Analytics
  getAnalytics: (dateFrom: string, dateTo: string) => Promise<any>;

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

  // Bill Send
  billSend: {
    getPendingJobs: () => Promise<any[]>;
    getJobsByStatus: (status: string) => Promise<any[]>;
    getAllJobs: () => Promise<any[]>;
    getStats: () => Promise<{ pending: number; sent: number; failed: number; total: number }>;
    manualRetry: (jobId: number) => Promise<{ success: boolean }>;
    manualSend: (billId: number, customerPhone: string) => Promise<{ success: boolean }>;
    deleteJob: (jobId: number) => Promise<{ success: boolean }>;
    getQueueStatus: () => Promise<any>;
  };

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

  // Environment variables
  env: {
    VITE_SUPABASE_URL: string | undefined;
    VITE_SUPABASE_ANON_KEY: string | undefined;
    VITE_STORE_ID: string | undefined;
    VITE_STORE_NAME: string | undefined;
  };

  // Backward compatibility
  initSync: () => Promise<{ success: boolean }>;
  performSync: () => Promise<any>;
  getSyncStatus: () => Promise<any>;
  trackLocalChange: (tableName: string, operation: 'insert' | 'update' | 'delete', recordId: number, data?: Record<string, any>) => Promise<{ success: boolean }>;
  forceFullSync: () => Promise<any>;
  getNetworkStatus: () => Promise<{ isOnline: boolean; speed: number; latency: number; lastChecked: string; connectionType: string }>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Products
  getProducts: (includeInactive?: boolean) => ipcRenderer.invoke('products:getAll', includeInactive),
  getProductByBarcode: (barcode: string) => ipcRenderer.invoke('products:getByBarcode', barcode),
  searchProducts: (query: string) => ipcRenderer.invoke('products:search', query),
  getProductsByCategory: (category: string) => ipcRenderer.invoke('products:getByCategory', category),
  createProduct: (product: any) => ipcRenderer.invoke('products:create', product),
  updateProduct: (product: any) => ipcRenderer.invoke('products:update', product),
  deleteProduct: (id: number, forceDeactivate?: boolean) => ipcRenderer.invoke('products:delete', id, forceDeactivate),
  deactivateProduct: (id: number) => ipcRenderer.invoke('products:deactivate', id),
  reactivateProduct: (id: number) => ipcRenderer.invoke('products:reactivate', id),
  updateStock: (id: number, quantity: number, changeType: string) => 
    ipcRenderer.invoke('products:updateStock', id, quantity, changeType),
  getLowStockProducts: () => ipcRenderer.invoke('products:getLowStock'),

  // Bills
  createBill: (billData: any) => ipcRenderer.invoke('bills:create', billData),
  getBills: (dateFrom?: string, dateTo?: string, searchQuery?: string) => ipcRenderer.invoke('bills:getAll', dateFrom, dateTo, searchQuery),
  getBillById: (id: number) => ipcRenderer.invoke('bills:getById', id),
  getDailySummary: (date?: string) => ipcRenderer.invoke('bills:getDailySummary', date),
  getDateRangeSummary: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('bills:getDateRangeSummary', dateFrom, dateTo),
  getTopSelling: (date?: string) => ipcRenderer.invoke('bills:getTopSelling', date),
  getRecentBills: (limit?: number) => ipcRenderer.invoke('bills:getRecent', limit),
  updateBill: (billId: number, billData: any) => ipcRenderer.invoke('bills:update', billId, billData),
  deleteBill: (billId: number, reason?: string) => ipcRenderer.invoke('bills:delete', billId, reason),
  getDeletedBills: (limit?: number, offset?: number) => ipcRenderer.invoke('bills:getDeleted', limit, offset),
  getDeletedBillById: (id: number) => ipcRenderer.invoke('bills:getDeletedById', id),
  restoreBill: (deletedBillId: number) => ipcRenderer.invoke('bills:restore', deletedBillId),
  permanentlyDeleteBill: (deletedBillId: number) => ipcRenderer.invoke('bills:permanentlyDelete', deletedBillId),

  // Reports
  getSalesReport: (dateFrom: string, dateTo: string) => 
    ipcRenderer.invoke('reports:getSales', dateFrom, dateTo),
  exportData: (dateFrom: string, dateTo: string) => 
    ipcRenderer.invoke('reports:exportData', dateFrom, dateTo),
  getStockMovementReport: (dateFrom: string, dateTo: string) => 
    ipcRenderer.invoke('reports:getStockMovement', dateFrom, dateTo),
  getCategorySales: (dateFrom: string, dateTo: string) => 
    ipcRenderer.invoke('reports:getCategorySales', dateFrom, dateTo),
  getPaymentModeSummary: (dateFrom: string, dateTo: string) => 
    ipcRenderer.invoke('reports:getPaymentModeSummary', dateFrom, dateTo),
  getHourlySales: (date: string) => ipcRenderer.invoke('reports:getHourlySales', date),
  getLowStockAlert: () => ipcRenderer.invoke('reports:getLowStockAlert'),
  getProductPerformance: (dateFrom: string, dateTo: string, limit?: number) => 
    ipcRenderer.invoke('reports:getProductPerformance', dateFrom, dateTo, limit),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  updateSetting: (key: string, value: string) => ipcRenderer.invoke('settings:update', key, value),
  updateAllSettings: (settings: Record<string, string>) => 
    ipcRenderer.invoke('settings:updateAll', settings),
  getTypedSettings: () => ipcRenderer.invoke('settings:getTyped'),

  // Backup
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  getDatabaseStats: () => ipcRenderer.invoke('backup:getStats'),

  // Printer
  getPrinters: () => ipcRenderer.invoke('printer:getList'),
  refreshPrinters: () => ipcRenderer.invoke('printer:refresh'),
  testPrint: (printerName: string, content?: string) => ipcRenderer.invoke('printer:testPrint', printerName, content),
  fastPrint: (printerName: string, content: string) => ipcRenderer.invoke('printer:fastPrint', printerName, content),
  debugTest: (printerName: string) => ipcRenderer.invoke('printer:debugTest', printerName),
  print: (content: string, printerName?: string, options?: any) => ipcRenderer.invoke('printer:print', content, printerName, options),
  getPrinterStatus: (printerName: string) => ipcRenderer.invoke('printer:getStatus', printerName),
  setPrinterSettings: (settings: any) => ipcRenderer.invoke('printer:setSettings', settings),
  getPrinterSettings: () => ipcRenderer.invoke('printer:getSettings'),

  // Logs
  getActivityLogs: (limit?: number, offset?: number, entityType?: string, dateFrom?: string, dateTo?: string) => 
    ipcRenderer.invoke('logs:getActivity', limit, offset, entityType, dateFrom, dateTo),
  getLogsCount: (entityType?: string, dateFrom?: string, dateTo?: string) => 
    ipcRenderer.invoke('logs:getCount', entityType, dateFrom, dateTo),
  cleanupLogs: () => ipcRenderer.invoke('logs:cleanup'),

  // Analytics
  getAnalytics: (dateFrom: string, dateTo: string) => 
    ipcRenderer.invoke('analytics:get', dateFrom, dateTo),

  // Combos
  getCombos: () => ipcRenderer.invoke('combos:getAll'),
  createCombo: (data: any) => ipcRenderer.invoke('combos:create', data),
  updateCombo: (id: number, data: any) => ipcRenderer.invoke('combos:update', id, data),
  deleteCombo: (id: number) => ipcRenderer.invoke('combos:delete', id),

  // Forecast
  getForecast: () => ipcRenderer.invoke('forecast:get'),

  // Cash/UPI Tracking
  addCashUpiTransaction: (data: any) => ipcRenderer.invoke('cashUpi:addTransaction', data),
  getCashUpiTransactions: (type?: 'cash' | 'upi', transactionType?: 'incoming' | 'outgoing', dateFrom?: string, dateTo?: string, limit?: number, offset?: number) => 
    ipcRenderer.invoke('cashUpi:getTransactions', type, transactionType, dateFrom, dateTo, limit, offset),
  getCashUpiTransactionById: (id: number) => ipcRenderer.invoke('cashUpi:getTransactionById', id),
  getCashUpiSummary: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('cashUpi:getSummary', dateFrom, dateTo),
  getDailyCashUpiSummary: (date?: string) => ipcRenderer.invoke('cashUpi:getDailySummary', date),
  updateCashUpiTransaction: (id: number, updates: any) => ipcRenderer.invoke('cashUpi:updateTransaction', id, updates),
  recordBillPayment: (billNumber: string, paymentMode: string, cashAmount: number, upiAmount: number) => 
    ipcRenderer.invoke('cashUpi:recordBillPayment', billNumber, paymentMode, cashAmount, upiAmount),

  // Network
  network: {
    getStatus: () => ipcRenderer.invoke('network:getStatus'),
    isAvailable: () => ipcRenderer.invoke('network:isAvailable'),
    getQuality: () => ipcRenderer.invoke('network:getQuality'),
  },

  // Config
  config: {
    isConfigured: () => ipcRenderer.invoke('config:isConfigured'),
    getAppConfig: () => ipcRenderer.invoke('config:getAppConfig'),
  },

  // DB Sync
  sync: {
    init: () => ipcRenderer.invoke('sync:init'),
    performSync: () => ipcRenderer.invoke('sync:performSync'),
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    trackChange: (tableName: string, operation: 'insert' | 'update' | 'delete', recordId: number, data?: Record<string, any>) => 
      ipcRenderer.invoke('sync:trackChange', tableName, operation, recordId, data),
    forceFullSync: () => ipcRenderer.invoke('sync:forceFullSync'),
    getDBStats: () => ipcRenderer.invoke('sync:getDBStats'),
    getUnsyncedBills: () => ipcRenderer.invoke('sync:getUnsyncedBills'),
    getSyncedBills: () => ipcRenderer.invoke('sync:getSyncedBills'),
    syncSingleBill: (queueId: string) => ipcRenderer.invoke('sync:syncSingleBill', queueId),
  },

  // Store Management
  stores: {
    getStores: () => ipcRenderer.invoke('stores:getStores'),
    getStoreStats: (storeId?: string) => ipcRenderer.invoke('stores:getStoreStats', storeId),
    pullStoreData: (storeId: string) => ipcRenderer.invoke('stores:pullStoreData', storeId),
    pullAllStoreData: () => ipcRenderer.invoke('stores:pullAllStoreData'),
    getSupabaseStores: () => ipcRenderer.invoke('stores:getSupabaseStores'),
    getLocalBillCount: (storeId: string) => ipcRenderer.invoke('stores:getLocalBillCount', storeId),
    getSupabaseBillCount: (storeId: string) => ipcRenderer.invoke('stores:getSupabaseBillCount', storeId),
    getLastSyncTime: (storeId: string) => ipcRenderer.invoke('stores:getLastSyncTime', storeId),
  },

  // Environment variables
  env: {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    VITE_STORE_ID: process.env.VITE_STORE_ID,
    VITE_STORE_NAME: process.env.VITE_STORE_NAME,
  },

  // Backward compatibility
  initSync: () => ipcRenderer.invoke('sync:init'),
  performSync: () => ipcRenderer.invoke('sync:performSync'),
  getSyncStatus: () => ipcRenderer.invoke('sync:getStatus'),
  trackLocalChange: (tableName: string, operation: 'insert' | 'update' | 'delete', recordId: number, data?: Record<string, any>) => 
    ipcRenderer.invoke('sync:trackChange', tableName, operation, recordId, data),
  forceFullSync: () => ipcRenderer.invoke('sync:forceFullSync'),
  getNetworkStatus: () => ipcRenderer.invoke('network:getStatus'),
} as ElectronAPI);

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
  getPrinters: () => Promise<PrinterInfo[]>;
  refreshPrinters: () => Promise<PrinterInfo[]>;
  testPrint: (printerName: string, content?: string) => Promise<{ success: boolean; error?: string }>;
  debugTest: (printerName: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  print: (content: string, printerName?: string, options?: any) => Promise<{ success: boolean; error?: string }>;
  printLabel: (content: string, printerName: string) => Promise<{ success: boolean; error?: string }>;
  printLabelWithImage: (barcode: string, price: number, printerName: string) => Promise<{ success: boolean; error?: string }>;
  getPrinterStatus: (printerName: string) => Promise<{ status: string; details?: any }>;
  setPrinterSettings: (settings: any) => Promise<{ success: boolean }>;
  getPrinterSettings: () => Promise<any>;

  // Logs
  getActivityLogs: (limit?: number, offset?: number, entityType?: string, dateFrom?: string, dateTo?: string) => Promise<any[]>;
  getLogsCount: (entityType?: string, dateFrom?: string, dateTo?: string) => Promise<{ count: number }>;
  cleanupLogs: () => Promise<{ success: boolean; deletedCount: number }>;
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
  getBills: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('bills:getAll', dateFrom, dateTo),
  getBillById: (id: number) => ipcRenderer.invoke('bills:getById', id),
  getDailySummary: (date?: string) => ipcRenderer.invoke('bills:getDailySummary', date),
  getDateRangeSummary: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('bills:getDateRangeSummary', dateFrom, dateTo),
  getTopSelling: (date?: string) => ipcRenderer.invoke('bills:getTopSelling', date),
  getRecentBills: (limit?: number) => ipcRenderer.invoke('bills:getRecent', limit),
  updateBill: (billId: number, billData: any) => ipcRenderer.invoke('bills:update', billId, billData),
  deleteBill: (billId: number) => ipcRenderer.invoke('bills:delete', billId),

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
  debugTest: (printerName: string) => ipcRenderer.invoke('printer:debugTest', printerName),
  print: (content: string, printerName?: string, options?: any) => ipcRenderer.invoke('printer:print', content, printerName, options),
  printLabel: (content: string, printerName: string) => ipcRenderer.invoke('printer:printLabel', content, printerName),
  printLabelWithImage: (barcode: string, price: number, printerName: string) => ipcRenderer.invoke('printer:printLabelWithImage', barcode, price, printerName),
  getPrinterStatus: (printerName: string) => ipcRenderer.invoke('printer:getStatus', printerName),
  setPrinterSettings: (settings: any) => ipcRenderer.invoke('printer:setSettings', settings),
  getPrinterSettings: () => ipcRenderer.invoke('printer:getSettings'),

  // Logs
  getActivityLogs: (limit?: number, offset?: number, entityType?: string, dateFrom?: string, dateTo?: string) => 
    ipcRenderer.invoke('logs:getActivity', limit, offset, entityType, dateFrom, dateTo),
  getLogsCount: (entityType?: string, dateFrom?: string, dateTo?: string) => 
    ipcRenderer.invoke('logs:getCount', entityType, dateFrom, dateTo),
  cleanupLogs: () => ipcRenderer.invoke('logs:cleanup'),
} as ElectronAPI);

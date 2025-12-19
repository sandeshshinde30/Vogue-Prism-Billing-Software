import { ipcRenderer, contextBridge } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Products
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  getProductByBarcode: (barcode: string) => ipcRenderer.invoke('products:getByBarcode', barcode),
  searchProducts: (query: string) => ipcRenderer.invoke('products:search', query),
  getProductsByCategory: (category: string) => ipcRenderer.invoke('products:getByCategory', category),
  createProduct: (product: unknown) => ipcRenderer.invoke('products:create', product),
  updateProduct: (product: unknown) => ipcRenderer.invoke('products:update', product),
  deleteProduct: (id: number) => ipcRenderer.invoke('products:delete', id),
  updateStock: (id: number, quantity: number, changeType: string) => 
    ipcRenderer.invoke('products:updateStock', id, quantity, changeType),
  getLowStockProducts: () => ipcRenderer.invoke('products:getLowStock'),

  // Bills
  createBill: (billData: unknown) => ipcRenderer.invoke('bills:create', billData),
  getBills: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('bills:getAll', dateFrom, dateTo),
  getBillById: (id: number) => ipcRenderer.invoke('bills:getById', id),
  getDailySummary: (date?: string) => ipcRenderer.invoke('bills:getDailySummary', date),
  getTopSelling: (date?: string) => ipcRenderer.invoke('bills:getTopSelling', date),
  getRecentBills: (limit?: number) => ipcRenderer.invoke('bills:getRecentBills', limit),

  // Reports
  getSalesReport: (dateFrom: string, dateTo: string) => 
    ipcRenderer.invoke('reports:getSalesReport', dateFrom, dateTo),
  exportData: (dateFrom: string, dateTo: string) => 
    ipcRenderer.invoke('reports:exportData', dateFrom, dateTo),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  updateSetting: (key: string, value: string) => ipcRenderer.invoke('settings:update', key, value),
  updateAllSettings: (settings: Record<string, string>) => ipcRenderer.invoke('settings:updateAll', settings),

  // Backup
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),

  // Printer
  getPrinters: () => ipcRenderer.invoke('printer:getList'),
  print: (content: string, printerName?: string) => ipcRenderer.invoke('printer:print', content, printerName),
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getProducts: () => Promise<unknown[]>;
      getProductByBarcode: (barcode: string) => Promise<unknown>;
      searchProducts: (query: string) => Promise<unknown[]>;
      getProductsByCategory: (category: string) => Promise<unknown[]>;
      createProduct: (product: unknown) => Promise<unknown>;
      updateProduct: (product: unknown) => Promise<unknown>;
      deleteProduct: (id: number) => Promise<{ success: boolean }>;
      updateStock: (id: number, quantity: number, changeType: string) => Promise<{ success: boolean }>;
      getLowStockProducts: () => Promise<unknown[]>;
      createBill: (billData: unknown) => Promise<unknown>;
      getBills: (dateFrom?: string, dateTo?: string) => Promise<unknown[]>;
      getBillById: (id: number) => Promise<{ bill: unknown; items: unknown[] }>;
      getDailySummary: (date?: string) => Promise<unknown>;
      getTopSelling: (date?: string) => Promise<unknown[]>;
      getRecentBills: (limit?: number) => Promise<unknown[]>;
      getSalesReport: (dateFrom: string, dateTo: string) => Promise<unknown[]>;
      exportData: (dateFrom: string, dateTo: string) => Promise<unknown[]>;
      getSettings: () => Promise<Record<string, string>>;
      updateSetting: (key: string, value: string) => Promise<{ success: boolean }>;
      updateAllSettings: (settings: Record<string, string>) => Promise<{ success: boolean }>;
      exportBackup: () => Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }>;
      importBackup: () => Promise<{ success: boolean; requiresRestart?: boolean; cancelled?: boolean; error?: string }>;
      getPrinters: () => Promise<{ name: string; isDefault: boolean }[]>;
      print: (content: string, printerName?: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

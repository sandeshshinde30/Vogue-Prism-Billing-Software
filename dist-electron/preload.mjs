"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Products
  getProducts: (includeInactive) => electron.ipcRenderer.invoke("products:getAll", includeInactive),
  getProductByBarcode: (barcode) => electron.ipcRenderer.invoke("products:getByBarcode", barcode),
  searchProducts: (query) => electron.ipcRenderer.invoke("products:search", query),
  getProductsByCategory: (category) => electron.ipcRenderer.invoke("products:getByCategory", category),
  createProduct: (product) => electron.ipcRenderer.invoke("products:create", product),
  updateProduct: (product) => electron.ipcRenderer.invoke("products:update", product),
  deleteProduct: (id, forceDeactivate) => electron.ipcRenderer.invoke("products:delete", id, forceDeactivate),
  deactivateProduct: (id) => electron.ipcRenderer.invoke("products:deactivate", id),
  reactivateProduct: (id) => electron.ipcRenderer.invoke("products:reactivate", id),
  updateStock: (id, quantity, changeType) => electron.ipcRenderer.invoke("products:updateStock", id, quantity, changeType),
  getLowStockProducts: () => electron.ipcRenderer.invoke("products:getLowStock"),
  // Bills
  createBill: (billData) => electron.ipcRenderer.invoke("bills:create", billData),
  getBills: (dateFrom, dateTo, searchQuery) => electron.ipcRenderer.invoke("bills:getAll", dateFrom, dateTo, searchQuery),
  getBillById: (id) => electron.ipcRenderer.invoke("bills:getById", id),
  getDailySummary: (date) => electron.ipcRenderer.invoke("bills:getDailySummary", date),
  getDateRangeSummary: (dateFrom, dateTo) => electron.ipcRenderer.invoke("bills:getDateRangeSummary", dateFrom, dateTo),
  getTopSelling: (date) => electron.ipcRenderer.invoke("bills:getTopSelling", date),
  getRecentBills: (limit) => electron.ipcRenderer.invoke("bills:getRecent", limit),
  updateBill: (billId, billData) => electron.ipcRenderer.invoke("bills:update", billId, billData),
  deleteBill: (billId, reason) => electron.ipcRenderer.invoke("bills:delete", billId, reason),
  getDeletedBills: (limit, offset) => electron.ipcRenderer.invoke("bills:getDeleted", limit, offset),
  getDeletedBillById: (id) => electron.ipcRenderer.invoke("bills:getDeletedById", id),
  restoreBill: (deletedBillId) => electron.ipcRenderer.invoke("bills:restore", deletedBillId),
  permanentlyDeleteBill: (deletedBillId) => electron.ipcRenderer.invoke("bills:permanentlyDelete", deletedBillId),
  // Reports
  getSalesReport: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:getSales", dateFrom, dateTo),
  exportData: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:exportData", dateFrom, dateTo),
  getStockMovementReport: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:getStockMovement", dateFrom, dateTo),
  getCategorySales: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:getCategorySales", dateFrom, dateTo),
  getPaymentModeSummary: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:getPaymentModeSummary", dateFrom, dateTo),
  getHourlySales: (date) => electron.ipcRenderer.invoke("reports:getHourlySales", date),
  getLowStockAlert: () => electron.ipcRenderer.invoke("reports:getLowStockAlert"),
  getProductPerformance: (dateFrom, dateTo, limit) => electron.ipcRenderer.invoke("reports:getProductPerformance", dateFrom, dateTo, limit),
  // Settings
  getSettings: () => electron.ipcRenderer.invoke("settings:getAll"),
  getSetting: (key) => electron.ipcRenderer.invoke("settings:get", key),
  updateSetting: (key, value) => electron.ipcRenderer.invoke("settings:update", key, value),
  updateAllSettings: (settings) => electron.ipcRenderer.invoke("settings:updateAll", settings),
  getTypedSettings: () => electron.ipcRenderer.invoke("settings:getTyped"),
  // Backup
  exportBackup: () => electron.ipcRenderer.invoke("backup:export"),
  importBackup: () => electron.ipcRenderer.invoke("backup:import"),
  getDatabaseStats: () => electron.ipcRenderer.invoke("backup:getStats"),
  // Printer
  getPrinters: () => electron.ipcRenderer.invoke("printer:getList"),
  refreshPrinters: () => electron.ipcRenderer.invoke("printer:refresh"),
  testPrint: (printerName, content) => electron.ipcRenderer.invoke("printer:testPrint", printerName, content),
  fastPrint: (printerName, content) => electron.ipcRenderer.invoke("printer:fastPrint", printerName, content),
  debugTest: (printerName) => electron.ipcRenderer.invoke("printer:debugTest", printerName),
  print: (content, printerName, options) => electron.ipcRenderer.invoke("printer:print", content, printerName, options),
  getPrinterStatus: (printerName) => electron.ipcRenderer.invoke("printer:getStatus", printerName),
  setPrinterSettings: (settings) => electron.ipcRenderer.invoke("printer:setSettings", settings),
  getPrinterSettings: () => electron.ipcRenderer.invoke("printer:getSettings"),
  // Logs
  getActivityLogs: (limit, offset, entityType, dateFrom, dateTo) => electron.ipcRenderer.invoke("logs:getActivity", limit, offset, entityType, dateFrom, dateTo),
  getLogsCount: (entityType, dateFrom, dateTo) => electron.ipcRenderer.invoke("logs:getCount", entityType, dateFrom, dateTo),
  cleanupLogs: () => electron.ipcRenderer.invoke("logs:cleanup"),
  // Analytics
  getAnalytics: (dateFrom, dateTo) => electron.ipcRenderer.invoke("analytics:get", dateFrom, dateTo),
  // Combos
  getCombos: () => electron.ipcRenderer.invoke("combos:getAll"),
  createCombo: (data) => electron.ipcRenderer.invoke("combos:create", data),
  updateCombo: (id, data) => electron.ipcRenderer.invoke("combos:update", id, data),
  deleteCombo: (id) => electron.ipcRenderer.invoke("combos:delete", id),
  // Forecast
  getForecast: () => electron.ipcRenderer.invoke("forecast:get"),
  // Cash/UPI Tracking
  addCashUpiTransaction: (data) => electron.ipcRenderer.invoke("cashUpi:addTransaction", data),
  getCashUpiTransactions: (type, transactionType, dateFrom, dateTo, limit, offset) => electron.ipcRenderer.invoke("cashUpi:getTransactions", type, transactionType, dateFrom, dateTo, limit, offset),
  getCashUpiTransactionById: (id) => electron.ipcRenderer.invoke("cashUpi:getTransactionById", id),
  getCashUpiSummary: (dateFrom, dateTo) => electron.ipcRenderer.invoke("cashUpi:getSummary", dateFrom, dateTo),
  getDailyCashUpiSummary: (date) => electron.ipcRenderer.invoke("cashUpi:getDailySummary", date),
  updateCashUpiTransaction: (id, updates) => electron.ipcRenderer.invoke("cashUpi:updateTransaction", id, updates),
  recordBillPayment: (billNumber, paymentMode, cashAmount, upiAmount) => electron.ipcRenderer.invoke("cashUpi:recordBillPayment", billNumber, paymentMode, cashAmount, upiAmount),
  reverseBillPayment: (billNumber, paymentMode, cashAmount, upiAmount) => electron.ipcRenderer.invoke("cashUpi:reverseBillPayment", billNumber, paymentMode, cashAmount, upiAmount),
  updateBillPayment: (billNumber, originalPaymentMode, originalCashAmount, originalUpiAmount, newPaymentMode, newCashAmount, newUpiAmount) => electron.ipcRenderer.invoke("cashUpi:updateBillPayment", billNumber, originalPaymentMode, originalCashAmount, originalUpiAmount, newPaymentMode, newCashAmount, newUpiAmount),
  // Network
  network: {
    getStatus: () => electron.ipcRenderer.invoke("network:getStatus"),
    isAvailable: () => electron.ipcRenderer.invoke("network:isAvailable"),
    getQuality: () => electron.ipcRenderer.invoke("network:getQuality")
  },
  // Config
  config: {
    isConfigured: () => electron.ipcRenderer.invoke("config:isConfigured"),
    getAppConfig: () => electron.ipcRenderer.invoke("config:getAppConfig")
  },
  // DB Sync
  sync: {
    init: () => electron.ipcRenderer.invoke("sync:init"),
    performSync: () => electron.ipcRenderer.invoke("sync:performSync"),
    getStatus: () => electron.ipcRenderer.invoke("sync:getStatus"),
    trackChange: (tableName, operation, recordId, data) => electron.ipcRenderer.invoke("sync:trackChange", tableName, operation, recordId, data),
    forceFullSync: () => electron.ipcRenderer.invoke("sync:forceFullSync"),
    getDBStats: () => electron.ipcRenderer.invoke("sync:getDBStats"),
    getUnsyncedBills: () => electron.ipcRenderer.invoke("sync:getUnsyncedBills"),
    getSyncedBills: () => electron.ipcRenderer.invoke("sync:getSyncedBills"),
    syncSingleBill: (queueId) => electron.ipcRenderer.invoke("sync:syncSingleBill", queueId)
  },
  // Store Management
  stores: {
    getStores: () => electron.ipcRenderer.invoke("stores:getStores"),
    getStoreStats: (storeId) => electron.ipcRenderer.invoke("stores:getStoreStats", storeId),
    pullStoreData: (storeId) => electron.ipcRenderer.invoke("stores:pullStoreData", storeId),
    pullAllStoreData: () => electron.ipcRenderer.invoke("stores:pullAllStoreData"),
    getSupabaseStores: () => electron.ipcRenderer.invoke("stores:getSupabaseStores"),
    getLocalBillCount: (storeId) => electron.ipcRenderer.invoke("stores:getLocalBillCount", storeId),
    getSupabaseBillCount: (storeId) => electron.ipcRenderer.invoke("stores:getSupabaseBillCount", storeId),
    getLastSyncTime: (storeId) => electron.ipcRenderer.invoke("stores:getLastSyncTime", storeId)
  },
  // Environment variables
  env: {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    VITE_STORE_ID: process.env.VITE_STORE_ID,
    VITE_STORE_NAME: process.env.VITE_STORE_NAME
  },
  // Backward compatibility
  initSync: () => electron.ipcRenderer.invoke("sync:init"),
  performSync: () => electron.ipcRenderer.invoke("sync:performSync"),
  getSyncStatus: () => electron.ipcRenderer.invoke("sync:getStatus"),
  trackLocalChange: (tableName, operation, recordId, data) => electron.ipcRenderer.invoke("sync:trackChange", tableName, operation, recordId, data),
  forceFullSync: () => electron.ipcRenderer.invoke("sync:forceFullSync"),
  getNetworkStatus: () => electron.ipcRenderer.invoke("network:getStatus")
});

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
  getBills: (dateFrom, dateTo) => electron.ipcRenderer.invoke("bills:getAll", dateFrom, dateTo),
  getBillById: (id) => electron.ipcRenderer.invoke("bills:getById", id),
  getDailySummary: (date) => electron.ipcRenderer.invoke("bills:getDailySummary", date),
  getDateRangeSummary: (dateFrom, dateTo) => electron.ipcRenderer.invoke("bills:getDateRangeSummary", dateFrom, dateTo),
  getTopSelling: (date) => electron.ipcRenderer.invoke("bills:getTopSelling", date),
  getRecentBills: (limit) => electron.ipcRenderer.invoke("bills:getRecent", limit),
  updateBill: (billId, billData) => electron.ipcRenderer.invoke("bills:update", billId, billData),
  deleteBill: (billId) => electron.ipcRenderer.invoke("bills:delete", billId),
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
  debugTest: (printerName) => electron.ipcRenderer.invoke("printer:debugTest", printerName),
  print: (content, printerName, options) => electron.ipcRenderer.invoke("printer:print", content, printerName, options),
  printLabel: (content, printerName) => electron.ipcRenderer.invoke("printer:printLabel", content, printerName),
  getPrinterStatus: (printerName) => electron.ipcRenderer.invoke("printer:getStatus", printerName),
  setPrinterSettings: (settings) => electron.ipcRenderer.invoke("printer:setSettings", settings),
  getPrinterSettings: () => electron.ipcRenderer.invoke("printer:getSettings"),
  // Logs
  getActivityLogs: (limit, offset, entityType, dateFrom, dateTo) => electron.ipcRenderer.invoke("logs:getActivity", limit, offset, entityType, dateFrom, dateTo),
  getLogsCount: (entityType, dateFrom, dateTo) => electron.ipcRenderer.invoke("logs:getCount", entityType, dateFrom, dateTo),
  cleanupLogs: () => electron.ipcRenderer.invoke("logs:cleanup")
});

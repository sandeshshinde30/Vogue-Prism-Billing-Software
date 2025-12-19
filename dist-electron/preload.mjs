"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Products
  getProducts: () => electron.ipcRenderer.invoke("products:getAll"),
  getProductByBarcode: (barcode) => electron.ipcRenderer.invoke("products:getByBarcode", barcode),
  searchProducts: (query) => electron.ipcRenderer.invoke("products:search", query),
  getProductsByCategory: (category) => electron.ipcRenderer.invoke("products:getByCategory", category),
  createProduct: (product) => electron.ipcRenderer.invoke("products:create", product),
  updateProduct: (product) => electron.ipcRenderer.invoke("products:update", product),
  deleteProduct: (id) => electron.ipcRenderer.invoke("products:delete", id),
  updateStock: (id, quantity, changeType) => electron.ipcRenderer.invoke("products:updateStock", id, quantity, changeType),
  getLowStockProducts: () => electron.ipcRenderer.invoke("products:getLowStock"),
  // Bills
  createBill: (billData) => electron.ipcRenderer.invoke("bills:create", billData),
  getBills: (dateFrom, dateTo) => electron.ipcRenderer.invoke("bills:getAll", dateFrom, dateTo),
  getBillById: (id) => electron.ipcRenderer.invoke("bills:getById", id),
  getDailySummary: (date) => electron.ipcRenderer.invoke("bills:getDailySummary", date),
  getTopSelling: (date) => electron.ipcRenderer.invoke("bills:getTopSelling", date),
  getRecentBills: (limit) => electron.ipcRenderer.invoke("bills:getRecentBills", limit),
  // Reports
  getSalesReport: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:getSalesReport", dateFrom, dateTo),
  exportData: (dateFrom, dateTo) => electron.ipcRenderer.invoke("reports:exportData", dateFrom, dateTo),
  // Settings
  getSettings: () => electron.ipcRenderer.invoke("settings:getAll"),
  updateSetting: (key, value) => electron.ipcRenderer.invoke("settings:update", key, value),
  updateAllSettings: (settings) => electron.ipcRenderer.invoke("settings:updateAll", settings),
  // Backup
  exportBackup: () => electron.ipcRenderer.invoke("backup:export"),
  importBackup: () => electron.ipcRenderer.invoke("backup:import"),
  // Printer
  getPrinters: () => electron.ipcRenderer.invoke("printer:getList"),
  print: (content, printerName) => electron.ipcRenderer.invoke("printer:print", content, printerName)
});

import { app, ipcMain, BrowserWindow, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";
import fs from "node:fs";
let db = null;
function getDbPath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "vogue-prism.db");
}
function initDatabase() {
  if (db) return db;
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      size TEXT,
      barcode TEXT UNIQUE,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE NOT NULL,
      subtotal REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      size TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      change_type TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      reference_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
  `);
  const defaultSettings = {
    storeName: "Vogue Prism",
    addressLine1: "",
    addressLine2: "",
    phone: "",
    gstNumber: "",
    billPrefix: "VP-",
    startingBillNumber: "1001",
    maxDiscountPercent: "30",
    lowStockThreshold: "5",
    printerName: "",
    paperWidth: "58mm",
    autoPrint: "true"
  };
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }
  return db;
}
function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
function setupIpcHandlers() {
  const db2 = getDatabase();
  ipcMain.handle("products:getAll", () => {
    return db2.prepare(`
      SELECT id, name, category, size, barcode, price, stock, 
             low_stock_threshold as lowStockThreshold,
             created_at as createdAt, updated_at as updatedAt
      FROM products ORDER BY name
    `).all();
  });
  ipcMain.handle("products:getByBarcode", (_, barcode) => {
    return db2.prepare(`
      SELECT id, name, category, size, barcode, price, stock,
             low_stock_threshold as lowStockThreshold,
             created_at as createdAt, updated_at as updatedAt
      FROM products WHERE barcode = ?
    `).get(barcode);
  });
  ipcMain.handle("products:search", (_, query) => {
    const searchTerm = `%${query}%`;
    return db2.prepare(`
      SELECT id, name, category, size, barcode, price, stock,
             low_stock_threshold as lowStockThreshold,
             created_at as createdAt, updated_at as updatedAt
      FROM products 
      WHERE name LIKE ? OR barcode LIKE ? OR category LIKE ?
      ORDER BY name LIMIT 50
    `).all(searchTerm, searchTerm, searchTerm);
  });
  ipcMain.handle("products:getByCategory", (_, category) => {
    return db2.prepare(`
      SELECT id, name, category, size, barcode, price, stock,
             low_stock_threshold as lowStockThreshold,
             created_at as createdAt, updated_at as updatedAt
      FROM products WHERE category = ? ORDER BY name
    `).all(category);
  });
  ipcMain.handle("products:create", (_, product) => {
    const stmt = db2.prepare(`
      INSERT INTO products (name, category, size, barcode, price, stock, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      product.name,
      product.category,
      product.size,
      product.barcode,
      product.price,
      product.stock,
      product.lowStockThreshold
    );
    return { id: result.lastInsertRowid, ...product };
  });
  ipcMain.handle("products:update", (_, product) => {
    const stmt = db2.prepare(`
      UPDATE products SET 
        name = ?, category = ?, size = ?, barcode = ?, 
        price = ?, stock = ?, low_stock_threshold = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      product.name,
      product.category,
      product.size,
      product.barcode,
      product.price,
      product.stock,
      product.lowStockThreshold,
      product.id
    );
    return product;
  });
  ipcMain.handle("products:delete", (_, id) => {
    db2.prepare("DELETE FROM products WHERE id = ?").run(id);
    return { success: true };
  });
  ipcMain.handle("products:updateStock", (_, id, quantity, changeType) => {
    const updateStmt = db2.prepare("UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    const logStmt = db2.prepare("INSERT INTO stock_log (product_id, change_type, quantity_change) VALUES (?, ?, ?)");
    db2.transaction(() => {
      updateStmt.run(quantity, id);
      logStmt.run(id, changeType, quantity);
    })();
    return { success: true };
  });
  ipcMain.handle("products:getLowStock", () => {
    return db2.prepare(`
      SELECT id, name, category, size, barcode, price, stock,
             low_stock_threshold as lowStockThreshold
      FROM products WHERE stock <= low_stock_threshold ORDER BY stock
    `).all();
  });
  ipcMain.handle("bills:create", (_, billData) => {
    var _a, _b;
    const { items, subtotal, discountPercent, discountAmount, total, paymentMode } = billData;
    const settings = db2.prepare("SELECT value FROM settings WHERE key = ?");
    const prefix = ((_a = settings.get("billPrefix")) == null ? void 0 : _a.value) || "VP-";
    const startNum = parseInt(((_b = settings.get("startingBillNumber")) == null ? void 0 : _b.value) || "1001");
    const lastBill = db2.prepare("SELECT bill_number FROM bills ORDER BY id DESC LIMIT 1").get();
    let nextNum = startNum;
    if (lastBill) {
      const lastNum = parseInt(lastBill.bill_number.replace(prefix, ""));
      nextNum = Math.max(lastNum + 1, startNum);
    }
    const billNumber = `${prefix}${nextNum}`;
    const insertBill = db2.prepare(`
      INSERT INTO bills (bill_number, subtotal, discount_percent, discount_amount, total, payment_mode)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db2.prepare(`
      INSERT INTO bill_items (bill_id, product_id, product_name, size, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStock = db2.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
    const logStock = db2.prepare("INSERT INTO stock_log (product_id, change_type, quantity_change, reference_id) VALUES (?, ?, ?, ?)");
    let billId = 0;
    db2.transaction(() => {
      const result = insertBill.run(billNumber, subtotal, discountPercent, discountAmount, total, paymentMode);
      billId = result.lastInsertRowid;
      for (const item of items) {
        insertItem.run(
          billId,
          item.product.id,
          item.product.name,
          item.product.size,
          item.quantity,
          item.product.price,
          item.product.price * item.quantity
        );
        updateStock.run(item.quantity, item.product.id);
        logStock.run(item.product.id, "sale", -item.quantity, billId);
      }
    })();
    return {
      id: billId,
      billNumber,
      subtotal,
      discountPercent,
      discountAmount,
      total,
      paymentMode,
      status: "completed",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  ipcMain.handle("bills:getAll", (_, dateFrom, dateTo) => {
    let query = `
      SELECT id, bill_number as billNumber, subtotal, 
             discount_percent as discountPercent, discount_amount as discountAmount,
             total, payment_mode as paymentMode, status, created_at as createdAt
      FROM bills WHERE status = 'completed'
    `;
    const params = [];
    if (dateFrom) {
      query += " AND date(created_at) >= date(?)";
      params.push(dateFrom);
    }
    if (dateTo) {
      query += " AND date(created_at) <= date(?)";
      params.push(dateTo);
    }
    query += " ORDER BY created_at DESC";
    return db2.prepare(query).all(...params);
  });
  ipcMain.handle("bills:getById", (_, id) => {
    const bill = db2.prepare(`
      SELECT id, bill_number as billNumber, subtotal,
             discount_percent as discountPercent, discount_amount as discountAmount,
             total, payment_mode as paymentMode, status, created_at as createdAt
      FROM bills WHERE id = ?
    `).get(id);
    const items = db2.prepare(`
      SELECT id, bill_id as billId, product_id as productId, product_name as productName,
             size, quantity, unit_price as unitPrice, total_price as totalPrice
      FROM bill_items WHERE bill_id = ?
    `).all(id);
    return { bill, items };
  });
  ipcMain.handle("bills:getDailySummary", (_, date) => {
    const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const summary = db2.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as totalSales,
        COUNT(*) as totalBills,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cashSales,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN total ELSE 0 END), 0) as upiSales
      FROM bills 
      WHERE date(created_at) = date(?) AND status = 'completed'
    `).get(targetDate);
    const itemsSold = db2.prepare(`
      SELECT COALESCE(SUM(bi.quantity), 0) as itemsSold
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE date(b.created_at) = date(?) AND b.status = 'completed'
    `).get(targetDate);
    return { ...summary, itemsSold: itemsSold.itemsSold };
  });
  ipcMain.handle("bills:getTopSelling", (_, date) => {
    const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    return db2.prepare(`
      SELECT bi.product_name as productName, bi.size, SUM(bi.quantity) as totalQty
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE date(b.created_at) = date(?) AND b.status = 'completed'
      GROUP BY bi.product_id
      ORDER BY totalQty DESC
      LIMIT 5
    `).all(targetDate);
  });
  ipcMain.handle("bills:getRecentBills", (_, limit = 5) => {
    return db2.prepare(`
      SELECT id, bill_number as billNumber, total, payment_mode as paymentMode,
             created_at as createdAt
      FROM bills WHERE status = 'completed'
      ORDER BY created_at DESC LIMIT ?
    `).all(limit);
  });
  ipcMain.handle("reports:getSalesReport", (_, dateFrom, dateTo) => {
    return db2.prepare(`
      SELECT 
        bi.product_name as productName,
        bi.size,
        p.category,
        SUM(bi.quantity) as quantitySold,
        SUM(bi.total_price) as totalAmount
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN products p ON bi.product_id = p.id
      WHERE date(b.created_at) >= date(?) AND date(b.created_at) <= date(?)
        AND b.status = 'completed'
      GROUP BY bi.product_id
      ORDER BY totalAmount DESC
    `).all(dateFrom, dateTo);
  });
  ipcMain.handle("reports:exportData", (_, dateFrom, dateTo) => {
    const bills = db2.prepare(`
      SELECT b.bill_number, b.created_at, bi.product_name, bi.size, 
             bi.quantity, bi.unit_price, bi.total_price
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE date(b.created_at) >= date(?) AND date(b.created_at) <= date(?)
        AND b.status = 'completed'
      ORDER BY b.created_at
    `).all(dateFrom, dateTo);
    return bills;
  });
  ipcMain.handle("settings:getAll", () => {
    const rows = db2.prepare("SELECT key, value FROM settings").all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  });
  ipcMain.handle("settings:update", (_, key, value) => {
    db2.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    return { success: true };
  });
  ipcMain.handle("settings:updateAll", (_, settings) => {
    const stmt = db2.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    db2.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, value);
      }
    })();
    return { success: true };
  });
  ipcMain.handle("backup:export", async () => {
    const win2 = BrowserWindow.getFocusedWindow();
    if (!win2) return { success: false, error: "No window" };
    const result = await dialog.showSaveDialog(win2, {
      title: "Export Database Backup",
      defaultPath: `vogue-prism-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.db`,
      filters: [{ name: "SQLite Database", extensions: ["db"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true };
    }
    try {
      const dbPath = getDbPath();
      fs.copyFileSync(dbPath, result.filePath);
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("backup:import", async () => {
    const win2 = BrowserWindow.getFocusedWindow();
    if (!win2) return { success: false, error: "No window" };
    const result = await dialog.showOpenDialog(win2, {
      title: "Import Database Backup",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    try {
      const dbPath = getDbPath();
      const backupPath = `${dbPath}.backup-${Date.now()}`;
      fs.copyFileSync(dbPath, backupPath);
      fs.copyFileSync(result.filePaths[0], dbPath);
      return { success: true, requiresRestart: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("printer:getList", async () => {
    const win2 = BrowserWindow.getFocusedWindow();
    if (!win2) return [];
    const printers = await win2.webContents.getPrintersAsync();
    return printers.map((p) => ({ name: p.name, isDefault: p.isDefault }));
  });
  ipcMain.handle("printer:print", async (_, content, printerName) => {
    const win2 = BrowserWindow.getFocusedWindow();
    if (!win2) return { success: false, error: "No window" };
    try {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: true }
      });
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      const options = {
        silent: true,
        printBackground: true,
        deviceName: printerName || void 0
      };
      printWin.webContents.print(options, (success, failureReason) => {
        printWin.close();
        if (!success) {
          console.error("Print failed:", failureReason);
        }
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(process.env.VITE_PUBLIC, "logo.png"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: "default",
    title: "Vogue Prism - Billing Software"
  });
  win.setMenuBarVisibility(false);
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  createWindow();
});
app.on("before-quit", () => {
  closeDatabase();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};

import { app, dialog, ipcMain, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import fs from "fs";
let db;
async function initDatabase() {
  const dbPath = path.join(app.getPath("userData"), "billing.db");
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      size TEXT,
      barcode TEXT UNIQUE,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      lowStockThreshold INTEGER NOT NULL DEFAULT 5,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billNumber TEXT NOT NULL UNIQUE,
      subtotal REAL NOT NULL,
      discountPercent REAL NOT NULL DEFAULT 0,
      discountAmount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      paymentMode TEXT NOT NULL CHECK (paymentMode IN ('cash', 'upi')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'held')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      productName TEXT NOT NULL,
      size TEXT,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      totalPrice REAL NOT NULL,
      FOREIGN KEY (billId) REFERENCES bills (id),
      FOREIGN KEY (productId) REFERENCES products (id)
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      changeType TEXT NOT NULL CHECK (changeType IN ('sale', 'restock', 'adjustment')),
      quantityChange INTEGER NOT NULL,
      referenceId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (productId) REFERENCES products (id)
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const defaultSettings = [
    ["storeName", "Vogue Prism"],
    ["addressLine1", ""],
    ["addressLine2", ""],
    ["phone", ""],
    ["gstNumber", ""],
    ["billPrefix", "VP"],
    ["startingBillNumber", "1"],
    ["maxDiscountPercent", "20"],
    ["lowStockThreshold", "5"],
    ["printerName", ""],
    ["paperWidth", "80mm"],
    ["autoPrint", "false"]
  ];
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
    CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(createdAt);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(billId);
    CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(productId);
  `);
  console.log("Database initialized at", dbPath);
}
function getDatabase() {
  if (!db) throw new Error("Database not initialized");
  return db;
}
async function closeDatabase() {
  if (db) {
    db.close();
    console.log("Database closed");
  }
}
function addProduct(data) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO products (name, category, size, barcode, price, stock, lowStockThreshold, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  const result = stmt.run(
    data.name,
    data.category,
    data.size || null,
    data.barcode || null,
    data.price,
    data.stock,
    data.lowStockThreshold
  );
  return result.lastInsertRowid;
}
function getProducts() {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products ORDER BY id DESC");
  return stmt.all();
}
function getProductById(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products WHERE id = ?");
  return stmt.get(id);
}
function getProductByBarcode(barcode) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products WHERE barcode = ?");
  return stmt.get(barcode);
}
function searchProducts(query) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM products 
    WHERE name LIKE ? OR barcode LIKE ? 
    ORDER BY name
  `);
  const searchTerm = `%${query}%`;
  return stmt.all(searchTerm, searchTerm);
}
function getProductsByCategory(category) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products WHERE category = ? ORDER BY name");
  return stmt.all(category);
}
function getLowStockProducts() {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM products 
    WHERE stock <= lowStockThreshold 
    ORDER BY stock ASC, name
  `);
  return stmt.all();
}
function updateProduct(id, data) {
  const db2 = getDatabase();
  const fields = [];
  const values = [];
  if (data.name !== void 0) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.category !== void 0) {
    fields.push("category = ?");
    values.push(data.category);
  }
  if (data.size !== void 0) {
    fields.push("size = ?");
    values.push(data.size || null);
  }
  if (data.barcode !== void 0) {
    fields.push("barcode = ?");
    values.push(data.barcode || null);
  }
  if (data.price !== void 0) {
    fields.push("price = ?");
    values.push(data.price);
  }
  if (data.stock !== void 0) {
    fields.push("stock = ?");
    values.push(data.stock);
  }
  if (data.lowStockThreshold !== void 0) {
    fields.push("lowStockThreshold = ?");
    values.push(data.lowStockThreshold);
  }
  fields.push("updatedAt = datetime('now')");
  values.push(id);
  const stmt = db2.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}
function updateStock(id, quantity, changeType, referenceId) {
  const db2 = getDatabase();
  const transaction = db2.transaction(() => {
    const updateStmt = db2.prepare(`
      UPDATE products 
      SET stock = stock + ?, updatedAt = datetime('now') 
      WHERE id = ?
    `);
    updateStmt.run(quantity, id);
    const logStmt = db2.prepare(`
      INSERT INTO stock_logs (productId, changeType, quantityChange, referenceId, createdAt)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    logStmt.run(id, changeType, quantity, referenceId || null);
  });
  transaction();
  return true;
}
function deleteProduct(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("DELETE FROM products WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}
function createBill(data) {
  const db2 = getDatabase();
  const transaction = db2.transaction(() => {
    const billNumber = generateBillNumber();
    const billStmt2 = db2.prepare(`
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const billResult = billStmt2.run(
      billNumber,
      data.subtotal,
      data.discountPercent,
      data.discountAmount,
      data.total,
      data.paymentMode
    );
    const billId2 = billResult.lastInsertRowid;
    const itemStmt = db2.prepare(`
      INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of data.items) {
      const totalPrice = item.product.price * item.quantity;
      itemStmt.run(
        billId2,
        item.product.id,
        item.product.name,
        item.product.size || null,
        item.quantity,
        item.product.price,
        totalPrice
      );
      updateStock(item.product.id, -item.quantity, "sale", billId2);
    }
    return billId2;
  });
  const billId = transaction();
  const billStmt = db2.prepare("SELECT * FROM bills WHERE id = ?");
  const bill = billStmt.get(billId);
  return bill;
}
function getBills(dateFrom, dateTo) {
  const db2 = getDatabase();
  let query = "SELECT * FROM bills";
  const params = [];
  if (dateFrom && dateTo) {
    query += " WHERE date(createdAt) BETWEEN ? AND ?";
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    query += " WHERE date(createdAt) >= ?";
    params.push(dateFrom);
  } else if (dateTo) {
    query += " WHERE date(createdAt) <= ?";
    params.push(dateTo);
  }
  query += " ORDER BY createdAt DESC";
  const stmt = db2.prepare(query);
  return stmt.all(...params);
}
function getBillById(id) {
  const db2 = getDatabase();
  const billStmt = db2.prepare("SELECT * FROM bills WHERE id = ?");
  const bill = billStmt.get(id);
  if (!bill) return null;
  const itemsStmt = db2.prepare("SELECT * FROM bill_items WHERE billId = ?");
  const items = itemsStmt.all(id);
  return { bill, items };
}
function getRecentBills(limit = 5) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM bills 
    ORDER BY createdAt DESC 
    LIMIT ?
  `);
  return stmt.all(limit);
}
function getDailySummary(date) {
  const db2 = getDatabase();
  const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const stmt = db2.prepare(`
    SELECT 
      COALESCE(SUM(total), 0) as totalSales,
      COUNT(*) as totalBills,
      COALESCE(SUM(CASE WHEN paymentMode = 'cash' THEN total ELSE 0 END), 0) as cashSales,
      COALESCE(SUM(CASE WHEN paymentMode = 'upi' THEN total ELSE 0 END), 0) as upiSales,
      COALESCE(SUM(
        (SELECT SUM(quantity) FROM bill_items WHERE billId = bills.id)
      ), 0) as itemsSold
    FROM bills 
    WHERE date(createdAt) = ?
  `);
  return stmt.get(targetDate);
}
function getTopSelling(date, limit = 5) {
  const db2 = getDatabase();
  const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const stmt = db2.prepare(`
    SELECT 
      bi.productName,
      bi.size,
      SUM(bi.quantity) as totalQty
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    WHERE date(b.createdAt) = ?
    GROUP BY bi.productName, bi.size
    ORDER BY totalQty DESC
    LIMIT ?
  `);
  return stmt.all(targetDate, limit);
}
function generateBillNumber() {
  var _a, _b;
  const db2 = getDatabase();
  const prefixStmt = db2.prepare("SELECT value FROM settings WHERE key = ?");
  const prefix = ((_a = prefixStmt.get("billPrefix")) == null ? void 0 : _a.value) || "VP";
  const startingStmt = db2.prepare("SELECT value FROM settings WHERE key = ?");
  const startingNumber = parseInt(((_b = startingStmt.get("startingBillNumber")) == null ? void 0 : _b.value) || "1");
  const lastBillStmt = db2.prepare(`
    SELECT billNumber FROM bills 
    WHERE billNumber LIKE ? 
    ORDER BY id DESC 
    LIMIT 1
  `);
  const lastBill = lastBillStmt.get(`${prefix}%`);
  let nextNumber = startingNumber;
  if (lastBill) {
    const lastNumber = parseInt(lastBill.billNumber.replace(prefix, ""));
    nextNumber = lastNumber + 1;
  }
  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}
function getSettings() {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT key, value FROM settings");
  const rows = stmt.all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}
function getSetting(key) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT value FROM settings WHERE key = ?");
  const result = stmt.get(key);
  return result == null ? void 0 : result.value;
}
function updateSetting(key, value) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updatedAt) 
    VALUES (?, ?, datetime('now'))
  `);
  const result = stmt.run(key, value);
  return result.changes > 0;
}
function updateAllSettings(settings) {
  const db2 = getDatabase();
  const transaction = db2.transaction(() => {
    const stmt = db2.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt) 
      VALUES (?, ?, datetime('now'))
    `);
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value);
    }
  });
  transaction();
  return true;
}
function getTypedSettings() {
  const settings = getSettings();
  return {
    storeName: settings.storeName || "Vogue Prism",
    addressLine1: settings.addressLine1 || "",
    addressLine2: settings.addressLine2 || "",
    phone: settings.phone || "",
    gstNumber: settings.gstNumber || "",
    billPrefix: settings.billPrefix || "VP",
    startingBillNumber: parseInt(settings.startingBillNumber || "1"),
    maxDiscountPercent: parseFloat(settings.maxDiscountPercent || "20"),
    lowStockThreshold: parseInt(settings.lowStockThreshold || "5"),
    printerName: settings.printerName || "",
    paperWidth: settings.paperWidth || "80mm",
    autoPrint: settings.autoPrint === "true"
  };
}
function getSalesReport(dateFrom, dateTo) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      bi.productName,
      bi.size,
      p.category,
      SUM(bi.quantity) as quantitySold,
      SUM(bi.totalPrice) as totalAmount
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi.productName, bi.size, p.category
    ORDER BY totalAmount DESC
  `);
  return stmt.all(dateFrom, dateTo);
}
function exportData(dateFrom, dateTo) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      b.billNumber as bill_number,
      b.createdAt as created_at,
      bi.productName as product_name,
      bi.size,
      bi.quantity,
      bi.unitPrice as unit_price,
      bi.totalPrice as total_price,
      b.paymentMode as payment_mode,
      b.total as bill_total
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    ORDER BY b.createdAt DESC, bi.id
  `);
  return stmt.all(dateFrom, dateTo);
}
function getStockMovementReport(dateFrom, dateTo) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      p.name as productName,
      p.size,
      p.category,
      sl.changeType,
      sl.quantityChange,
      sl.createdAt,
      CASE 
        WHEN sl.changeType = 'sale' THEN (
          SELECT b.billNumber FROM bills b WHERE b.id = sl.referenceId
        )
        ELSE NULL
      END as referenceNumber
    FROM stock_logs sl
    JOIN products p ON sl.productId = p.id
    WHERE date(sl.createdAt) BETWEEN ? AND ?
    ORDER BY sl.createdAt DESC
  `);
  return stmt.all(dateFrom, dateTo);
}
function getCategorySales(dateFrom, dateTo) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      p.category,
      COUNT(DISTINCT bi.productId) as uniqueProducts,
      SUM(bi.quantity) as totalQuantity,
      SUM(bi.totalPrice) as totalAmount
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY p.category
    ORDER BY totalAmount DESC
  `);
  return stmt.all(dateFrom, dateTo);
}
function getPaymentModeSummary(dateFrom, dateTo) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      paymentMode,
      COUNT(*) as billCount,
      SUM(total) as totalAmount,
      AVG(total) as averageAmount
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY paymentMode
  `);
  return stmt.all(dateFrom, dateTo);
}
function getHourlySales(date) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      strftime('%H', createdAt) as hour,
      COUNT(*) as billCount,
      SUM(total) as totalAmount
    FROM bills
    WHERE date(createdAt) = ?
    GROUP BY strftime('%H', createdAt)
    ORDER BY hour
  `);
  return stmt.all(date);
}
function getLowStockAlert() {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      id,
      name,
      category,
      size,
      stock,
      lowStockThreshold,
      (lowStockThreshold - stock) as shortfall
    FROM products
    WHERE stock <= lowStockThreshold
    ORDER BY shortfall DESC, name
  `);
  return stmt.all();
}
function getProductPerformance(dateFrom, dateTo, limit = 10) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      bi.productName,
      bi.size,
      p.category,
      p.price as currentPrice,
      COUNT(DISTINCT b.id) as billCount,
      SUM(bi.quantity) as totalQuantity,
      SUM(bi.totalPrice) as totalRevenue,
      AVG(bi.unitPrice) as averagePrice
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi.productName, bi.size
    ORDER BY totalRevenue DESC
    LIMIT ?
  `);
  return stmt.all(dateFrom, dateTo, limit);
}
async function exportBackup() {
  try {
    const db2 = getDatabase();
    const result = await dialog.showSaveDialog({
      title: "Export Database Backup",
      defaultPath: path.join(
        app.getPath("desktop"),
        `vogue-prism-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.sql`
      ),
      filters: [
        { name: "SQL Files", extensions: ["sql"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled) {
      return { success: false, cancelled: true };
    }
    const backup = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0",
      data: {
        products: db2.prepare("SELECT * FROM products ORDER BY id").all(),
        bills: db2.prepare("SELECT * FROM bills ORDER BY id").all(),
        bill_items: db2.prepare("SELECT * FROM bill_items ORDER BY id").all(),
        stock_logs: db2.prepare("SELECT * FROM stock_logs ORDER BY id").all(),
        settings: db2.prepare("SELECT * FROM settings ORDER BY key").all()
      }
    };
    let sqlContent = `-- Vogue Prism Database Backup
`;
    sqlContent += `-- Created: ${backup.timestamp}
`;
    sqlContent += `-- Version: ${backup.version}

`;
    const escapeValue = (value) => {
      if (value === null || value === void 0) {
        return "NULL";
      }
      if (typeof value === "string") {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return String(value);
    };
    const generateInserts = (tableName, rows) => {
      if (rows.length === 0) return "";
      const columns = Object.keys(rows[0]);
      let sql = `-- Table: ${tableName}
`;
      sql += `DELETE FROM ${tableName};
`;
      for (const row of rows) {
        const values = columns.map((col) => escapeValue(row[col])).join(", ");
        sql += `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values});
`;
      }
      sql += "\n";
      return sql;
    };
    sqlContent += generateInserts("settings", backup.data.settings);
    sqlContent += generateInserts("products", backup.data.products);
    sqlContent += generateInserts("bills", backup.data.bills);
    sqlContent += generateInserts("bill_items", backup.data.bill_items);
    sqlContent += generateInserts("stock_logs", backup.data.stock_logs);
    fs.writeFileSync(result.filePath, sqlContent, "utf8");
    return {
      success: true,
      path: result.filePath,
      recordCount: {
        products: backup.data.products.length,
        bills: backup.data.bills.length,
        bill_items: backup.data.bill_items.length,
        stock_logs: backup.data.stock_logs.length,
        settings: backup.data.settings.length
      }
    };
  } catch (error) {
    console.error("Backup export error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function importBackup() {
  try {
    const result = await dialog.showOpenDialog({
      title: "Import Database Backup",
      filters: [
        { name: "SQL Files", extensions: ["sql"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, cancelled: true };
    }
    const confirmResult = await dialog.showMessageBox({
      type: "warning",
      title: "Confirm Database Restore",
      message: "This will replace all current data with the backup data. This action cannot be undone.",
      detail: "Are you sure you want to continue?",
      buttons: ["Cancel", "Restore"],
      defaultId: 0,
      cancelId: 0
    });
    if (confirmResult.response === 0) {
      return { success: false, cancelled: true };
    }
    const db2 = getDatabase();
    const backupPath = result.filePaths[0];
    const sqlContent = fs.readFileSync(backupPath, "utf8");
    const transaction = db2.transaction(() => {
      db2.exec("PRAGMA foreign_keys = OFF;");
      const lines = sqlContent.split("\n");
      let currentStatement = "";
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("--")) {
          continue;
        }
        currentStatement += line + "\n";
        if (trimmedLine.endsWith(";")) {
          const statement = currentStatement.trim();
          if (statement && statement !== ";") {
            try {
              db2.exec(statement);
            } catch (error) {
              console.error("Error executing statement:", statement);
              console.error("Error:", error);
            }
          }
          currentStatement = "";
        }
      }
      db2.exec("PRAGMA foreign_keys = ON;");
    });
    transaction();
    return {
      success: true,
      requiresRestart: true,
      message: "Database restored successfully. Please restart the application."
    };
  } catch (error) {
    console.error("Backup import error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
function getDatabaseStats() {
  const db2 = getDatabase();
  const stats = {
    products: db2.prepare("SELECT COUNT(*) as count FROM products").get(),
    bills: db2.prepare("SELECT COUNT(*) as count FROM bills").get(),
    bill_items: db2.prepare("SELECT COUNT(*) as count FROM bill_items").get(),
    stock_logs: db2.prepare("SELECT COUNT(*) as count FROM stock_logs").get(),
    settings: db2.prepare("SELECT COUNT(*) as count FROM settings").get(),
    database_size: getDatabaseSize()
  };
  return stats;
}
function getDatabaseSize() {
  try {
    const dbPath = path.join(app.getPath("userData"), "billing.db");
    const stats = fs.statSync(dbPath);
    return {
      bytes: stats.size,
      mb: Math.round(stats.size / 1024 / 1024 * 100) / 100
    };
  } catch (error) {
    return { bytes: 0, mb: 0 };
  }
}
function setupIpcHandlers() {
  ipcMain.handle("products:create", async (_, product) => {
    try {
      const id = addProduct(product);
      return getProductById(Number(id));
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  });
  ipcMain.handle("products:getAll", async () => {
    try {
      return getProducts();
    } catch (error) {
      console.error("Error getting products:", error);
      throw error;
    }
  });
  ipcMain.handle("products:getById", async (_, id) => {
    try {
      return getProductById(id);
    } catch (error) {
      console.error("Error getting product by id:", error);
      throw error;
    }
  });
  ipcMain.handle("products:getByBarcode", async (_, barcode) => {
    try {
      return getProductByBarcode(barcode);
    } catch (error) {
      console.error("Error getting product by barcode:", error);
      throw error;
    }
  });
  ipcMain.handle("products:search", async (_, query) => {
    try {
      return searchProducts(query);
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  });
  ipcMain.handle("products:getByCategory", async (_, category) => {
    try {
      return getProductsByCategory(category);
    } catch (error) {
      console.error("Error getting products by category:", error);
      throw error;
    }
  });
  ipcMain.handle("products:getLowStock", async () => {
    try {
      return getLowStockProducts();
    } catch (error) {
      console.error("Error getting low stock products:", error);
      throw error;
    }
  });
  ipcMain.handle("products:update", async (_, product) => {
    try {
      const { id, ...data } = product;
      const success = updateProduct(id, data);
      if (success) {
        return getProductById(id);
      }
      throw new Error("Product not found");
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  });
  ipcMain.handle("products:updateStock", async (_, id, quantity, changeType) => {
    try {
      const success = updateStock(id, quantity, changeType);
      return { success };
    } catch (error) {
      console.error("Error updating stock:", error);
      throw error;
    }
  });
  ipcMain.handle("products:delete", async (_, id) => {
    try {
      const success = deleteProduct(id);
      if (!success) {
        throw new Error("Product not found");
      }
      return { success: true };
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:create", async (_, billData) => {
    try {
      console.log("Creating bill with data:", billData);
      const result = createBill(billData);
      console.log("Bill created successfully:", result);
      return result;
    } catch (error) {
      console.error("Error creating bill:", error);
      console.error("Bill data that caused error:", billData);
      throw new Error(`Failed to create bill: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });
  ipcMain.handle("bills:getAll", async (_, dateFrom, dateTo) => {
    try {
      return getBills(dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting bills:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:getById", async (_, id) => {
    try {
      return getBillById(id);
    } catch (error) {
      console.error("Error getting bill by id:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:getRecent", async (_, limit) => {
    try {
      return getRecentBills(limit);
    } catch (error) {
      console.error("Error getting recent bills:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:getDailySummary", async (_, date) => {
    try {
      return getDailySummary(date);
    } catch (error) {
      console.error("Error getting daily summary:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:getTopSelling", async (_, date) => {
    try {
      return getTopSelling(date);
    } catch (error) {
      console.error("Error getting top selling:", error);
      throw error;
    }
  });
  ipcMain.handle("settings:getAll", async () => {
    try {
      return getSettings();
    } catch (error) {
      console.error("Error getting settings:", error);
      throw error;
    }
  });
  ipcMain.handle("settings:get", async (_, key) => {
    try {
      return getSetting(key);
    } catch (error) {
      console.error("Error getting setting:", error);
      throw error;
    }
  });
  ipcMain.handle("settings:update", async (_, key, value) => {
    try {
      const success = updateSetting(key, value);
      return { success };
    } catch (error) {
      console.error("Error updating setting:", error);
      throw error;
    }
  });
  ipcMain.handle("settings:updateAll", async (_, settings) => {
    try {
      const success = updateAllSettings(settings);
      return { success };
    } catch (error) {
      console.error("Error updating all settings:", error);
      throw error;
    }
  });
  ipcMain.handle("settings:getTyped", async () => {
    try {
      return getTypedSettings();
    } catch (error) {
      console.error("Error getting typed settings:", error);
      throw error;
    }
  });
  ipcMain.handle("reports:getSales", async (_, dateFrom, dateTo) => {
    try {
      return getSalesReport(dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting sales report:", error);
      throw error;
    }
  });
  ipcMain.handle("reports:exportData", async (_, dateFrom, dateTo) => {
    try {
      return exportData(dateFrom, dateTo);
    } catch (error) {
      console.error("Error exporting data:", error);
      throw error;
    }
  });
  ipcMain.handle("reports:getStockMovement", async (_, dateFrom, dateTo) => {
    try {
      return getStockMovementReport(dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting stock movement report:", error);
      throw error;
    }
  });
  ipcMain.handle("reports:getCategorySales", async (_, dateFrom, dateTo) => {
    try {
      return getCategorySales(dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting category sales:", error);
      throw error;
    }
  });
  ipcMain.handle("reports:getPaymentModeSummary", async (_, dateFrom, dateTo) => {
    try {
      return getPaymentModeSummary(dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting payment mode summary:", error);
      throw error;
    }
  });
  ipcMain.handle("reports:getHourlySales", async (_, date) => {
    try {
      return getHourlySales(date);
    } catch (error) {
      console.error("Error getting hourly sales:", error);
      throw error;
    }
  });
  ipcMain.handle("reports:getLowStockAlert", async () => {
    try {
      return getLowStockAlert();
    } catch (error) {
      console.error("Error getting low stock alert:", error);
      throw error;
    }
  });
  ipcMain.handle("reports:getProductPerformance", async (_, dateFrom, dateTo, limit) => {
    try {
      return getProductPerformance(dateFrom, dateTo, limit);
    } catch (error) {
      console.error("Error getting product performance:", error);
      throw error;
    }
  });
  ipcMain.handle("backup:export", async () => {
    try {
      return await exportBackup();
    } catch (error) {
      console.error("Error exporting backup:", error);
      throw error;
    }
  });
  ipcMain.handle("backup:import", async () => {
    try {
      return await importBackup();
    } catch (error) {
      console.error("Error importing backup:", error);
      throw error;
    }
  });
  ipcMain.handle("backup:getStats", async () => {
    try {
      return getDatabaseStats();
    } catch (error) {
      console.error("Error getting database stats:", error);
      throw error;
    }
  });
  ipcMain.handle("printer:getList", async () => {
    try {
      return [
        { name: "Default Printer", isDefault: true },
        { name: "Thermal Printer", isDefault: false }
      ];
    } catch (error) {
      console.error("Error getting printers:", error);
      throw error;
    }
  });
  ipcMain.handle("printer:print", async (_, content, printerName) => {
    try {
      console.log("Print content:", content);
      console.log("Printer:", printerName || "default");
      return { success: true };
    } catch (error) {
      console.error("Error printing:", error);
      return { success: false, error: error instanceof Error ? error.message : "Print failed" };
    }
  });
  console.log("All IPC handlers set up successfully");
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: "default",
    title: "Vogue Prism - Billing Software"
  });
  win.setMenuBarVisibility(false);
  if (process.env["VITE_DEV_SERVER_URL"]) {
    win.loadURL(process.env["VITE_DEV_SERVER_URL"]);
  } else {
    win.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(async () => {
  await initDatabase();
  setupIpcHandlers();
  createWindow();
});
app.on("before-quit", async () => {
  await closeDatabase();
});

import { app, dialog, ipcMain, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { exec } from "child_process";
import { promisify } from "util";
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
      costPrice REAL DEFAULT 0,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      lowStockThreshold INTEGER NOT NULL DEFAULT 5,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
  try {
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const hasIsActive = tableInfo.some((column) => column.name === "isActive");
    if (!hasIsActive) {
      console.log("Adding isActive column to products table...");
      db.exec("ALTER TABLE products ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1");
      console.log("Migration completed: isActive column added");
    }
    const hasCostPrice = tableInfo.some((column) => column.name === "costPrice");
    if (!hasCostPrice) {
      console.log("Adding costPrice column to products table...");
      db.exec("ALTER TABLE products ADD COLUMN costPrice REAL DEFAULT 0");
      console.log("Migration completed: costPrice column added");
    }
  } catch (error) {
    console.error("Migration error:", error);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL CHECK (entityType IN ('product', 'bill', 'setting', 'system')),
      entityId INTEGER,
      details TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT,
      userId TEXT DEFAULT 'system',
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
  try {
    const billsTableInfo = db.prepare("PRAGMA table_info(bills)").all();
    const hasCashAmount = billsTableInfo.some((column) => column.name === "cashAmount");
    const hasUpiAmount = billsTableInfo.some((column) => column.name === "upiAmount");
    if (!hasCashAmount) {
      console.log("Adding cashAmount column to bills table...");
      db.exec("ALTER TABLE bills ADD COLUMN cashAmount REAL DEFAULT 0");
    }
    if (!hasUpiAmount) {
      console.log("Adding upiAmount column to bills table...");
      db.exec("ALTER TABLE bills ADD COLUMN upiAmount REAL DEFAULT 0");
    }
    try {
      const testStmt = db.prepare(`
        INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount)
        VALUES ('TEST_MIXED', 100, 0, 0, 100, 'mixed', 50, 50)
      `);
      testStmt.run();
      db.exec("DELETE FROM bills WHERE billNumber = 'TEST_MIXED'");
      console.log("Mixed payment mode already supported");
    } catch (constraintError) {
      console.log("Updating bills table to support mixed payment mode...");
      db.exec("PRAGMA foreign_keys = OFF;");
      db.exec("DROP TABLE IF EXISTS bills_backup;");
      db.exec(`
        CREATE TABLE bills_backup AS SELECT * FROM bills;
      `);
      db.exec("DROP TABLE bills;");
      db.exec(`
        CREATE TABLE bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          billNumber TEXT NOT NULL UNIQUE,
          subtotal REAL NOT NULL,
          discountPercent REAL NOT NULL DEFAULT 0,
          discountAmount REAL NOT NULL DEFAULT 0,
          total REAL NOT NULL,
          paymentMode TEXT NOT NULL CHECK (paymentMode IN ('cash', 'upi', 'mixed')),
          cashAmount REAL DEFAULT 0,
          upiAmount REAL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'held')),
          createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
      `);
      db.exec(`
        INSERT INTO bills (id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, status, createdAt)
        SELECT id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, 
               COALESCE(cashAmount, 0), COALESCE(upiAmount, 0), status, createdAt
        FROM bills_backup;
      `);
      db.exec("DROP TABLE bills_backup;");
      db.exec("PRAGMA foreign_keys = ON;");
      console.log("Bills table updated to support mixed payment mode");
    }
    if (!hasCashAmount || !hasUpiAmount) {
      console.log("Migration completed: payment columns added");
    }
  } catch (error) {
    console.error("Bills migration error:", error);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billNumber TEXT NOT NULL UNIQUE,
      subtotal REAL NOT NULL,
      discountPercent REAL NOT NULL DEFAULT 0,
      discountAmount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      paymentMode TEXT NOT NULL CHECK (paymentMode IN ('cash', 'upi', 'mixed')),
      cashAmount REAL DEFAULT 0,
      upiAmount REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'held')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
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
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (productId) REFERENCES products (id)
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
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
function addActivityLog(action, entityType, details, entityId, oldValue, newValue, userId) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO activity_logs (action, entityType, entityId, details, oldValue, newValue, userId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);
  const result = stmt.run(
    action,
    entityType,
    entityId || null,
    details,
    oldValue || null,
    newValue || null,
    "system"
  );
  return result.lastInsertRowid;
}
function getActivityLogs(limit = 100, offset = 0, entityType, dateFrom, dateTo) {
  const db2 = getDatabase();
  let query = "SELECT * FROM activity_logs";
  const params = [];
  const conditions = [];
  if (entityType) {
    conditions.push("entityType = ?");
    params.push(entityType);
  }
  if (dateFrom) {
    conditions.push("date(createdAt) >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("date(createdAt) <= ?");
    params.push(dateTo);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const stmt = db2.prepare(query);
  return stmt.all(...params);
}
function getLogsCount(entityType, dateFrom, dateTo) {
  const db2 = getDatabase();
  let query = "SELECT COUNT(*) as count FROM activity_logs";
  const params = [];
  const conditions = [];
  if (entityType) {
    conditions.push("entityType = ?");
    params.push(entityType);
  }
  if (dateFrom) {
    conditions.push("date(createdAt) >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("date(createdAt) <= ?");
    params.push(dateTo);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  const stmt = db2.prepare(query);
  return stmt.get(...params);
}
function cleanupOldLogs() {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    DELETE FROM activity_logs 
    WHERE id NOT IN (
      SELECT id FROM activity_logs 
      ORDER BY createdAt DESC 
      LIMIT 1000
    )
  `);
  const result = stmt.run();
  return result.changes;
}
function addProduct(data) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO products (name, category, size, barcode, costPrice, price, stock, lowStockThreshold, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `);
  const result = stmt.run(
    data.name,
    data.category,
    data.size || null,
    data.barcode || null,
    data.costPrice || 0,
    data.price,
    data.stock,
    data.lowStockThreshold,
    data.isActive !== false ? 1 : 0
  );
  const productId = result.lastInsertRowid;
  addActivityLog(
    "create",
    "product",
    `Created product: ${data.name}`,
    productId,
    void 0,
    JSON.stringify(data)
  );
  return productId;
}
function getProducts(includeInactive = false) {
  const db2 = getDatabase();
  let query = "SELECT * FROM products";
  if (!includeInactive) {
    query += " WHERE (isActive = 1 OR isActive IS NULL)";
  }
  query += " ORDER BY id DESC";
  const stmt = db2.prepare(query);
  const results = stmt.all();
  return results.map((product) => ({
    ...product,
    isActive: product.isActive === null ? true : Boolean(product.isActive)
  }));
}
function getProductById(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products WHERE id = ?");
  const result = stmt.get(id);
  if (result) {
    return {
      ...result,
      isActive: result.isActive === null ? true : Boolean(result.isActive)
    };
  }
  return result;
}
function getProductByBarcode(barcode) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products WHERE barcode = ?");
  const result = stmt.get(barcode);
  if (result) {
    return {
      ...result,
      isActive: result.isActive === null ? true : Boolean(result.isActive)
    };
  }
  return result;
}
function searchProducts(query) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM products 
    WHERE (name LIKE ? OR barcode LIKE ?) AND (isActive = 1 OR isActive IS NULL)
    ORDER BY name
  `);
  const searchTerm = `%${query}%`;
  const results = stmt.all(searchTerm, searchTerm);
  return results.map((product) => ({
    ...product,
    isActive: product.isActive === null ? true : Boolean(product.isActive)
  }));
}
function getProductsByCategory(category) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products WHERE category = ? AND (isActive = 1 OR isActive IS NULL) ORDER BY name");
  const results = stmt.all(category);
  return results.map((product) => ({
    ...product,
    isActive: product.isActive === null ? true : Boolean(product.isActive)
  }));
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
  const oldProduct = getProductById(id);
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
  if (data.costPrice !== void 0) {
    fields.push("costPrice = ?");
    values.push(data.costPrice);
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
  if (data.isActive !== void 0) {
    fields.push("isActive = ?");
    values.push(data.isActive ? 1 : 0);
  }
  fields.push("updatedAt = datetime('now')");
  values.push(id);
  const stmt = db2.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`);
  const result = stmt.run(...values);
  if (result.changes > 0 && oldProduct) {
    addActivityLog(
      "update",
      "product",
      `Updated product: ${oldProduct.name}`,
      id,
      JSON.stringify(oldProduct),
      JSON.stringify(data)
    );
  }
  return result.changes > 0;
}
function updateStock(id, quantity, changeType, referenceId) {
  const db2 = getDatabase();
  const product = getProductById(id);
  const transaction = db2.transaction(() => {
    const updateStmt = db2.prepare(`
      UPDATE products 
      SET stock = stock + ?, updatedAt = datetime('now', 'localtime') 
      WHERE id = ?
    `);
    updateStmt.run(quantity, id);
    const logStmt = db2.prepare(`
      INSERT INTO stock_logs (productId, changeType, quantityChange, referenceId, createdAt)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    logStmt.run(id, changeType, quantity, referenceId || null);
  });
  transaction();
  if (product) {
    const action = changeType === "sale" ? "Stock reduced (sale)" : changeType === "restock" ? "Stock increased (restock)" : "Stock adjusted";
    addActivityLog(
      "update",
      "product",
      `${action}: ${product.name} - Quantity: ${quantity > 0 ? "+" : ""}${quantity}`,
      id,
      void 0,
      JSON.stringify({ changeType, quantity, referenceId })
    );
  }
  return true;
}
function deleteProduct(id, forceDeactivate = false) {
  const db2 = getDatabase();
  const product = getProductById(id);
  const billCheckStmt = db2.prepare(`
    SELECT COUNT(*) as count FROM bill_items WHERE productId = ?
  `);
  const billCheck = billCheckStmt.get(id);
  if (billCheck.count > 0) {
    if (forceDeactivate) {
      const deactivateStmt = db2.prepare(`
        UPDATE products 
        SET isActive = 0, updatedAt = datetime('now', 'localtime') 
        WHERE id = ?
      `);
      const result = deactivateStmt.run(id);
      if (result.changes > 0 && product) {
        addActivityLog(
          "deactivate",
          "product",
          `Deactivated product: ${product.name} (referenced in ${billCheck.count} bills)`,
          id,
          JSON.stringify(product),
          void 0
        );
      }
      return {
        success: result.changes > 0,
        deactivated: true,
        message: "Product deactivated successfully (was referenced in bills)"
      };
    } else {
      throw new Error(`Cannot delete product. It is referenced in ${billCheck.count} bill(s). Use deactivate option instead.`);
    }
  }
  const transaction = db2.transaction(() => {
    const deleteLogsStmt = db2.prepare("DELETE FROM stock_logs WHERE productId = ?");
    deleteLogsStmt.run(id);
    const deleteProductStmt = db2.prepare("DELETE FROM products WHERE id = ?");
    const result = deleteProductStmt.run(id);
    if (result.changes === 0) {
      throw new Error("Product not found");
    }
    return result.changes > 0;
  });
  const success = transaction();
  if (success && product) {
    addActivityLog(
      "delete",
      "product",
      `Deleted product: ${product.name}`,
      id,
      JSON.stringify(product),
      void 0
    );
  }
  return { success, deleted: true, message: "Product deleted successfully" };
}
function deactivateProduct(id) {
  return deleteProduct(id, true);
}
function reactivateProduct(id) {
  const db2 = getDatabase();
  const product = getProductById(id);
  const stmt = db2.prepare(`
    UPDATE products 
    SET isActive = 1, updatedAt = datetime('now', 'localtime') 
    WHERE id = ?
  `);
  const result = stmt.run(id);
  if (result.changes > 0 && product) {
    addActivityLog(
      "reactivate",
      "product",
      `Reactivated product: ${product.name}`,
      id,
      void 0,
      JSON.stringify({ isActive: true })
    );
  }
  return result.changes > 0;
}
function createBill(data) {
  const db2 = getDatabase();
  const billNumber = generateBillNumber();
  const transaction = db2.transaction(() => {
    const billStmt2 = db2.prepare(`
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    const billResult = billStmt2.run(
      billNumber,
      data.subtotal,
      data.discountPercent,
      data.discountAmount,
      data.total,
      data.paymentMode,
      data.cashAmount || 0,
      data.upiAmount || 0
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
  addActivityLog(
    "create",
    "bill",
    `Created bill: ${billNumber} - Total: ₹${data.total} (${data.paymentMode})`,
    billId,
    void 0,
    JSON.stringify({
      billNumber,
      total: data.total,
      paymentMode: data.paymentMode,
      itemCount: data.items.length
    })
  );
  return bill;
}
function getBills(dateFrom, dateTo, searchQuery) {
  const db2 = getDatabase();
  let query = "SELECT * FROM bills";
  const params = [];
  const conditions = [];
  if (dateFrom && dateTo) {
    conditions.push("date(createdAt) BETWEEN ? AND ?");
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    conditions.push("date(createdAt) >= ?");
    params.push(dateFrom);
  } else if (dateTo) {
    conditions.push("date(createdAt) <= ?");
    params.push(dateTo);
  }
  if (searchQuery && searchQuery.trim()) {
    conditions.push("(billNumber LIKE ? OR customerMobileNumber LIKE ?)");
    const searchTerm = `%${searchQuery.trim()}%`;
    params.push(searchTerm, searchTerm);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
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
      COALESCE(SUM(
        CASE 
          WHEN paymentMode = 'cash' THEN total
          WHEN paymentMode = 'mixed' THEN COALESCE(cashAmount, 0)
          ELSE 0 
        END
      ), 0) as cashSales,
      COALESCE(SUM(
        CASE 
          WHEN paymentMode = 'upi' THEN total
          WHEN paymentMode = 'mixed' THEN COALESCE(upiAmount, 0)
          ELSE 0 
        END
      ), 0) as upiSales,
      COALESCE(SUM(
        (SELECT SUM(quantity) FROM bill_items WHERE billId = bills.id)
      ), 0) as itemsSold
    FROM bills 
    WHERE date(createdAt) = ?
  `);
  const result = stmt.get(targetDate);
  if (!result || result.totalBills === 0) {
    return {
      totalSales: 0,
      totalBills: 0,
      cashSales: 0,
      upiSales: 0,
      itemsSold: 0
    };
  }
  return result;
}
function getDateRangeSummary(dateFrom, dateTo) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT 
      COALESCE(SUM(total), 0) as totalSales,
      COUNT(*) as totalBills,
      COALESCE(SUM(
        CASE 
          WHEN paymentMode = 'cash' THEN total
          WHEN paymentMode = 'mixed' THEN COALESCE(cashAmount, 0)
          ELSE 0 
        END
      ), 0) as cashSales,
      COALESCE(SUM(
        CASE 
          WHEN paymentMode = 'upi' THEN total
          WHEN paymentMode = 'mixed' THEN COALESCE(upiAmount, 0)
          ELSE 0 
        END
      ), 0) as upiSales,
      COALESCE(SUM(
        (SELECT SUM(quantity) FROM bill_items WHERE billId = bills.id)
      ), 0) as itemsSold
    FROM bills 
    WHERE date(createdAt) BETWEEN ? AND ?
  `);
  const result = stmt.get(dateFrom, dateTo);
  if (!result || result.totalBills === 0) {
    return {
      totalSales: 0,
      totalBills: 0,
      cashSales: 0,
      upiSales: 0,
      itemsSold: 0
    };
  }
  return result;
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
function updateBill(billId, data) {
  const db2 = getDatabase();
  const originalBill = getBillById(billId);
  if (!originalBill) {
    throw new Error("Bill not found");
  }
  const transaction = db2.transaction(() => {
    if (data.items) {
      const oldItemsStmt = db2.prepare("SELECT * FROM bill_items WHERE billId = ?");
      const oldItems = oldItemsStmt.all(billId);
      for (const oldItem of oldItems) {
        updateStock(oldItem.productId, oldItem.quantity, "adjustment");
      }
      db2.prepare("DELETE FROM bill_items WHERE billId = ?").run(billId);
      const itemStmt = db2.prepare(`
        INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of data.items) {
        const totalPrice = item.product.price * item.quantity;
        itemStmt.run(
          billId,
          item.product.id,
          item.product.name,
          item.product.size || null,
          item.quantity,
          item.product.price,
          totalPrice
        );
        updateStock(item.product.id, -item.quantity, "sale", billId);
      }
    }
    const updateFields = [];
    const updateValues = [];
    if (data.subtotal !== void 0) {
      updateFields.push("subtotal = ?");
      updateValues.push(data.subtotal);
    }
    if (data.discountPercent !== void 0) {
      updateFields.push("discountPercent = ?");
      updateValues.push(data.discountPercent);
    }
    if (data.discountAmount !== void 0) {
      updateFields.push("discountAmount = ?");
      updateValues.push(data.discountAmount);
    }
    if (data.total !== void 0) {
      updateFields.push("total = ?");
      updateValues.push(data.total);
    }
    if (data.paymentMode !== void 0) {
      updateFields.push("paymentMode = ?");
      updateValues.push(data.paymentMode);
    }
    if (data.cashAmount !== void 0) {
      updateFields.push("cashAmount = ?");
      updateValues.push(data.cashAmount);
    }
    if (data.upiAmount !== void 0) {
      updateFields.push("upiAmount = ?");
      updateValues.push(data.upiAmount);
    }
    if (updateFields.length > 0) {
      updateValues.push(billId);
      const updateStmt = db2.prepare(`
        UPDATE bills SET ${updateFields.join(", ")} WHERE id = ?
      `);
      updateStmt.run(...updateValues);
    }
  });
  transaction();
  addActivityLog(
    "update",
    "bill",
    `Updated bill: ${originalBill.bill.billNumber}`,
    billId,
    JSON.stringify(originalBill),
    JSON.stringify(data)
  );
  return getBillById(billId);
}
function deleteBill(billId) {
  const db2 = getDatabase();
  const billData = getBillById(billId);
  if (!billData) {
    throw new Error("Bill not found");
  }
  const transaction = db2.transaction(() => {
    const itemsStmt = db2.prepare("SELECT * FROM bill_items WHERE billId = ?");
    const items = itemsStmt.all(billId);
    for (const item of items) {
      updateStock(item.productId, item.quantity, "adjustment");
    }
    db2.prepare("DELETE FROM bill_items WHERE billId = ?").run(billId);
    db2.prepare("DELETE FROM bills WHERE id = ?").run(billId);
  });
  transaction();
  addActivityLog(
    "delete",
    "bill",
    `Deleted bill: ${billData.bill.billNumber} - Total: ₹${billData.bill.total}`,
    billId,
    JSON.stringify(billData),
    void 0
  );
  return { success: true, message: "Bill deleted and stock restored" };
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
  const oldValue = getSetting(key);
  const stmt = db2.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updatedAt) 
    VALUES (?, ?, datetime('now', 'localtime'))
  `);
  const result = stmt.run(key, value);
  if (result.changes > 0) {
    addActivityLog(
      "update",
      "setting",
      `Updated setting: ${key}`,
      void 0,
      oldValue,
      value
    );
  }
  return result.changes > 0;
}
function updateAllSettings(settings) {
  const db2 = getDatabase();
  const oldSettings = getSettings();
  const transaction = db2.transaction(() => {
    const stmt = db2.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt) 
      VALUES (?, ?, datetime('now', 'localtime'))
    `);
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value);
    }
  });
  transaction();
  addActivityLog(
    "update",
    "setting",
    `Updated multiple settings: ${Object.keys(settings).join(", ")}`,
    void 0,
    JSON.stringify(oldSettings),
    JSON.stringify(settings)
  );
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
      b.subtotal,
      b.discountPercent as discount_rate,
      b.discountAmount as discount_amount,
      b.total as final_total,
      b.paymentMode as payment_mode,
      b.cashAmount as cash_amount,
      b.upiAmount as upi_amount
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
  const printerHandlers = [
    "printer:getList",
    "printer:refresh",
    "printer:getStatus",
    "printer:testPrint",
    "printer:print",
    "printer:getSettings",
    "printer:setSettings"
  ];
  printerHandlers.forEach((handler) => {
    try {
      ipcMain.removeHandler(handler);
    } catch (error) {
    }
  });
  ipcMain.handle("products:create", async (_, product) => {
    try {
      const id = addProduct(product);
      return getProductById(Number(id));
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  });
  ipcMain.handle("products:getAll", async (_, includeInactive) => {
    try {
      return getProducts(includeInactive);
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
  ipcMain.handle("products:delete", async (_, id, forceDeactivate) => {
    try {
      const result = deleteProduct(id, forceDeactivate);
      return result;
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  });
  ipcMain.handle("products:deactivate", async (_, id) => {
    try {
      const result = deactivateProduct(id);
      return result;
    } catch (error) {
      console.error("Error deactivating product:", error);
      throw error;
    }
  });
  ipcMain.handle("products:reactivate", async (_, id) => {
    try {
      const success = reactivateProduct(id);
      return { success };
    } catch (error) {
      console.error("Error reactivating product:", error);
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
  ipcMain.handle("bills:getAll", async (_, dateFrom, dateTo, searchQuery) => {
    try {
      return getBills(dateFrom, dateTo, searchQuery);
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
  ipcMain.handle("bills:getDateRangeSummary", async (_, dateFrom, dateTo) => {
    try {
      return getDateRangeSummary(dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting date range summary:", error);
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
  ipcMain.handle("bills:update", async (_, billId, billData) => {
    try {
      return updateBill(billId, billData);
    } catch (error) {
      console.error("Error updating bill:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:delete", async (_, billId) => {
    try {
      return deleteBill(billId);
    } catch (error) {
      console.error("Error deleting bill:", error);
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
  const execAsync = promisify(exec);
  const discoverPrinters = async () => {
    var _a, _b, _c, _d, _e, _f;
    const printers = [];
    const isWindows = process.platform === "win32";
    if (isWindows) {
      try {
        const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Default | ConvertTo-Json"');
        const windowsPrinters = JSON.parse(stdout);
        const printerList = Array.isArray(windowsPrinters) ? windowsPrinters : [windowsPrinters];
        for (const printer of printerList) {
          if (!printer || !printer.Name) continue;
          let status = "unknown";
          switch (printer.PrinterStatus) {
            case 0:
              status = "idle";
              break;
            case 1:
              status = "paused";
              break;
            case 2:
              status = "error";
              break;
            case 3:
              status = "pending_deletion";
              break;
            case 4:
              status = "paper_jam";
              break;
            case 5:
              status = "paper_out";
              break;
            case 6:
              status = "manual_feed";
              break;
            case 7:
              status = "paper_problem";
              break;
            case 8:
              status = "offline";
              break;
            default:
              status = "idle";
          }
          const name = printer.Name;
          const isNetworkPrinter = ((_a = printer.PortName) == null ? void 0 : _a.includes("\\\\")) || ((_b = printer.PortName) == null ? void 0 : _b.includes("IP_"));
          printers.push({
            name,
            displayName: name,
            description: printer.DriverName || "Windows Printer",
            location: isNetworkPrinter ? "Network" : "Local",
            status,
            isDefault: printer.Default === true,
            deviceUri: printer.PortName || "",
            makeModel: printer.DriverName || "",
            paperSize: name.toLowerCase().includes("80") || name.toLowerCase().includes("pos") ? "80mm" : name.toLowerCase().includes("58") ? "58mm" : "Unknown",
            driverName: printer.DriverName || "",
            isNetworkPrinter,
            capabilities: []
          });
        }
        console.log(`Found ${printers.length} Windows printers`);
      } catch (winError) {
        console.error("Error getting Windows printers via PowerShell:", winError);
        try {
          const { stdout: wmicOutput } = await execAsync("wmic printer get Name,DriverName,PortName,Default /format:csv");
          const lines = wmicOutput.split("\n").filter((line) => line.trim() && !line.startsWith("Node"));
          for (const line of lines) {
            const parts = line.split(",");
            if (parts.length >= 4) {
              const isDefault = ((_c = parts[1]) == null ? void 0 : _c.trim().toLowerCase()) === "true";
              const driverName = ((_d = parts[2]) == null ? void 0 : _d.trim()) || "";
              const name = ((_e = parts[3]) == null ? void 0 : _e.trim()) || "";
              const portName = ((_f = parts[4]) == null ? void 0 : _f.trim()) || "";
              if (name) {
                printers.push({
                  name,
                  displayName: name,
                  description: driverName || "Windows Printer",
                  location: (portName == null ? void 0 : portName.includes("\\\\")) ? "Network" : "Local",
                  status: "idle",
                  isDefault,
                  deviceUri: portName,
                  makeModel: driverName,
                  paperSize: name.toLowerCase().includes("80") || name.toLowerCase().includes("pos") ? "80mm" : "Unknown",
                  driverName,
                  isNetworkPrinter: (portName == null ? void 0 : portName.includes("\\\\")) || false,
                  capabilities: []
                });
              }
            }
          }
          console.log(`Found ${printers.length} Windows printers via WMIC`);
        } catch (wmicError) {
          console.error("Error getting Windows printers via WMIC:", wmicError);
        }
      }
    } else {
      try {
        const { stdout: cupsOutput } = await execAsync("lpstat -p -d");
        const lines = cupsOutput.split("\n").filter((line) => line.trim());
        let defaultPrinter = "";
        const printerLines = [];
        for (const line of lines) {
          if (line.startsWith("system default destination:")) {
            defaultPrinter = line.split(":")[1].trim();
          } else if (line.startsWith("printer ")) {
            printerLines.push(line);
          }
        }
        for (const line of printerLines) {
          const match = line.match(/printer (\S+) (.+)/);
          if (match) {
            const name = match[1];
            const description = match[2];
            try {
              const { stdout: detailsOutput } = await execAsync(`lpoptions -p ${name} -l`);
              const { stdout: statusOutput } = await execAsync(`lpstat -p ${name}`);
              let status = "unknown";
              if (statusOutput.includes("is idle")) status = "idle";
              else if (statusOutput.includes("is printing")) status = "printing";
              else if (statusOutput.includes("disabled")) status = "offline";
              let deviceUri = "";
              let makeModel = "";
              try {
                const { stdout: uriOutput } = await execAsync(`lpoptions -p ${name} | grep device-uri`);
                const uriMatch = uriOutput.match(/device-uri=(\S+)/);
                if (uriMatch) deviceUri = uriMatch[1];
              } catch (e) {
              }
              try {
                const { stdout: modelOutput } = await execAsync(`lpoptions -p ${name} | grep printer-make-and-model`);
                const modelMatch = modelOutput.match(/printer-make-and-model=(.+)/);
                if (modelMatch) makeModel = modelMatch[1];
              } catch (e) {
              }
              printers.push({
                name,
                displayName: name,
                description: description.replace(/is\s+(idle|printing|disabled).*/, "").trim(),
                location: deviceUri.includes("usb://") ? "USB" : deviceUri.includes("network://") ? "Network" : "Local",
                status,
                isDefault: name === defaultPrinter,
                deviceUri,
                makeModel,
                paperSize: name.toLowerCase().includes("80") ? "80mm" : name.toLowerCase().includes("58") ? "58mm" : "Unknown",
                driverName: makeModel,
                isNetworkPrinter: deviceUri.includes("ipp://") || deviceUri.includes("http://") || deviceUri.includes("socket://"),
                capabilities: detailsOutput.split("\n").filter((line2) => line2.includes("/")).map((line2) => line2.split("/")[0])
              });
            } catch (detailError) {
              printers.push({
                name,
                displayName: name,
                description: description.replace(/is\s+(idle|printing|disabled).*/, "").trim(),
                location: "Unknown",
                status: "unknown",
                isDefault: name === defaultPrinter,
                deviceUri: "",
                makeModel: "",
                paperSize: "Unknown",
                driverName: "",
                isNetworkPrinter: false,
                capabilities: []
              });
            }
          }
        }
      } catch (cupsError) {
        console.log("CUPS not available");
      }
    }
    if (printers.length === 0) {
      printers.push({
        name: "Default",
        displayName: "Default Printer",
        description: "System Default Printer",
        location: "System",
        status: "unknown",
        isDefault: true,
        deviceUri: "",
        makeModel: "",
        paperSize: "Unknown",
        driverName: "",
        isNetworkPrinter: false,
        capabilities: []
      });
    }
    return printers;
  };
  ipcMain.handle("printer:getList", async () => {
    try {
      return await discoverPrinters();
    } catch (error) {
      console.error("Error getting printers:", error);
      return [{
        name: "Default",
        displayName: "Default Printer",
        description: "System Default Printer",
        location: "System",
        status: "unknown",
        isDefault: true,
        deviceUri: "",
        makeModel: "",
        paperSize: "Unknown",
        driverName: "",
        isNetworkPrinter: false,
        capabilities: []
      }];
    }
  });
  ipcMain.handle("printer:refresh", async () => {
    try {
      return await discoverPrinters();
    } catch (error) {
      console.error("Error refreshing printers:", error);
      return [{
        name: "Default",
        displayName: "Default Printer",
        description: "System Default Printer",
        location: "System",
        status: "unknown",
        isDefault: true,
        deviceUri: "",
        makeModel: "",
        paperSize: "Unknown",
        driverName: "",
        isNetworkPrinter: false,
        capabilities: []
      }];
    }
  });
  ipcMain.handle("printer:getStatus", async (_, printerName) => {
    try {
      const isWindows = process.platform === "win32";
      if (isWindows) {
        const escapedPrinter = printerName.replace(/'/g, "''");
        const { stdout } = await execAsync(`powershell -Command "(Get-Printer -Name '${escapedPrinter}').PrinterStatus"`);
        const statusCode = parseInt(stdout.trim(), 10);
        let status = "unknown";
        let details = `Printer: ${printerName}`;
        switch (statusCode) {
          case 0:
            status = "idle";
            details = "Printer is ready";
            break;
          case 1:
            status = "paused";
            details = "Printer is paused";
            break;
          case 2:
            status = "error";
            details = "Printer has an error";
            break;
          case 3:
            status = "pending_deletion";
            details = "Printer pending deletion";
            break;
          case 4:
            status = "paper_jam";
            details = "Paper jam";
            break;
          case 5:
            status = "paper_out";
            details = "Out of paper";
            break;
          case 6:
            status = "manual_feed";
            details = "Manual feed required";
            break;
          case 7:
            status = "paper_problem";
            details = "Paper problem";
            break;
          case 8:
            status = "offline";
            details = "Printer is offline";
            break;
          default:
            status = "idle";
            details = "Printer is ready";
        }
        return { status, details };
      } else {
        const { stdout } = await execAsync(`lpstat -p ${printerName}`);
        let status = "unknown";
        let details = stdout.trim();
        if (stdout.includes("is idle")) {
          status = "idle";
        } else if (stdout.includes("is printing")) {
          status = "printing";
        } else if (stdout.includes("disabled")) {
          status = "offline";
        }
        return { status, details };
      }
    } catch (error) {
      return { status: "error", details: `Error checking printer status: ${error}` };
    }
  });
  ipcMain.handle("printer:testPrint", async (_, printerName, customContent) => {
    try {
      const isWindows = process.platform === "win32";
      let content = customContent || `================================================
                  VOGUE PRISM
================================================
                Test Address
              Ph: +91 9876543210
             GST: 12ABCDE3456F7GH
------------------------------------------------
Bill: TEST-001                  ${(/* @__PURE__ */ new Date()).toLocaleDateString()}
------------------------------------------------
Item                             Qty   Total
------------------------------------------------
Sample Product                     2  Rs.200.00
Test Item                          1  Rs.150.00
------------------------------------------------
Subtotal:                           Rs.350.00
================================================
TOTAL:                              Rs.350.00
================================================
Payment:                                CASH
================================================
         Thank you for your business!
               Visit again!
================================================



`;
      content = content.replace(/₹/g, "Rs.");
      const escInit = Buffer.from([27, 64]);
      const escWakeUp = Buffer.from([27, 61, 1]);
      const escAlign = Buffer.from([27, 97, 0]);
      const escFont = Buffer.from([27, 33, 0]);
      const escLineSpacing = Buffer.from([27, 51, 32]);
      const escCharSet = Buffer.from([27, 82, 0]);
      const feedLines = Buffer.from([10, 10, 10, 10]);
      const partialCut = Buffer.from([29, 86, 1]);
      const fullCut = Buffer.from([29, 86, 0]);
      const fs2 = await import("fs");
      const path2 = await import("path");
      const os = await import("os");
      const tempFile = path2.join(os.tmpdir(), `print-${Date.now()}.txt`);
      const contentBuffer = Buffer.from(content, "ascii");
      const finalBuffer = Buffer.concat([
        escInit,
        // Initialize printer
        escWakeUp,
        // Wake up printer
        escAlign,
        // Set alignment
        escFont,
        // Set font
        escLineSpacing,
        // Set line spacing
        escCharSet,
        // Set character set
        contentBuffer,
        // Receipt content
        feedLines,
        // Feed paper
        partialCut
        // Cut paper (partial cut is more reliable)
      ]);
      fs2.writeFileSync(tempFile, finalBuffer);
      if (isWindows) {
        const escapedPrinter = printerName.replace(/'/g, "''").replace(/"/g, '""');
        try {
          let portName = "UNKNOWN";
          try {
            const { stdout: portInfo } = await execAsync(`powershell -Command "try { (Get-Printer -Name '${escapedPrinter}').PortName } catch { 'UNKNOWN' }"`);
            portName = portInfo.trim();
          } catch (e) {
            console.log("Could not get port name");
          }
          console.log(`Windows printer: ${printerName}, Port: ${portName}`);
          let printSuccess = false;
          let lastError = "";
          console.log("Trying Method 1: .NET RawPrinterHelper...");
          try {
            const psScript1 = `
$ErrorActionPreference = 'Stop'
$printerName = '${escapedPrinter}'
$filePath = '${tempFile.replace(/\\/g, "\\\\")}'

Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrint {
    [StructLayout(LayoutKind.Sequential)]
    public struct DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static int Print(string printerName, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Receipt";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            return Marshal.GetLastWin32Error();
        }

        if (!StartDocPrinter(hPrinter, 1, ref di)) {
            int err = Marshal.GetLastWin32Error();
            ClosePrinter(hPrinter);
            return err;
        }

        if (!StartPagePrinter(hPrinter)) {
            int err = Marshal.GetLastWin32Error();
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return err;
        }

        int written = 0;
        if (!WritePrinter(hPrinter, data, data.Length, out written)) {
            int err = Marshal.GetLastWin32Error();
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return err;
        }

        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return 0;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrint]::Print($printerName, $bytes)
if ($result -eq 0) {
    Write-Output "SUCCESS"
} else {
    Write-Output "ERROR:$result"
}
`;
            const psFile1 = path2.join(os.tmpdir(), `print1-${Date.now()}.ps1`);
            fs2.writeFileSync(psFile1, psScript1, "utf8");
            const { stdout: result1 } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile1}"`, { timeout: 3e4 });
            setTimeout(() => {
              try {
                fs2.unlinkSync(psFile1);
              } catch (e) {
              }
            }, 1e3);
            if (result1.trim().includes("SUCCESS")) {
              printSuccess = true;
              console.log("✓ Method 1 succeeded");
            } else {
              lastError = result1.trim();
              console.log(`Method 1 failed: ${lastError}`);
            }
          } catch (e) {
            lastError = e.message;
            console.log(`Method 1 exception: ${e.message}`);
          }
          if (!printSuccess) {
            console.log("Trying Method 2: Windows print command...");
            try {
              await execAsync(`print /D:"${printerName}" "${tempFile}"`, { timeout: 15e3 });
              printSuccess = true;
              console.log("✓ Method 2 succeeded");
            } catch (e) {
              lastError = e.message;
              console.log(`Method 2 failed: ${e.message}`);
            }
          }
          if (!printSuccess) {
            console.log("Trying Method 3: Out-Printer...");
            try {
              const textContent = content.replace(/'/g, "''");
              await execAsync(`powershell -Command "'${textContent}' | Out-Printer -Name '${escapedPrinter}'"`, { timeout: 15e3 });
              printSuccess = true;
              console.log("✓ Method 3 succeeded");
            } catch (e) {
              lastError = e.message;
              console.log(`Method 3 failed: ${e.message}`);
            }
          }
          if (!printSuccess) {
            console.log("Trying Method 4: Copy to printer...");
            try {
              await execAsync(`copy /b "${tempFile}" "\\\\%COMPUTERNAME%\\${printerName}"`, { timeout: 15e3 });
              printSuccess = true;
              console.log("✓ Method 4 succeeded");
            } catch (e) {
              lastError = e.message;
              console.log(`Method 4 failed: ${e.message}`);
            }
          }
          if (!printSuccess) {
            throw new Error(`All print methods failed. Last error: ${lastError}`);
          }
          console.log("✓ Successfully printed to Windows printer");
        } catch (error) {
          console.error("❌ Windows printing error:", error);
          throw error;
        }
      } else {
        await execAsync(`lp -d "${printerName}" -o raw "${tempFile}"`);
      }
      setTimeout(() => {
        try {
          fs2.unlinkSync(tempFile);
        } catch (e) {
        }
      }, 5e3);
      return { success: true };
    } catch (error) {
      console.error("Print error:", error);
      return { success: false, error: `Print failed: ${error}` };
    }
  });
  ipcMain.handle("printer:debugTest", async (_, printerName) => {
    try {
      const isWindows = process.platform === "win32";
      const fs2 = await import("fs");
      const path2 = await import("path");
      const os = await import("os");
      const simpleText = `
PRINTER TEST
============
Time: ${(/* @__PURE__ */ new Date()).toLocaleString()}
Printer: ${printerName}
============
If you see this, printing works!


`;
      const tempFile = path2.join(os.tmpdir(), `debug-${Date.now()}.txt`);
      fs2.writeFileSync(tempFile, simpleText, "ascii");
      console.log(`Debug test - Printer: ${printerName}, Platform: ${process.platform}`);
      if (isWindows) {
        const escapedPrinter = printerName.replace(/'/g, "''").replace(/"/g, '""');
        try {
          console.log("Trying Windows raw print...");
          const psScript = `
$ErrorActionPreference = 'Stop'
$printerName = '${escapedPrinter}'
$filePath = '${tempFile.replace(/\\/g, "\\\\")}'

Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrint {
    [StructLayout(LayoutKind.Sequential)]
    public struct DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static int Print(string printerName, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Debug Test";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            return Marshal.GetLastWin32Error();
        }

        if (!StartDocPrinter(hPrinter, 1, ref di)) {
            int err = Marshal.GetLastWin32Error();
            ClosePrinter(hPrinter);
            return err;
        }

        if (!StartPagePrinter(hPrinter)) {
            int err = Marshal.GetLastWin32Error();
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return err;
        }

        int written = 0;
        if (!WritePrinter(hPrinter, data, data.Length, out written)) {
            int err = Marshal.GetLastWin32Error();
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return err;
        }

        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return 0;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrint]::Print($printerName, $bytes)
if ($result -eq 0) {
    Write-Output "SUCCESS"
} else {
    Write-Output "ERROR:$result"
}
`;
          const psFile = path2.join(os.tmpdir(), `debugprint-${Date.now()}.ps1`);
          fs2.writeFileSync(psFile, psScript, "utf8");
          const { stdout: result } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 3e4 });
          setTimeout(() => {
            try {
              fs2.unlinkSync(psFile);
            } catch (e) {
            }
          }, 1e3);
          if (result.trim().includes("SUCCESS")) {
            console.log("Windows raw print succeeded");
            setTimeout(() => {
              try {
                fs2.unlinkSync(tempFile);
              } catch (e) {
              }
            }, 2e3);
            return { success: true, message: "Debug test sent successfully" };
          } else {
            console.log(`Windows raw print failed: ${result.trim()}`);
          }
        } catch (e) {
          console.log(`Windows print exception: ${e.message}`);
        }
        console.log("Trying Out-Printer...");
        try {
          const textContent = simpleText.replace(/'/g, "''");
          await execAsync(`powershell -Command "'${textContent}' | Out-Printer -Name '${escapedPrinter}'"`, { timeout: 15e3 });
          console.log("Out-Printer succeeded");
          setTimeout(() => {
            try {
              fs2.unlinkSync(tempFile);
            } catch (e) {
            }
          }, 2e3);
          return { success: true, message: "Debug test sent successfully" };
        } catch (e) {
          console.log(`Out-Printer failed: ${e.message}`);
        }
        setTimeout(() => {
          try {
            fs2.unlinkSync(tempFile);
          } catch (e) {
          }
        }, 2e3);
        return { success: false, error: "All Windows print methods failed" };
      } else {
        console.log("Trying Linux print methods...");
        try {
          const { stdout: printerInfo } = await execAsync(`lpstat -p "${printerName}" 2>&1`);
          console.log("Printer status:", printerInfo.trim());
        } catch (e) {
          console.log("Could not get printer status");
        }
        try {
          await execAsync(`lp -d "${printerName}" -o raw "${tempFile}"`);
          console.log("lp -o raw succeeded");
          setTimeout(() => {
            try {
              fs2.unlinkSync(tempFile);
            } catch (e) {
            }
          }, 2e3);
          return { success: true, message: "Debug test sent via lp -o raw" };
        } catch (e) {
          console.log("lp -o raw failed:", e.message);
        }
        try {
          await execAsync(`lp -d "${printerName}" "${tempFile}"`);
          console.log("lp succeeded");
          setTimeout(() => {
            try {
              fs2.unlinkSync(tempFile);
            } catch (e) {
            }
          }, 2e3);
          return { success: true, message: "Debug test sent via lp" };
        } catch (e) {
          console.log("lp failed:", e.message);
        }
        try {
          await execAsync(`lpr -P "${printerName}" "${tempFile}"`);
          console.log("lpr succeeded");
          setTimeout(() => {
            try {
              fs2.unlinkSync(tempFile);
            } catch (e) {
            }
          }, 2e3);
          return { success: true, message: "Debug test sent via lpr" };
        } catch (e) {
          console.log("lpr failed:", e.message);
        }
        try {
          await execAsync(`echo "${simpleText}" | lp -d "${printerName}"`);
          console.log("echo | lp succeeded");
          setTimeout(() => {
            try {
              fs2.unlinkSync(tempFile);
            } catch (e) {
            }
          }, 2e3);
          return { success: true, message: "Debug test sent via echo | lp" };
        } catch (e) {
          console.log("echo | lp failed:", e.message);
        }
        setTimeout(() => {
          try {
            fs2.unlinkSync(tempFile);
          } catch (e) {
          }
        }, 2e3);
        return { success: false, error: "All Linux print methods failed. Check CUPS configuration and printer permissions." };
      }
    } catch (error) {
      console.error("Debug test error:", error);
      return { success: false, error: `Debug test error: ${error}` };
    }
  });
  ipcMain.handle("printer:print", async (_, content, printerName, options) => {
    try {
      const { BrowserWindow: BrowserWindow2 } = await import("electron");
      const printWindow = new BrowserWindow2({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      const printOptions = {
        silent: true,
        printBackground: true,
        deviceName: printerName || void 0,
        margins: {
          marginType: "none"
        },
        pageSize: "A4"
      };
      const success = await printWindow.webContents.print(printOptions);
      printWindow.close();
      return { success: true };
    } catch (error) {
      console.error("Error printing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Print failed"
      };
    }
  });
  ipcMain.handle("logs:getActivity", async (_, limit, offset, entityType, dateFrom, dateTo) => {
    try {
      return getActivityLogs(limit, offset, entityType, dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting activity logs:", error);
      throw error;
    }
  });
  ipcMain.handle("logs:getCount", async (_, entityType, dateFrom, dateTo) => {
    try {
      return getLogsCount(entityType, dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting logs count:", error);
      throw error;
    }
  });
  ipcMain.handle("logs:cleanup", async () => {
    try {
      const deletedCount = cleanupOldLogs();
      return { success: true, deletedCount };
    } catch (error) {
      console.error("Error cleaning up logs:", error);
      throw error;
    }
  });
  ipcMain.handle("printer:getSettings", async () => {
    try {
      const settings = getSettings();
      return {
        selectedPrinter: settings.selectedPrinter || "",
        paperWidth: settings.paperWidth || "80mm",
        autoPrint: settings.autoPrint === "true",
        printDensity: settings.printDensity || "medium",
        cutPaper: settings.cutPaper === "true",
        printSpeed: settings.printSpeed || "medium",
        encoding: settings.encoding || "utf8"
      };
    } catch (error) {
      console.error("Error getting printer settings:", error);
      return {
        selectedPrinter: "",
        paperWidth: "80mm",
        autoPrint: false,
        printDensity: "medium",
        cutPaper: true,
        printSpeed: "medium",
        encoding: "utf8"
      };
    }
  });
  ipcMain.handle("printer:setSettings", async (_, settings) => {
    try {
      const settingsToUpdate = {};
      if (settings.selectedPrinter !== void 0) settingsToUpdate.selectedPrinter = settings.selectedPrinter;
      if (settings.paperWidth !== void 0) settingsToUpdate.paperWidth = settings.paperWidth;
      if (settings.autoPrint !== void 0) settingsToUpdate.autoPrint = settings.autoPrint.toString();
      if (settings.printDensity !== void 0) settingsToUpdate.printDensity = settings.printDensity;
      if (settings.cutPaper !== void 0) settingsToUpdate.cutPaper = settings.cutPaper.toString();
      if (settings.printSpeed !== void 0) settingsToUpdate.printSpeed = settings.printSpeed;
      if (settings.encoding !== void 0) settingsToUpdate.encoding = settings.encoding;
      updateAllSettings(settingsToUpdate);
      return { success: true };
    } catch (error) {
      console.error("Error saving printer settings:", error);
      return { success: false, error: `Failed to save printer settings: ${error}` };
    }
  });
  ipcMain.handle("printer:fastPrint", async (_, printerName, content) => {
    try {
      const isWindows = process.platform === "win32";
      content = content.replace(/₹/g, "Rs.");
      const fs2 = await import("fs");
      const path2 = await import("path");
      const os = await import("os");
      const tempFile = path2.join(os.tmpdir(), `fastprint-${Date.now()}.txt`);
      if (isWindows) {
        const escapedPrinter = printerName.replace(/"/g, '""');
        try {
          const { stdout: portInfo } = await execAsync(`powershell -Command "try { (Get-Printer -Name '${escapedPrinter}').PortName } catch { 'UNKNOWN' }"`);
          const portName = portInfo.trim();
          if (portName && (portName.includes("USB") || portName.includes("COM") || portName.includes("LPT"))) {
            const escInit = Buffer.from([27, 64]);
            const escAlign = Buffer.from([27, 97, 0]);
            const contentBuffer = Buffer.from(content, "ascii");
            const feedCut = Buffer.from([10, 10, 10, 10, 29, 86, 1]);
            const finalBuffer = Buffer.concat([escInit, escAlign, contentBuffer, feedCut]);
            fs2.writeFileSync(tempFile, finalBuffer);
            await execAsync(`copy "${tempFile}" "${portName}" /B`, { timeout: 8e3 });
            setTimeout(() => {
              try {
                fs2.unlinkSync(tempFile);
              } catch (e) {
              }
            }, 1e3);
            return { success: true };
          }
        } catch (portError) {
          console.log("Port method failed:", portError.message);
        }
        try {
          const escInit = Buffer.from([27, 64]);
          const contentBuffer = Buffer.from(content, "ascii");
          const feedCut = Buffer.from([10, 10, 10, 29, 86, 1]);
          const finalBuffer = Buffer.concat([escInit, contentBuffer, feedCut]);
          fs2.writeFileSync(tempFile, finalBuffer);
          const psScript = `
$printerName = "${escapedPrinter}"
$filePath = "${tempFile.replace(/\\/g, "\\\\")}"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$printer = New-Object -ComObject WScript.Network
$printer.SetDefaultPrinter($printerName)
$shell = New-Object -ComObject WScript.Shell
$shell.Run("notepad /p \\"$filePath\\"", 0, $true)
`;
          const psFile = path2.join(os.tmpdir(), `fastprint-${Date.now()}.ps1`);
          fs2.writeFileSync(psFile, psScript, "utf8");
          await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 8e3 });
          setTimeout(() => {
            try {
              fs2.unlinkSync(tempFile);
              fs2.unlinkSync(psFile);
            } catch (e) {
            }
          }, 2e3);
          return { success: true };
        } catch (psError) {
          console.log("PowerShell method failed:", psError.message);
        }
        try {
          fs2.writeFileSync(tempFile, content, "utf8");
          await execAsync(`print "${tempFile}"`, { timeout: 8e3 });
          setTimeout(() => {
            try {
              fs2.unlinkSync(tempFile);
            } catch (e) {
            }
          }, 1e3);
          return { success: true };
        } catch (printError) {
          return { success: false, error: "All fast print methods failed" };
        }
      } else {
        try {
          const escInit = Buffer.from([27, 64]);
          const contentBuffer = Buffer.from(content, "ascii");
          const feedCut = Buffer.from([10, 10, 10, 29, 86, 1]);
          const finalBuffer = Buffer.concat([escInit, contentBuffer, feedCut]);
          fs2.writeFileSync(tempFile, finalBuffer);
          await execAsync(`lp -d "${printerName}" -o raw "${tempFile}"`, { timeout: 8e3 });
          setTimeout(() => {
            try {
              fs2.unlinkSync(tempFile);
            } catch (e) {
            }
          }, 1e3);
          return { success: true };
        } catch (error) {
          return { success: false, error: "Fast print failed: " + error.message };
        }
      }
    } catch (error) {
      return { success: false, error: String(error) };
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

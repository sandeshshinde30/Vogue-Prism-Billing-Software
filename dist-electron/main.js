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
    const hasIsDiscountLocked = tableInfo.some((column) => column.name === "isDiscountLocked");
    if (!hasIsDiscountLocked) {
      console.log("Adding isDiscountLocked column to products table...");
      db.exec("ALTER TABLE products ADD COLUMN isDiscountLocked INTEGER NOT NULL DEFAULT 0");
      console.log("Migration completed: isDiscountLocked column added");
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
          customerMobileNumber TEXT,
          status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'held')),
          createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
      `);
      db.exec(`
        INSERT INTO bills (id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, customerMobileNumber, status, createdAt)
        SELECT id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, 
               COALESCE(cashAmount, 0), COALESCE(upiAmount, 0), NULL as customerMobileNumber, status, createdAt
        FROM bills_backup;
      `);
      db.exec("DROP TABLE bills_backup;");
      db.exec("PRAGMA foreign_keys = ON;");
      console.log("Bills table updated to support mixed payment mode");
    }
    if (!hasCashAmount || !hasUpiAmount) {
      console.log("Migration completed: payment columns added");
    }
    const hasCustomerMobile = billsTableInfo.some((column) => column.name === "customerMobileNumber");
    if (!hasCustomerMobile) {
      console.log("Adding customerMobileNumber column to bills table...");
      db.exec("ALTER TABLE bills ADD COLUMN customerMobileNumber TEXT");
      console.log("Migration completed: customerMobileNumber column added");
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
      customerMobileNumber TEXT,
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
      discountLocked INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (billId) REFERENCES bills (id),
      FOREIGN KEY (productId) REFERENCES products (id)
    );
  `);
  try {
    const billItemsTableInfo = db.prepare("PRAGMA table_info(bill_items)").all();
    const hasDiscountLocked = billItemsTableInfo.some((column) => column.name === "discountLocked");
    if (!hasDiscountLocked) {
      console.log("Adding discountLocked column to bill_items table...");
      db.exec("ALTER TABLE bill_items ADD COLUMN discountLocked INTEGER NOT NULL DEFAULT 0");
      console.log("Migration completed: discountLocked column added");
    }
  } catch (error) {
    console.error("Bill items migration error:", error);
  }
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS deleted_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      originalBillId INTEGER NOT NULL,
      billNumber TEXT NOT NULL,
      billData TEXT NOT NULL,
      itemsData TEXT NOT NULL,
      deletedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      deletedBy TEXT DEFAULT 'system',
      reason TEXT
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS combos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      comboPrice REAL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE TABLE IF NOT EXISTS combo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comboId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (comboId) REFERENCES combos(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    );
  `);
  try {
    const combosInfo = db.prepare("PRAGMA table_info(combos)").all();
    const hasComboPrice = combosInfo.some((col) => col.name === "comboPrice");
    if (!hasComboPrice) {
      db.exec("ALTER TABLE combos ADD COLUMN comboPrice REAL");
    }
  } catch (e) {
  }
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
    INSERT INTO products (name, category, size, barcode, costPrice, price, stock, lowStockThreshold, isActive, isDiscountLocked, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
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
    data.isActive !== false ? 1 : 0,
    data.isDiscountLocked ? 1 : 0
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
    isActive: product.isActive === null ? true : Boolean(product.isActive),
    isDiscountLocked: Boolean(product.isDiscountLocked)
  }));
}
function getProductById(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products WHERE id = ?");
  const result = stmt.get(id);
  if (result) {
    return {
      ...result,
      isActive: result.isActive === null ? true : Boolean(result.isActive),
      isDiscountLocked: Boolean(result.isDiscountLocked)
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
      isActive: result.isActive === null ? true : Boolean(result.isActive),
      isDiscountLocked: Boolean(result.isDiscountLocked)
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
    isActive: product.isActive === null ? true : Boolean(product.isActive),
    isDiscountLocked: Boolean(product.isDiscountLocked)
  }));
}
function getProductsByCategory(category) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM products WHERE category = ? AND (isActive = 1 OR isActive IS NULL) ORDER BY name");
  const results = stmt.all(category);
  return results.map((product) => ({
    ...product,
    isActive: product.isActive === null ? true : Boolean(product.isActive),
    isDiscountLocked: Boolean(product.isDiscountLocked)
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
  if (data.isDiscountLocked !== void 0) {
    fields.push("isDiscountLocked = ?");
    values.push(data.isDiscountLocked ? 1 : 0);
  }
  fields.push("updatedAt = datetime('now')");
  values.push(id);
  const stmt = db2.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`);
  const result = stmt.run(...values);
  if (result.changes > 0 && oldProduct) {
    const changes = [];
    if (data.name !== void 0 && data.name !== oldProduct.name) {
      changes.push(`Name: "${oldProduct.name}" → "${data.name}"`);
    }
    if (data.category !== void 0 && data.category !== oldProduct.category) {
      changes.push(`Category: "${oldProduct.category}" → "${data.category}"`);
    }
    if (data.size !== void 0 && data.size !== oldProduct.size) {
      changes.push(`Size: "${oldProduct.size || "None"}" → "${data.size || "None"}"`);
    }
    if (data.barcode !== void 0 && data.barcode !== oldProduct.barcode) {
      changes.push(`Barcode: "${oldProduct.barcode || "None"}" → "${data.barcode || "None"}"`);
    }
    if (data.costPrice !== void 0 && data.costPrice !== oldProduct.costPrice) {
      changes.push(`Cost Price: ₹${oldProduct.costPrice} → ₹${data.costPrice}`);
    }
    if (data.price !== void 0 && data.price !== oldProduct.price) {
      changes.push(`Price: ₹${oldProduct.price} → ₹${data.price}`);
    }
    if (data.stock !== void 0 && data.stock !== oldProduct.stock) {
      changes.push(`Stock: ${oldProduct.stock} → ${data.stock}`);
    }
    if (data.lowStockThreshold !== void 0 && data.lowStockThreshold !== oldProduct.lowStockThreshold) {
      changes.push(`Low Stock Alert: ${oldProduct.lowStockThreshold} → ${data.lowStockThreshold}`);
    }
    const detailsText = changes.length > 0 ? `Updated ${oldProduct.name}: ${changes.join(", ")}` : `Updated product: ${oldProduct.name}`;
    addActivityLog(
      "update",
      "product",
      detailsText,
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
    const oldStock = product.stock;
    const newStock = oldStock + quantity;
    const action = changeType === "sale" ? "Stock reduced (sale)" : changeType === "restock" ? "Stock increased (restock)" : "Stock adjusted";
    addActivityLog(
      "update",
      "product",
      `${action}: ${product.name} - Stock: ${oldStock} → ${newStock} (${quantity > 0 ? "+" : ""}${quantity})`,
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
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, customerMobileNumber, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    const billResult = billStmt2.run(
      billNumber,
      data.subtotal,
      data.discountPercent,
      data.discountAmount,
      data.total,
      data.paymentMode,
      data.cashAmount || 0,
      data.upiAmount || 0,
      data.customerMobileNumber || null
    );
    const billId2 = billResult.lastInsertRowid;
    const itemStmt = db2.prepare(`
      INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice, discountLocked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        totalPrice,
        item.discountLocked ? 1 : 0
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
  console.log("Bills query:", query, "params:", params);
  try {
    const stmt = db2.prepare(query);
    const results = stmt.all(...params);
    console.log("Bills query results:", results.length, "bills found");
    return results;
  } catch (error) {
    console.error("Error executing bills query:", error);
    throw error;
  }
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
  const checkStmt = db2.prepare("SELECT COUNT(*) as count FROM bills WHERE billNumber = ?");
  let billNumber = `${prefix}${nextNumber.toString().padStart(4, "0")}`;
  while (checkStmt.get(billNumber).count > 0) {
    nextNumber++;
    billNumber = `${prefix}${nextNumber.toString().padStart(4, "0")}`;
  }
  return billNumber;
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
        INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice, discountLocked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
          totalPrice,
          item.discountLocked ? 1 : 0
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
function deleteBill(billId, reason) {
  const db2 = getDatabase();
  const billData = getBillById(billId);
  if (!billData) {
    throw new Error("Bill not found");
  }
  const transaction = db2.transaction(() => {
    const deletedBillStmt = db2.prepare(`
      INSERT INTO deleted_bills (originalBillId, billNumber, billData, itemsData, deletedAt, deletedBy, reason)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)
    `);
    deletedBillStmt.run(
      billId,
      billData.bill.billNumber,
      JSON.stringify(billData.bill),
      JSON.stringify(billData.items),
      "system",
      reason || "Deleted by user"
    );
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
    `Deleted bill: ${billData.bill.billNumber} - Total: ₹${billData.bill.total}${reason ? ` - Reason: ${reason}` : ""}`,
    billId,
    JSON.stringify(billData),
    void 0
  );
  return { success: true, message: "Bill deleted and saved to deleted bills" };
}
function getDeletedBills(limit = 100, offset = 0) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM deleted_bills 
    ORDER BY deletedAt DESC 
    LIMIT ? OFFSET ?
  `);
  return stmt.all(limit, offset);
}
function getDeletedBillById(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare("SELECT * FROM deleted_bills WHERE id = ?");
  return stmt.get(id);
}
function restoreDeletedBill(deletedBillId) {
  const db2 = getDatabase();
  const deletedBill = getDeletedBillById(deletedBillId);
  if (!deletedBill) {
    throw new Error("Deleted bill not found");
  }
  const billData = JSON.parse(deletedBill.billData);
  const itemsData = JSON.parse(deletedBill.itemsData);
  const transaction = db2.transaction(() => {
    const billStmt = db2.prepare(`
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, customerMobileNumber, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const billResult = billStmt.run(
      billData.billNumber + "-RESTORED",
      billData.subtotal,
      billData.discountPercent,
      billData.discountAmount,
      billData.total,
      billData.paymentMode,
      billData.cashAmount || 0,
      billData.upiAmount || 0,
      billData.customerMobileNumber || null,
      "completed",
      billData.createdAt
    );
    const newBillId = Number(billResult.lastInsertRowid);
    const itemStmt = db2.prepare(`
      INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice, discountLocked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of itemsData) {
      itemStmt.run(
        newBillId,
        item.productId,
        item.productName,
        item.size || null,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        item.discountLocked || 0
      );
      updateStock(item.productId, -item.quantity, "sale", newBillId);
    }
    db2.prepare("DELETE FROM deleted_bills WHERE id = ?").run(deletedBillId);
  });
  transaction();
  addActivityLog(
    "create",
    "bill",
    `Restored deleted bill: ${billData.billNumber} as ${billData.billNumber}-RESTORED`,
    deletedBillId
  );
  return { success: true, message: "Bill restored successfully", billNumber: billData.billNumber + "-RESTORED" };
}
function permanentlyDeleteBill(deletedBillId) {
  const db2 = getDatabase();
  const deletedBill = getDeletedBillById(deletedBillId);
  if (!deletedBill) {
    throw new Error("Deleted bill not found");
  }
  db2.prepare("DELETE FROM deleted_bills WHERE id = ?").run(deletedBillId);
  addActivityLog(
    "delete",
    "bill",
    `Permanently deleted bill record: ${deletedBill.billNumber}`,
    deletedBillId
  );
  return { success: true, message: "Bill permanently deleted" };
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
      p.costPrice as cost_price,
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
    LEFT JOIN products p ON bi.productId = p.id
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
function getAnalytics(dateFrom, dateTo) {
  const db2 = getDatabase();
  console.log("Analytics query - dateFrom:", dateFrom, "dateTo:", dateTo);
  const dailyStatsStmt = db2.prepare(`
    SELECT 
      date(b.createdAt) as date,
      COALESCE(SUM(b.total), 0) as sales,
      COUNT(*) as bills
    FROM bills b
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY date(b.createdAt)
    ORDER BY date(b.createdAt) DESC
  `);
  const dailyStatsRaw = dailyStatsStmt.all(dateFrom, dateTo);
  const dailyStats = dailyStatsRaw.map((day) => {
    const costStmt2 = db2.prepare(`
      SELECT 
        COALESCE(SUM(bi.quantity * COALESCE(p.costPrice, 0)), 0) as cost
      FROM bill_items bi
      JOIN bills b ON bi.billId = b.id
      LEFT JOIN products p ON bi.productId = p.id
      WHERE date(b.createdAt) = ?
    `);
    const costData2 = costStmt2.get(day.date);
    const cost = (costData2 == null ? void 0 : costData2.cost) || 0;
    const profit = day.sales - cost;
    return {
      date: day.date,
      sales: day.sales,
      profit,
      cost,
      bills: day.bills
    };
  });
  const categoryStmt = db2.prepare(`
    SELECT 
      COALESCE(p.category, 'Unknown') as category,
      COALESCE(SUM(bi.totalPrice), 0) as value
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY p.category
    ORDER BY value DESC
    LIMIT 10
  `);
  const categoryBreakdownRaw = categoryStmt.all(dateFrom, dateTo);
  const categoryBreakdown = categoryBreakdownRaw.map((cat) => {
    const profitStmt = db2.prepare(`
      SELECT 
        COALESCE(SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0))), 0) as profit
      FROM bill_items bi
      JOIN bills b ON bi.billId = b.id
      LEFT JOIN products p ON bi.productId = p.id
      WHERE COALESCE(p.category, 'Unknown') = ?
        AND date(b.createdAt) BETWEEN ? AND ?
    `);
    const profitData = profitStmt.get(cat.category, dateFrom, dateTo);
    return {
      category: cat.category,
      value: cat.value,
      profit: (profitData == null ? void 0 : profitData.profit) || 0
    };
  });
  const paymentStmt = db2.prepare(`
    SELECT 
      paymentMode as mode,
      COALESCE(SUM(total), 0) as value
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY paymentMode
  `);
  const paymentModeData = paymentStmt.all(dateFrom, dateTo);
  const totalPayments = paymentModeData.reduce((sum, item) => sum + item.value, 0);
  const paymentModeStats = paymentModeData.map((item) => ({
    mode: item.mode.charAt(0).toUpperCase() + item.mode.slice(1),
    value: item.value,
    percentage: totalPayments > 0 ? item.value / totalPayments * 100 : 0
  }));
  const hourlyStmt = db2.prepare(`
    SELECT 
      CAST(strftime('%H', createdAt) AS INTEGER) as hour,
      COALESCE(SUM(total), 0) as sales
    FROM bills
    GROUP BY hour
    ORDER BY hour
  `);
  const hourlyData = hourlyStmt.all();
  const hourlyStats = Array.from({ length: 24 }, (_, i) => {
    const hourData = hourlyData.find((h) => h.hour === i);
    return {
      hour: `${i.toString().padStart(2, "0")}:00`,
      sales: hourData ? hourData.sales : 0
    };
  });
  const topProductsStmt = db2.prepare(`
    SELECT 
      bi.productName as name,
      SUM(bi.quantity) as quantity,
      SUM(bi.totalPrice) as revenue
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi.productName
    ORDER BY revenue DESC
    LIMIT 10
  `);
  const topProductsRaw = topProductsStmt.all(dateFrom, dateTo);
  const topProducts = topProductsRaw.map((prod) => {
    const profitStmt = db2.prepare(`
      SELECT 
        COALESCE(SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0))), 0) as profit
      FROM bill_items bi
      JOIN bills b ON bi.billId = b.id
      LEFT JOIN products p ON bi.productId = p.id
      WHERE bi.productName = ?
        AND date(b.createdAt) BETWEEN ? AND ?
    `);
    const profitData = profitStmt.get(prod.name, dateFrom, dateTo);
    return {
      name: prod.name,
      quantity: prod.quantity,
      revenue: prod.revenue,
      profit: (profitData == null ? void 0 : profitData.profit) || 0
    };
  });
  const summaryStmt = db2.prepare(`
    SELECT 
      COALESCE(SUM(b.total), 0) as totalRevenue,
      COUNT(*) as totalBills,
      COALESCE(AVG(b.total), 0) as avgBillValue
    FROM bills b
    WHERE date(b.createdAt) BETWEEN ? AND ?
  `);
  const summaryData = summaryStmt.get(dateFrom, dateTo);
  const costStmt = db2.prepare(`
    SELECT 
      COALESCE(SUM(bi.quantity * COALESCE(p.costPrice, 0)), 0) as totalCost
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
  `);
  const costData = costStmt.get(dateFrom, dateTo);
  const totalCost = (costData == null ? void 0 : costData.totalCost) || 0;
  const totalProfit = summaryData.totalRevenue - totalCost;
  const profitMargin = summaryData.totalRevenue > 0 ? totalProfit / summaryData.totalRevenue * 100 : 0;
  const daysDiff = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1e3 * 60 * 60 * 24)) + 1;
  const prevDateFrom = new Date(new Date(dateFrom).getTime() - daysDiff * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
  const prevDateTo = new Date(new Date(dateFrom).getTime() - 1 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
  const currentPeriodStmt = db2.prepare(`
    SELECT date(createdAt) as date, COALESCE(SUM(total), 0) as sales
    FROM bills WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY date(createdAt) ORDER BY date(createdAt)
  `);
  const currentPeriodData = currentPeriodStmt.all(dateFrom, dateTo);
  const previousPeriodStmt = db2.prepare(`
    SELECT date(createdAt) as date, COALESCE(SUM(total), 0) as sales
    FROM bills WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY date(createdAt) ORDER BY date(createdAt)
  `);
  const previousPeriodDataRaw = previousPeriodStmt.all(prevDateFrom, prevDateTo);
  const previousPeriodData = previousPeriodDataRaw.map((item, idx) => ({
    date: `Day ${idx + 1}`,
    sales: item.sales
  }));
  const currentRevenue = currentPeriodData.reduce((sum, d) => sum + d.sales, 0);
  const previousRevenue = previousPeriodDataRaw.reduce((sum, d) => sum + d.sales, 0);
  const growthPercentage = previousRevenue > 0 ? (currentRevenue - previousRevenue) / previousRevenue * 100 : 0;
  const customerStmt = db2.prepare(`
    SELECT customerMobileNumber, COUNT(*) as purchaseCount
    FROM bills
    WHERE customerMobileNumber IS NOT NULL AND customerMobileNumber != ''
      AND date(createdAt) BETWEEN ? AND ?
    GROUP BY customerMobileNumber
  `);
  const customers = customerStmt.all(dateFrom, dateTo);
  const repeatCustomers = customers.filter((c) => c.purchaseCount > 1).length;
  const newCustomers = customers.filter((c) => c.purchaseCount === 1).length;
  const totalCustomers = customers.length;
  const repeatPercentage = totalCustomers > 0 ? repeatCustomers / totalCustomers * 100 : 0;
  const profitableStmt = db2.prepare(`
    SELECT 
      bi.productName as name,
      SUM(bi.totalPrice) as revenue,
      SUM(bi.quantity * COALESCE(p.costPrice, 0)) as cost,
      SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0))) as profit
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi.productName
    ORDER BY profit DESC
    LIMIT 10
  `);
  const profitableProductsRaw = profitableStmt.all(dateFrom, dateTo);
  const profitableProducts = profitableProductsRaw.map((p) => ({
    ...p,
    profitMargin: p.revenue > 0 ? p.profit / p.revenue * 100 : 0
  }));
  const lowPerformingStmt = db2.prepare(`
    SELECT 
      p.name,
      COALESCE(SUM(bi.quantity), 0) as quantitySold,
      COALESCE(SUM(bi.totalPrice), 0) as revenue,
      COALESCE(MAX(CAST((JULIANDAY('now', 'localtime') - JULIANDAY(b.createdAt)) AS INTEGER)), 999) as daysSinceLastSale
    FROM products p
    LEFT JOIN bill_items bi ON p.id = bi.productId
    LEFT JOIN bills b ON bi.billId = b.id AND date(b.createdAt) BETWEEN ? AND ?
    WHERE p.isActive = 1
    GROUP BY p.id, p.name
    ORDER BY quantitySold ASC, revenue ASC
    LIMIT 10
  `);
  const lowPerformingProducts = lowPerformingStmt.all(dateFrom, dateTo);
  const peakDayStmt = db2.prepare(`
    SELECT 
      CASE CAST(strftime('%w', createdAt) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as weekday,
      SUM(total) as revenue,
      COUNT(*) as bills
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY strftime('%w', createdAt)
    ORDER BY revenue DESC
  `);
  const peakSalesDay = peakDayStmt.all(dateFrom, dateTo);
  const bundleStmt = db2.prepare(`
    SELECT 
      bi1.productName as productA,
      bi2.productName as productB,
      COUNT(*) as timesBoughtTogether
    FROM bill_items bi1
    JOIN bill_items bi2 ON bi1.billId = bi2.billId AND bi1.productId < bi2.productId
    JOIN bills b ON bi1.billId = b.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi1.productName, bi2.productName
    HAVING timesBoughtTogether > 1
    ORDER BY timesBoughtTogether DESC
    LIMIT 10
  `);
  const productBundles = bundleStmt.all(dateFrom, dateTo);
  const inventoryStmt = db2.prepare(`
    SELECT 
      p.name as product,
      p.stock,
      COALESCE(SUM(bi.quantity) / NULLIF(?, 1), 0) as avgDailySales
    FROM products p
    LEFT JOIN bill_items bi ON p.id = bi.productId
    LEFT JOIN bills b ON bi.billId = b.id AND date(b.createdAt) BETWEEN ? AND ?
    WHERE p.isActive = 1 AND p.stock > 0
    GROUP BY p.id, p.name, p.stock
  `);
  const inventoryRaw = inventoryStmt.all(daysDiff || 1, dateFrom, dateTo);
  const inventoryRisk = inventoryRaw.map((i) => ({
    ...i,
    daysLeft: i.avgDailySales > 0 ? Math.floor(i.stock / i.avgDailySales) : 999
  })).filter((i) => i.daysLeft < 30).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 10);
  const discountStmt = db2.prepare(`
    SELECT 
      SUM(CASE WHEN discountAmount > 0 THEN total ELSE 0 END) as revenueWithDiscount,
      SUM(CASE WHEN discountAmount = 0 THEN total ELSE 0 END) as revenueWithoutDiscount,
      AVG(CASE WHEN discountAmount > 0 THEN total ELSE NULL END) as avgBillWithDiscount,
      AVG(CASE WHEN discountAmount = 0 THEN total ELSE NULL END) as avgBillWithoutDiscount
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
  `);
  const discountData = discountStmt.get(dateFrom, dateTo);
  const discountEffectiveness = {
    revenueWithDiscount: discountData.revenueWithDiscount || 0,
    revenueWithoutDiscount: discountData.revenueWithoutDiscount || 0,
    avgBillWithDiscount: discountData.avgBillWithDiscount || 0,
    avgBillWithoutDiscount: discountData.avgBillWithoutDiscount || 0
  };
  const targetSettingStmt = db2.prepare(`SELECT value FROM settings WHERE key = 'monthlyTarget'`);
  const targetSetting = targetSettingStmt.get();
  const monthlyTarget = targetSetting ? parseFloat(targetSetting.value) : 1e5;
  const targetStmt = db2.prepare(`
    SELECT COALESCE(SUM(total), 0) as achieved
    FROM bills
    WHERE strftime('%Y-%m', createdAt) = strftime('%Y-%m', 'now')
  `);
  const targetData = targetStmt.get();
  const salesTarget = {
    target: monthlyTarget,
    achieved: targetData.achieved || 0,
    percentage: targetData.achieved / monthlyTarget * 100
  };
  return {
    dailyStats,
    categoryBreakdown,
    paymentModeStats,
    hourlyStats,
    topProducts,
    summary: {
      totalRevenue: summaryData.totalRevenue,
      totalProfit,
      totalCost,
      totalBills: summaryData.totalBills,
      avgBillValue: Math.round(summaryData.avgBillValue * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100
    },
    salesGrowth: {
      currentRevenue,
      previousRevenue,
      growthPercentage: Math.round(growthPercentage * 100) / 100,
      currentPeriodData,
      previousPeriodData
    },
    customerRetention: {
      repeatCustomers,
      newCustomers,
      repeatPercentage: Math.round(repeatPercentage * 100) / 100
    },
    profitableProducts,
    lowPerformingProducts,
    peakSalesDay,
    productBundles,
    inventoryRisk,
    discountEffectiveness,
    salesTarget
  };
}
function linearRegression(data) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0, predictions: data };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
    sumY2 += data[i] * data[i];
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  const predictions = [];
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    predictions.push(predicted);
    ssRes += Math.pow(data[i] - predicted, 2);
    ssTot += Math.pow(data[i] - yMean, 2);
  }
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, rSquared, predictions };
}
function movingAverage(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}
function calculateStats(data) {
  if (data.length === 0) return { mean: 0, stdDev: 0, variance: 0, min: 0, max: 0 };
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);
  return { mean, stdDev, variance, min, max };
}
function coefficientOfVariation(data) {
  const stats = calculateStats(data);
  return stats.mean === 0 ? 0 : stats.stdDev / stats.mean * 100;
}
function getConfidenceLevel(cv, dataPoints) {
  if (dataPoints < 7) return "Low";
  if (cv > 50) return "Low";
  if (cv > 30) return "Medium";
  return "High";
}
function calculateGrowthRate(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return (newValue - oldValue) / oldValue * 100;
}
function getForecast() {
  var _a, _b;
  const db2 = getDatabase();
  const billsStmt = db2.prepare(`
    SELECT 
      id, 
      total, 
      paymentMode, 
      date(createdAt) as date,
      strftime('%w', createdAt) as dayOfWeek,
      strftime('%Y-%m', createdAt) as yearMonth,
      createdAt
    FROM bills
    WHERE status = 'completed'
    ORDER BY createdAt ASC
  `);
  const bills = billsStmt.all();
  if (bills.length === 0) {
    return getEmptyForecast();
  }
  const productSalesStmt = db2.prepare(`
    SELECT 
      bi.productId,
      bi.productName,
      p.category,
      SUM(bi.quantity) as totalQuantity,
      SUM(bi.totalPrice) as totalRevenue,
      COUNT(DISTINCT bi.billId) as billCount,
      MIN(b.createdAt) as firstSale,
      MAX(b.createdAt) as lastSale
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE b.status = 'completed'
    GROUP BY bi.productId, bi.productName, p.category
    ORDER BY totalRevenue DESC
  `);
  const productSales = productSalesStmt.all();
  const dailySalesMap = /* @__PURE__ */ new Map();
  const dailyBillsMap = /* @__PURE__ */ new Map();
  const dayOfWeekMap = /* @__PURE__ */ new Map();
  for (const bill of bills) {
    const date = bill.date;
    const dow = parseInt(bill.dayOfWeek);
    dailySalesMap.set(date, (dailySalesMap.get(date) || 0) + bill.total);
    dailyBillsMap.set(date, (dailyBillsMap.get(date) || 0) + 1);
    if (!dayOfWeekMap.has(dow)) {
      dayOfWeekMap.set(dow, { sales: 0, count: 0 });
    }
    const dayData = dayOfWeekMap.get(dow);
    dayData.sales += bill.total;
    dayData.count += 1;
  }
  const dailySalesArray = Array.from(dailySalesMap.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([date, sales]) => ({ date, sales }));
  const salesValues = dailySalesArray.map((d) => d.sales);
  const regression = linearRegression(salesValues);
  const trendDirection = regression.slope > 0 ? "Increasing" : regression.slope < 0 ? "Decreasing" : "Stable";
  const trendStrength = Math.abs(regression.slope);
  const stats = calculateStats(salesValues);
  const std = stats.stdDev;
  const lastDate = new Date(dailySalesArray[dailySalesArray.length - 1].date);
  const forecast7Days = [];
  const forecast30Days = [];
  const forecast90Days = [];
  const confidenceMultiplier = 1.96;
  for (let i = 1; i <= 7; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    const predicted = Math.max(0, regression.intercept + regression.slope * (salesValues.length + i - 1));
    const margin = confidenceMultiplier * std * Math.sqrt(1 + 1 / salesValues.length + Math.pow(i - salesValues.length / 2, 2) / Math.pow(salesValues.length, 2));
    forecast7Days.push({
      date: forecastDate.toISOString().split("T")[0],
      predicted: Math.round(predicted),
      lower: Math.max(0, Math.round(predicted - margin)),
      upper: Math.round(predicted + margin)
    });
  }
  for (let i = 1; i <= 30; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    const predicted = Math.max(0, regression.intercept + regression.slope * (salesValues.length + i - 1));
    const margin = confidenceMultiplier * std * Math.sqrt(1 + 1 / salesValues.length + Math.pow(i - salesValues.length / 2, 2) / Math.pow(salesValues.length, 2));
    forecast30Days.push({
      date: forecastDate.toISOString().split("T")[0],
      predicted: Math.round(predicted),
      lower: Math.max(0, Math.round(predicted - margin)),
      upper: Math.round(predicted + margin)
    });
  }
  for (let i = 1; i <= 90; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    const predicted = Math.max(0, regression.intercept + regression.slope * (salesValues.length + i - 1));
    forecast90Days.push({
      date: forecastDate.toISOString().split("T")[0],
      predicted: Math.round(predicted)
    });
  }
  const nextWeekTotal = forecast7Days.reduce((sum, d) => sum + d.predicted, 0);
  const nextMonthTotal = forecast30Days.reduce((sum, d) => sum + d.predicted, 0);
  const next90DaysTotal = forecast90Days.reduce((sum, d) => sum + d.predicted, 0);
  const nextWeekDaily = Math.round(nextWeekTotal / 7);
  const nextMonthDaily = Math.round(nextMonthTotal / 30);
  const next90DaysDaily = Math.round(next90DaysTotal / 90);
  const ma7 = movingAverage(salesValues, 7);
  const ma30 = movingAverage(salesValues, 30);
  const dailyTrend = dailySalesArray.map((d, idx) => ({
    date: d.date,
    sales: d.sales,
    ma7: Math.round(ma7[idx]),
    ma30: Math.round(ma30[idx])
  }));
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weeklyByDay = dayNames.map((day, idx) => {
    const dayData = dayOfWeekMap.get(idx) || { sales: 0, count: 0 };
    const avgSales = dayData.count > 0 ? dayData.sales / dayData.count : 0;
    const predictedSales = Math.max(0, regression.intercept + regression.slope * (salesValues.length + 7));
    return {
      day,
      avgSales: Math.round(avgSales),
      totalSales: Math.round(dayData.sales),
      billCount: dayData.count,
      performance: getPerformanceLabel(avgSales, stats.mean),
      predictedSales: Math.round(predictedSales)
    };
  });
  const weeklyForecast = dayNames.map((day, idx) => {
    const nextWeekDate = new Date(lastDate);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7 + idx);
    const dayOfWeek = nextWeekDate.getDay();
    weeklyByDay[dayOfWeek].avgSales;
    const predicted = Math.max(0, regression.intercept + regression.slope * (salesValues.length + 7 + idx));
    return {
      day,
      predicted: Math.round(predicted)
    };
  });
  const weekendDays = [0, 6];
  const weekendAvg = weeklyByDay.filter((_, idx) => weekendDays.includes(idx)).reduce((sum, d) => sum + d.avgSales, 0) / 2;
  const weekdayAvg = weeklyByDay.filter((_, idx) => !weekendDays.includes(idx)).reduce((sum, d) => sum + d.avgSales, 0) / 5;
  const bestDay = weeklyByDay.reduce((max, d) => d.avgSales > max.avgSales ? d : max);
  const worstDay = weeklyByDay.reduce((min, d) => d.avgSales < min.avgSales ? d : min);
  const monthlyMap = /* @__PURE__ */ new Map();
  for (const bill of bills) {
    const month = bill.yearMonth;
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { sales: 0, count: 0 });
    }
    const monthData = monthlyMap.get(month);
    monthData.sales += bill.total;
    monthData.count += 1;
  }
  const monthlyTrend = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map((entry, idx, arr) => {
    const [month, data] = entry;
    const avgDaily = data.sales / 30;
    const prevMonth = idx > 0 ? arr[idx - 1][1] : null;
    const growth = prevMonth ? calculateGrowthRate(prevMonth.sales, data.sales) : 0;
    return {
      month,
      sales: Math.round(data.sales),
      avgDaily: Math.round(avgDaily),
      growth: Math.round(growth * 10) / 10
    };
  });
  const topSelling = productSales.slice(0, 10).map((p) => ({
    name: p.productName,
    category: p.category || "Uncategorized",
    quantity: p.totalQuantity,
    revenue: Math.round(p.totalRevenue),
    growth: 0
    // Will calculate from historical data if available
  }));
  const slowMoving = productSales.filter((p) => p.totalQuantity < 5).slice(0, 5).map((p) => ({
    name: p.productName,
    category: p.category || "Uncategorized",
    quantity: p.totalQuantity,
    revenue: Math.round(p.totalRevenue),
    daysInStock: calculateDaysInStock(p.firstSale, p.lastSale)
  }));
  const productForecast = productSales.slice(0, 15).map((p) => {
    const daysInStock = calculateDaysInStock(p.firstSale, p.lastSale);
    const avgDailyDemand = p.totalQuantity / daysInStock;
    const forecast30 = Math.round(avgDailyDemand * 30);
    const forecast90 = Math.round(avgDailyDemand * 90);
    const currentStock = getProductStock(db2, p.productId);
    const daysUntilStockout = currentStock > 0 ? Math.ceil(currentStock / avgDailyDemand) : 0;
    let priority = "Low";
    if (daysUntilStockout < 7 || forecast30 > 50) priority = "High";
    else if (daysUntilStockout < 14 || forecast30 > 20) priority = "Medium";
    return {
      name: p.productName,
      currentDemand: Math.round(avgDailyDemand),
      forecast30Days: forecast30,
      forecast90Days: forecast90,
      restockPriority: priority,
      daysUntilStockout: Math.max(0, daysUntilStockout)
    };
  });
  const productDemandTrend = productSales.slice(0, 10).map((p) => {
    const daysInStock = calculateDaysInStock(p.firstSale, p.lastSale);
    p.totalQuantity / daysInStock;
    const midDate = new Date(p.firstSale);
    midDate.setDate(midDate.getDate() + Math.floor(daysInStock / 2));
    const firstHalfDemand = p.totalQuantity / 2;
    const secondHalfDemand = p.totalQuantity / 2;
    const growthRate = calculateGrowthRate(firstHalfDemand, secondHalfDemand);
    let trend = "Stable";
    if (growthRate > 10) trend = "Increasing";
    else if (growthRate < -10) trend = "Decreasing";
    return {
      name: p.productName,
      trend,
      growthRate: Math.round(growthRate * 10) / 10
    };
  });
  const categoryMap = /* @__PURE__ */ new Map();
  for (const product of productSales) {
    const cat = product.category || "Uncategorized";
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { revenue: 0, quantity: 0, count: 0 });
    }
    const catData = categoryMap.get(cat);
    catData.revenue += product.totalRevenue;
    catData.quantity += product.totalQuantity;
    catData.count += 1;
  }
  const categoryPerformance = Array.from(categoryMap.entries()).map(([name, data]) => {
    const avgDailyRevenue = data.revenue / Math.max(data.count, 1);
    const predictedRevenue30 = Math.round(avgDailyRevenue * 30);
    return {
      name,
      revenue: Math.round(data.revenue),
      quantity: data.quantity,
      avgPrice: Math.round(data.revenue / data.quantity),
      growth: 0,
      predictedRevenue30
    };
  }).sort((a, b) => b.revenue - a.revenue);
  const categoryForecast = categoryPerformance.map((cat) => {
    const avgDailyRevenue = cat.revenue / Math.max(cat.quantity, 1);
    const forecast30 = Math.round(avgDailyRevenue * 30);
    const forecast90 = Math.round(avgDailyRevenue * 90);
    return {
      name: cat.name,
      current: cat.revenue,
      forecast30,
      forecast90
    };
  });
  const topCategory = ((_a = categoryPerformance[0]) == null ? void 0 : _a.name) || "N/A";
  const bottomCategory = ((_b = categoryPerformance[categoryPerformance.length - 1]) == null ? void 0 : _b.name) || "N/A";
  const paymentMap = /* @__PURE__ */ new Map();
  for (const bill of bills) {
    const mode = bill.paymentMode;
    if (!paymentMap.has(mode)) {
      paymentMap.set(mode, { count: 0, total: 0 });
    }
    const payData = paymentMap.get(mode);
    payData.count += 1;
    payData.total += bill.total;
  }
  const totalBills = bills.length;
  const paymentDistribution = Array.from(paymentMap.entries()).map(([mode, data]) => ({
    mode: mode.toUpperCase(),
    count: data.count,
    percentage: Math.round(data.count / totalBills * 1e3) / 10,
    avgValue: Math.round(data.total / data.count)
  }));
  const dominantMode = paymentDistribution.reduce((max, p) => p.count > max.count ? p : max).mode;
  const midPoint = Math.floor(bills.length / 2);
  const firstHalf = bills.slice(0, midPoint);
  const secondHalf = bills.slice(midPoint);
  const paymentTrends = Array.from(paymentMap.keys()).map((mode) => {
    const firstHalfCount = firstHalf.filter((b) => b.paymentMode === mode).length;
    const secondHalfCount = secondHalf.filter((b) => b.paymentMode === mode).length;
    const growth = calculateGrowthRate(firstHalfCount || 1, secondHalfCount);
    const trend = growth > 5 ? "Increasing" : growth < -5 ? "Decreasing" : "Stable";
    const currentPercentage = secondHalfCount / secondHalf.length * 100;
    const predictedPercentage = Math.min(100, Math.max(0, currentPercentage + growth * 0.3));
    return {
      mode: mode.toUpperCase(),
      growth: Math.round(growth * 10) / 10,
      trend,
      predictedPercentage30: Math.round(predictedPercentage * 10) / 10
    };
  });
  const paymentForecast = Array.from(paymentMap.keys()).map((mode) => {
    const modeData = paymentMap.get(mode);
    modeData.total / modeData.count;
    const predicted7Days = Math.round(nextWeekTotal / 7 * (modeData.count / totalBills));
    const predicted30Days = Math.round(nextMonthTotal / 30 * (modeData.count / totalBills));
    return {
      mode: mode.toUpperCase(),
      predicted7Days,
      predicted30Days
    };
  });
  const cv = coefficientOfVariation(salesValues);
  const confidence = getConfidenceLevel(cv, salesValues.length);
  const dataQuality = Math.max(0, Math.min(100, 100 - cv));
  const insights = generateInsights(
    regression,
    weeklyByDay,
    weekendAvg,
    weekdayAvg,
    topSelling,
    categoryPerformance,
    paymentTrends,
    productForecast,
    stats
  );
  const weeklyPatternInsight = weekendAvg > weekdayAvg ? `Weekend sales are ${Math.round((weekendAvg - weekdayAvg) / weekdayAvg * 100)}% higher than weekdays` : `Weekday sales are ${Math.round((weekdayAvg - weekendAvg) / weekendAvg * 100)}% higher than weekends`;
  const peakDays = weeklyByDay.filter((d) => d.performance === "High").map((d) => d.day);
  const lowDays = weeklyByDay.filter((d) => d.performance === "Low").map((d) => d.day);
  return {
    summary: {
      totalSales: Math.round(bills.reduce((sum, b) => sum + b.total, 0)),
      avgDailySales: Math.round(stats.mean),
      totalBills,
      dataPoints: salesValues.length,
      dateRange: {
        from: dailySalesArray[0].date,
        to: dailySalesArray[dailySalesArray.length - 1].date
      }
    },
    trends: {
      dailyTrend,
      weeklyTrend: [],
      monthlyTrend,
      regression: {
        slope: Math.round(regression.slope * 100) / 100,
        slopeExplanation: `Sales are ${trendDirection.toLowerCase()} by ₹${Math.round(Math.abs(regression.slope))} per day`,
        rSquared: Math.round(regression.rSquared * 1e4) / 1e4,
        accuracy: getAccuracyLabel(regression.rSquared),
        forecast7Days,
        forecast30Days,
        forecast90Days
      }
    },
    predictions: {
      nextWeekTotal,
      nextMonthTotal,
      next90DaysTotal,
      nextWeekDaily,
      nextMonthDaily,
      next90DaysDaily,
      trendStrength: Math.round(trendStrength * 100) / 100,
      volatilityScore: Math.round(stats.stdDev * 100) / 100
    },
    weeklyPattern: {
      byDay: weeklyByDay,
      weekendVsWeekday: {
        weekendAvg: Math.round(weekendAvg),
        weekdayAvg: Math.round(weekdayAvg),
        difference: Math.round(weekendAvg - weekdayAvg),
        differencePercent: Math.round((weekendAvg - weekdayAvg) / weekdayAvg * 1e3) / 10
      },
      bestDay: bestDay.day,
      worstDay: worstDay.day,
      weeklyForecast
    },
    products: {
      topSelling: topSelling.map((p, idx) => {
        var _a2;
        return {
          ...p,
          predictedDemand30: ((_a2 = productForecast[idx]) == null ? void 0 : _a2.forecast30Days) || 0
        };
      }),
      slowMoving,
      forecast: productForecast,
      demandTrend: productDemandTrend
    },
    categories: {
      performance: categoryPerformance,
      topCategory,
      bottomCategory,
      categoryForecast
    },
    payments: {
      distribution: paymentDistribution,
      trends: paymentTrends,
      dominantMode,
      paymentForecast
    },
    seasonality: {
      weeklyPattern: weeklyPatternInsight,
      monthlyPattern: monthlyTrend.length > 1 ? "Multiple months of data available" : "Insufficient data",
      peakDays,
      lowDays,
      seasonalIndex: weeklyByDay.map((d) => ({
        day: d.day,
        index: Math.round(d.avgSales / stats.mean * 100)
      }))
    },
    insights,
    confidence: {
      level: confidence,
      reason: `Data consistency: ${Math.round(dataQuality)}%. ${salesValues.length} days of sales data.`,
      dataQuality: Math.round(dataQuality)
    }
  };
}
function getEmptyForecast() {
  return {
    summary: { totalSales: 0, avgDailySales: 0, totalBills: 0, dataPoints: 0, dateRange: { from: "", to: "" } },
    trends: {
      dailyTrend: [],
      weeklyTrend: [],
      monthlyTrend: [],
      regression: { slope: 0, slopeExplanation: "No data", rSquared: 0, accuracy: "N/A", forecast7Days: [], forecast30Days: [], forecast90Days: [] }
    },
    predictions: {
      nextWeekTotal: 0,
      nextMonthTotal: 0,
      next90DaysTotal: 0,
      nextWeekDaily: 0,
      nextMonthDaily: 0,
      next90DaysDaily: 0,
      trendStrength: 0,
      volatilityScore: 0
    },
    weeklyPattern: {
      byDay: [],
      weekendVsWeekday: { weekendAvg: 0, weekdayAvg: 0, difference: 0, differencePercent: 0 },
      bestDay: "N/A",
      worstDay: "N/A",
      weeklyForecast: []
    },
    products: { topSelling: [], slowMoving: [], forecast: [], demandTrend: [] },
    categories: { performance: [], topCategory: "N/A", bottomCategory: "N/A", categoryForecast: [] },
    payments: { distribution: [], trends: [], dominantMode: "N/A", paymentForecast: [] },
    seasonality: { weeklyPattern: "No data", monthlyPattern: "No data", peakDays: [], lowDays: [], seasonalIndex: [] },
    insights: ["No sales data available"],
    confidence: { level: "Low", reason: "No data", dataQuality: 0 }
  };
}
function getPerformanceLabel(value, average) {
  if (value > average * 1.2) return "High";
  if (value < average * 0.8) return "Low";
  return "Medium";
}
function getAccuracyLabel(rSquared) {
  if (rSquared > 0.8) return "Very High";
  if (rSquared > 0.6) return "High";
  if (rSquared > 0.4) return "Medium";
  return "Low";
}
function calculateDaysInStock(firstSale, lastSale) {
  const first = new Date(firstSale).getTime();
  const last = new Date(lastSale).getTime();
  const days = Math.ceil((last - first) / (1e3 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}
function getProductStock(db2, productId) {
  const stmt = db2.prepare("SELECT stock FROM products WHERE id = ?");
  const result = stmt.get(productId);
  return (result == null ? void 0 : result.stock) || 0;
}
function generateInsights(regression, weeklyByDay, weekendAvg, weekdayAvg, topSelling, categories, paymentTrends, productForecast, stats) {
  const insights = [];
  if (regression.slope > 0) {
    const dailyGrowth = Math.round(regression.slope / stats.mean * 1e3) / 10;
    insights.push(`📈 Sales trending UP by ${dailyGrowth}% daily. Maintain current strategy.`);
  } else if (regression.slope < 0) {
    const dailyDecline = Math.round(Math.abs(regression.slope) / stats.mean * 1e3) / 10;
    insights.push(`📉 Sales declining by ${dailyDecline}% daily. Review marketing & pricing.`);
  }
  if (weekendAvg > weekdayAvg * 1.15) {
    const diff = Math.round((weekendAvg - weekdayAvg) / weekdayAvg * 100);
    insights.push(`🎯 Weekend sales ${diff}% higher. Stock up before weekends.`);
  }
  if (topSelling.length > 0) {
    insights.push(`⭐ Top product: ${topSelling[0].name} (${topSelling[0].quantity} units sold)`);
  }
  const highPriority = productForecast.filter((p) => p.restockPriority === "High");
  if (highPriority.length > 0) {
    insights.push(`⚠️ URGENT: Restock ${highPriority.length} items - ${highPriority.map((p) => p.name).join(", ")}`);
  }
  const growingPayment = paymentTrends.find((p) => p.trend === "Increasing");
  if (growingPayment) {
    insights.push(`💳 ${growingPayment.mode} payments growing (+${growingPayment.growth}%)`);
  }
  if (categories.length > 0) {
    insights.push(`🏆 Best category: ${categories[0].name} (₹${categories[0].revenue} revenue)`);
  }
  if (stats.stdDev / stats.mean > 0.5) {
    insights.push(`📊 Sales highly variable. Consider promotions for consistency.`);
  }
  return insights;
}
function getCombos() {
  const db2 = getDatabase();
  const combos = db2.prepare(`SELECT * FROM combos WHERE isActive = 1 ORDER BY createdAt DESC`).all();
  const itemsStmt = db2.prepare(`
    SELECT ci.*, p.name as productName, p.price, p.stock, p.size, p.category, p.costPrice
    FROM combo_items ci
    JOIN products p ON p.id = ci.productId
    WHERE ci.comboId = ?
  `);
  return combos.map((combo) => ({
    ...combo,
    comboPrice: combo.comboPrice ?? null,
    items: itemsStmt.all(combo.id)
  }));
}
function createCombo(data) {
  const db2 = getDatabase();
  const tx = db2.transaction(() => {
    const result = db2.prepare(
      `INSERT INTO combos (name, description, comboPrice) VALUES (?, ?, ?)`
    ).run(data.name, data.description || null, data.comboPrice ?? null);
    const comboId2 = result.lastInsertRowid;
    const itemStmt = db2.prepare(
      `INSERT INTO combo_items (comboId, productId, quantity) VALUES (?, ?, ?)`
    );
    for (const item of data.items) {
      itemStmt.run(comboId2, item.productId, item.quantity);
    }
    return comboId2;
  });
  const comboId = tx();
  addActivityLog(
    "create",
    "system",
    `Created combo: "${data.name}" with ${data.items.length} item(s)`,
    comboId,
    void 0,
    JSON.stringify(data)
  );
  return comboId;
}
function updateCombo(id, data) {
  const db2 = getDatabase();
  const old = db2.prepare(`SELECT * FROM combos WHERE id = ?`).get(id);
  const tx = db2.transaction(() => {
    db2.prepare(
      `UPDATE combos SET name = ?, description = ?, comboPrice = ?, updatedAt = datetime('now','localtime') WHERE id = ?`
    ).run(data.name, data.description || null, data.comboPrice ?? null, id);
    db2.prepare(`DELETE FROM combo_items WHERE comboId = ?`).run(id);
    const itemStmt = db2.prepare(
      `INSERT INTO combo_items (comboId, productId, quantity) VALUES (?, ?, ?)`
    );
    for (const item of data.items) {
      itemStmt.run(id, item.productId, item.quantity);
    }
  });
  tx();
  addActivityLog(
    "update",
    "system",
    `Updated combo: "${data.name}"`,
    id,
    old ? JSON.stringify({ name: old.name, description: old.description }) : void 0,
    JSON.stringify(data)
  );
}
function deleteCombo(id) {
  const db2 = getDatabase();
  const combo = db2.prepare(`SELECT * FROM combos WHERE id = ?`).get(id);
  db2.prepare(`UPDATE combos SET isActive = 0 WHERE id = ?`).run(id);
  addActivityLog(
    "delete",
    "system",
    `Deleted combo: "${(combo == null ? void 0 : combo.name) || id}"`,
    id,
    JSON.stringify(combo),
    void 0
  );
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
      console.log("bills:getAll called with:", { dateFrom, dateTo, searchQuery });
      const results = getBills(dateFrom, dateTo, searchQuery);
      console.log("bills:getAll returning", results.length, "bills");
      return results;
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
  ipcMain.handle("bills:delete", async (_, billId, reason) => {
    try {
      return deleteBill(billId, reason);
    } catch (error) {
      console.error("Error deleting bill:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:getDeleted", async (_, limit, offset) => {
    try {
      return getDeletedBills(limit, offset);
    } catch (error) {
      console.error("Error getting deleted bills:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:getDeletedById", async (_, id) => {
    try {
      return getDeletedBillById(id);
    } catch (error) {
      console.error("Error getting deleted bill:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:restore", async (_, deletedBillId) => {
    try {
      return restoreDeletedBill(deletedBillId);
    } catch (error) {
      console.error("Error restoring bill:", error);
      throw error;
    }
  });
  ipcMain.handle("bills:permanentlyDelete", async (_, deletedBillId) => {
    try {
      return permanentlyDeleteBill(deletedBillId);
    } catch (error) {
      console.error("Error permanently deleting bill:", error);
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
          console.log(`Printing to: ${printerName}`);
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
        di.pDocName = "Receipt";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return Marshal.GetLastWin32Error();
        if (!StartDocPrinter(hPrinter, 1, ref di)) { ClosePrinter(hPrinter); return Marshal.GetLastWin32Error(); }
        if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return Marshal.GetLastWin32Error(); }
        
        int written = 0;
        if (!WritePrinter(hPrinter, data, data.Length, out written)) {
            EndPagePrinter(hPrinter); EndDocPrinter(hPrinter); ClosePrinter(hPrinter);
            return Marshal.GetLastWin32Error();
        }
        
        EndPagePrinter(hPrinter); EndDocPrinter(hPrinter); ClosePrinter(hPrinter);
        return 0;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrint]::Print($printerName, $bytes)
if ($result -eq 0) { Write-Output "SUCCESS" } else { Write-Output "ERROR:$result" }
`;
          const psFile = path2.join(os.tmpdir(), `print-${Date.now()}.ps1`);
          fs2.writeFileSync(psFile, psScript, "utf8");
          const { stdout } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 1e4 });
          setTimeout(() => {
            try {
              fs2.unlinkSync(psFile);
            } catch (e) {
            }
          }, 500);
          if (!stdout.trim().includes("SUCCESS")) {
            throw new Error(`Print failed: ${stdout.trim()}`);
          }
          console.log("✓ Print successful");
        } catch (error) {
          console.error("❌ Printing error:", error);
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
  ipcMain.handle("analytics:get", async (_, dateFrom, dateTo) => {
    try {
      return getAnalytics(dateFrom, dateTo);
    } catch (error) {
      console.error("Error getting analytics:", error);
      throw error;
    }
  });
  ipcMain.handle("forecast:get", async () => {
    try {
      return getForecast();
    } catch (error) {
      console.error("Error getting forecast:", error);
      throw error;
    }
  });
  ipcMain.handle("combos:getAll", async () => {
    try {
      return getCombos();
    } catch (e) {
      console.error(e);
      throw e;
    }
  });
  ipcMain.handle("combos:create", async (_, data) => {
    try {
      return createCombo(data);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });
  ipcMain.handle("combos:update", async (_, id, data) => {
    try {
      updateCombo(id, data);
      return { success: true };
    } catch (e) {
      console.error(e);
      throw e;
    }
  });
  ipcMain.handle("combos:delete", async (_, id) => {
    try {
      deleteCombo(id);
      return { success: true };
    } catch (e) {
      console.error(e);
      throw e;
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

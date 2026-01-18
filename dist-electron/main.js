import { app as C, dialog as W, ipcMain as d, BrowserWindow as Y } from "electron";
import k from "path";
import { fileURLToPath as j } from "node:url";
import K from "better-sqlite3";
import { exec as J } from "child_process";
import { promisify as Q } from "util";
import x from "fs";
let f;
async function Z() {
  const o = k.join(C.getPath("userData"), "billing.db");
  f = new K(o), f.exec(`
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
    const e = f.prepare("PRAGMA table_info(products)").all();
    e.some((n) => n.name === "isActive") || (console.log("Adding isActive column to products table..."), f.exec("ALTER TABLE products ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1"), console.log("Migration completed: isActive column added")), e.some((n) => n.name === "costPrice") || (console.log("Adding costPrice column to products table..."), f.exec("ALTER TABLE products ADD COLUMN costPrice REAL DEFAULT 0"), console.log("Migration completed: costPrice column added"));
  } catch (e) {
    console.error("Migration error:", e);
  }
  f.exec(`
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
    const e = f.prepare("PRAGMA table_info(bills)").all(), r = e.some((c) => c.name === "cashAmount"), t = e.some((c) => c.name === "upiAmount");
    r || (console.log("Adding cashAmount column to bills table..."), f.exec("ALTER TABLE bills ADD COLUMN cashAmount REAL DEFAULT 0")), t || (console.log("Adding upiAmount column to bills table..."), f.exec("ALTER TABLE bills ADD COLUMN upiAmount REAL DEFAULT 0"));
    try {
      f.prepare(`
        INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount)
        VALUES ('TEST_MIXED', 100, 0, 0, 100, 'mixed', 50, 50)
      `).run(), f.exec("DELETE FROM bills WHERE billNumber = 'TEST_MIXED'"), console.log("Mixed payment mode already supported");
    } catch {
      console.log("Updating bills table to support mixed payment mode..."), f.exec("PRAGMA foreign_keys = OFF;"), f.exec("DROP TABLE IF EXISTS bills_backup;"), f.exec(`
        CREATE TABLE bills_backup AS SELECT * FROM bills;
      `), f.exec("DROP TABLE bills;"), f.exec(`
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
      `), f.exec(`
        INSERT INTO bills (id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, customerMobileNumber, status, createdAt)
        SELECT id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, 
               COALESCE(cashAmount, 0), COALESCE(upiAmount, 0), NULL as customerMobileNumber, status, createdAt
        FROM bills_backup;
      `), f.exec("DROP TABLE bills_backup;"), f.exec("PRAGMA foreign_keys = ON;"), console.log("Bills table updated to support mixed payment mode");
    }
    (!r || !t) && console.log("Migration completed: payment columns added"), e.some((c) => c.name === "customerMobileNumber") || (console.log("Adding customerMobileNumber column to bills table..."), f.exec("ALTER TABLE bills ADD COLUMN customerMobileNumber TEXT"), console.log("Migration completed: customerMobileNumber column added"));
  } catch (e) {
    console.error("Bills migration error:", e);
  }
  f.exec(`
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
  `), f.exec(`
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
  `), f.exec(`
    CREATE TABLE IF NOT EXISTS stock_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      changeType TEXT NOT NULL CHECK (changeType IN ('sale', 'restock', 'adjustment')),
      quantityChange INTEGER NOT NULL,
      referenceId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (productId) REFERENCES products (id)
    );
  `), f.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
  const s = [
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
  ], i = f.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [e, r] of s)
    i.run(e, r);
  f.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
    CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(createdAt);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(billId);
    CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(productId);
  `), console.log("Database initialized at", o);
}
function m() {
  if (!f) throw new Error("Database not initialized");
  return f;
}
async function tt() {
  f && (f.close(), console.log("Database closed"));
}
function w(o, s, i, e, r, t, n) {
  return m().prepare(`
    INSERT INTO activity_logs (action, entityType, entityId, details, oldValue, newValue, userId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(
    o,
    s,
    e || null,
    i,
    r || null,
    t || null,
    "system"
  ).lastInsertRowid;
}
function et(o = 100, s = 0, i, e, r) {
  const t = m();
  let n = "SELECT * FROM activity_logs";
  const c = [], p = [];
  return i && (p.push("entityType = ?"), c.push(i)), e && (p.push("date(createdAt) >= ?"), c.push(e)), r && (p.push("date(createdAt) <= ?"), c.push(r)), p.length > 0 && (n += " WHERE " + p.join(" AND ")), n += " ORDER BY createdAt DESC LIMIT ? OFFSET ?", c.push(o, s), t.prepare(n).all(...c);
}
function rt(o, s, i) {
  const e = m();
  let r = "SELECT COUNT(*) as count FROM activity_logs";
  const t = [], n = [];
  return o && (n.push("entityType = ?"), t.push(o)), s && (n.push("date(createdAt) >= ?"), t.push(s)), i && (n.push("date(createdAt) <= ?"), t.push(i)), n.length > 0 && (r += " WHERE " + n.join(" AND ")), e.prepare(r).get(...t);
}
function ot() {
  return m().prepare(`
    DELETE FROM activity_logs 
    WHERE id NOT IN (
      SELECT id FROM activity_logs 
      ORDER BY createdAt DESC 
      LIMIT 1000
    )
  `).run().changes;
}
function st(o) {
  const r = m().prepare(`
    INSERT INTO products (name, category, size, barcode, costPrice, price, stock, lowStockThreshold, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `).run(
    o.name,
    o.category,
    o.size || null,
    o.barcode || null,
    o.costPrice || 0,
    o.price,
    o.stock,
    o.lowStockThreshold,
    o.isActive !== !1 ? 1 : 0
  ).lastInsertRowid;
  return w(
    "create",
    "product",
    `Created product: ${o.name}`,
    r,
    void 0,
    JSON.stringify(o)
  ), r;
}
function nt(o = !1) {
  const s = m();
  let i = "SELECT * FROM products";
  return o || (i += " WHERE (isActive = 1 OR isActive IS NULL)"), i += " ORDER BY id DESC", s.prepare(i).all().map((t) => ({
    ...t,
    isActive: t.isActive === null ? !0 : !!t.isActive
  }));
}
function M(o) {
  const e = m().prepare("SELECT * FROM products WHERE id = ?").get(o);
  return e && {
    ...e,
    isActive: e.isActive === null ? !0 : !!e.isActive
  };
}
function it(o) {
  const e = m().prepare("SELECT * FROM products WHERE barcode = ?").get(o);
  return e && {
    ...e,
    isActive: e.isActive === null ? !0 : !!e.isActive
  };
}
function ct(o) {
  const i = m().prepare(`
    SELECT * FROM products 
    WHERE (name LIKE ? OR barcode LIKE ?) AND (isActive = 1 OR isActive IS NULL)
    ORDER BY name
  `), e = `%${o}%`;
  return i.all(e, e).map((t) => ({
    ...t,
    isActive: t.isActive === null ? !0 : !!t.isActive
  }));
}
function at(o) {
  return m().prepare("SELECT * FROM products WHERE category = ? AND (isActive = 1 OR isActive IS NULL) ORDER BY name").all(o).map((r) => ({
    ...r,
    isActive: r.isActive === null ? !0 : !!r.isActive
  }));
}
function lt() {
  return m().prepare(`
    SELECT * FROM products 
    WHERE stock <= lowStockThreshold 
    ORDER BY stock ASC, name
  `).all();
}
function ut(o, s) {
  const i = m(), e = M(o), r = [], t = [];
  s.name !== void 0 && (r.push("name = ?"), t.push(s.name)), s.category !== void 0 && (r.push("category = ?"), t.push(s.category)), s.size !== void 0 && (r.push("size = ?"), t.push(s.size || null)), s.barcode !== void 0 && (r.push("barcode = ?"), t.push(s.barcode || null)), s.costPrice !== void 0 && (r.push("costPrice = ?"), t.push(s.costPrice)), s.price !== void 0 && (r.push("price = ?"), t.push(s.price)), s.stock !== void 0 && (r.push("stock = ?"), t.push(s.stock)), s.lowStockThreshold !== void 0 && (r.push("lowStockThreshold = ?"), t.push(s.lowStockThreshold)), s.isActive !== void 0 && (r.push("isActive = ?"), t.push(s.isActive ? 1 : 0)), r.push("updatedAt = datetime('now')"), t.push(o);
  const c = i.prepare(`UPDATE products SET ${r.join(", ")} WHERE id = ?`).run(...t);
  return c.changes > 0 && e && w(
    "update",
    "product",
    `Updated product: ${e.name}`,
    o,
    JSON.stringify(e),
    JSON.stringify(s)
  ), c.changes > 0;
}
function B(o, s, i, e) {
  const r = m(), t = M(o);
  return r.transaction(() => {
    r.prepare(`
      UPDATE products 
      SET stock = stock + ?, updatedAt = datetime('now', 'localtime') 
      WHERE id = ?
    `).run(s, o), r.prepare(`
      INSERT INTO stock_logs (productId, changeType, quantityChange, referenceId, createdAt)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(o, i, s, e || null);
  })(), t && w(
    "update",
    "product",
    `${i === "sale" ? "Stock reduced (sale)" : i === "restock" ? "Stock increased (restock)" : "Stock adjusted"}: ${t.name} - Quantity: ${s > 0 ? "+" : ""}${s}`,
    o,
    void 0,
    JSON.stringify({ changeType: i, quantity: s, referenceId: e })
  ), !0;
}
function q(o, s = !1) {
  const i = m(), e = M(o), t = i.prepare(`
    SELECT COUNT(*) as count FROM bill_items WHERE productId = ?
  `).get(o);
  if (t.count > 0)
    if (s) {
      const l = i.prepare(`
        UPDATE products 
        SET isActive = 0, updatedAt = datetime('now', 'localtime') 
        WHERE id = ?
      `).run(o);
      return l.changes > 0 && e && w(
        "deactivate",
        "product",
        `Deactivated product: ${e.name} (referenced in ${t.count} bills)`,
        o,
        JSON.stringify(e),
        void 0
      ), {
        success: l.changes > 0,
        deactivated: !0,
        message: "Product deactivated successfully (was referenced in bills)"
      };
    } else
      throw new Error(`Cannot delete product. It is referenced in ${t.count} bill(s). Use deactivate option instead.`);
  const c = i.transaction(() => {
    i.prepare("DELETE FROM stock_logs WHERE productId = ?").run(o);
    const a = i.prepare("DELETE FROM products WHERE id = ?").run(o);
    if (a.changes === 0)
      throw new Error("Product not found");
    return a.changes > 0;
  })();
  return c && e && w(
    "delete",
    "product",
    `Deleted product: ${e.name}`,
    o,
    JSON.stringify(e),
    void 0
  ), { success: c, deleted: !0, message: "Product deleted successfully" };
}
function dt(o) {
  return q(o, !0);
}
function pt(o) {
  const s = m(), i = M(o), r = s.prepare(`
    UPDATE products 
    SET isActive = 1, updatedAt = datetime('now', 'localtime') 
    WHERE id = ?
  `).run(o);
  return r.changes > 0 && i && w(
    "reactivate",
    "product",
    `Reactivated product: ${i.name}`,
    o,
    void 0,
    JSON.stringify({ isActive: !0 })
  ), r.changes > 0;
}
function mt(o) {
  const s = m(), i = St(), r = s.transaction(() => {
    const l = s.prepare(`
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, customerMobileNumber, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(
      i,
      o.subtotal,
      o.discountPercent,
      o.discountAmount,
      o.total,
      o.paymentMode,
      o.cashAmount || 0,
      o.upiAmount || 0,
      o.customerMobileNumber || null
    ).lastInsertRowid, a = s.prepare(`
      INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of o.items) {
      const E = u.product.price * u.quantity;
      a.run(
        l,
        u.product.id,
        u.product.name,
        u.product.size || null,
        u.quantity,
        u.product.price,
        E
      ), B(u.product.id, -u.quantity, "sale", l);
    }
    return l;
  })(), n = s.prepare("SELECT * FROM bills WHERE id = ?").get(r);
  return w(
    "create",
    "bill",
    `Created bill: ${i} - Total: ₹${o.total} (${o.paymentMode})`,
    r,
    void 0,
    JSON.stringify({
      billNumber: i,
      total: o.total,
      paymentMode: o.paymentMode,
      itemCount: o.items.length
    })
  ), n;
}
function Et(o, s, i) {
  const e = m();
  let r = "SELECT * FROM bills";
  const t = [], n = [];
  if (o && s ? (n.push("date(createdAt) BETWEEN ? AND ?"), t.push(o, s)) : o ? (n.push("date(createdAt) >= ?"), t.push(o)) : s && (n.push("date(createdAt) <= ?"), t.push(s)), i && i.trim()) {
    n.push("(billNumber LIKE ? OR customerMobileNumber LIKE ?)");
    const c = `%${i.trim()}%`;
    t.push(c, c);
  }
  n.length > 0 && (r += " WHERE " + n.join(" AND ")), r += " ORDER BY createdAt DESC", console.log("Bills query:", r, "params:", t);
  try {
    const p = e.prepare(r).all(...t);
    return console.log("Bills query results:", p.length, "bills found"), p;
  } catch (c) {
    throw console.error("Error executing bills query:", c), c;
  }
}
function F(o) {
  const s = m(), e = s.prepare("SELECT * FROM bills WHERE id = ?").get(o);
  if (!e) return null;
  const t = s.prepare("SELECT * FROM bill_items WHERE billId = ?").all(o);
  return { bill: e, items: t };
}
function gt(o = 5) {
  return m().prepare(`
    SELECT * FROM bills 
    ORDER BY createdAt DESC 
    LIMIT ?
  `).all(o);
}
function ht(o) {
  const s = m(), i = o || (/* @__PURE__ */ new Date()).toISOString().split("T")[0], r = s.prepare(`
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
  `).get(i);
  return !r || r.totalBills === 0 ? {
    totalSales: 0,
    totalBills: 0,
    cashSales: 0,
    upiSales: 0,
    itemsSold: 0
  } : r;
}
function bt(o, s) {
  const r = m().prepare(`
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
  `).get(o, s);
  return !r || r.totalBills === 0 ? {
    totalSales: 0,
    totalBills: 0,
    cashSales: 0,
    upiSales: 0,
    itemsSold: 0
  } : r;
}
function ft(o, s = 5) {
  const i = m(), e = o || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return i.prepare(`
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
  `).all(e, s);
}
function St() {
  var p, l;
  const o = m(), i = ((p = o.prepare("SELECT value FROM settings WHERE key = ?").get("billPrefix")) == null ? void 0 : p.value) || "VP", e = o.prepare("SELECT value FROM settings WHERE key = ?"), r = parseInt(((l = e.get("startingBillNumber")) == null ? void 0 : l.value) || "1"), n = o.prepare(`
    SELECT billNumber FROM bills 
    WHERE billNumber LIKE ? 
    ORDER BY id DESC 
    LIMIT 1
  `).get(`${i}%`);
  let c = r;
  return n && (c = parseInt(n.billNumber.replace(i, "")) + 1), `${i}${c.toString().padStart(4, "0")}`;
}
function yt(o, s) {
  const i = m(), e = F(o);
  if (!e)
    throw new Error("Bill not found");
  return i.transaction(() => {
    if (s.items) {
      const p = i.prepare("SELECT * FROM bill_items WHERE billId = ?").all(o);
      for (const a of p)
        B(a.productId, a.quantity, "adjustment");
      i.prepare("DELETE FROM bill_items WHERE billId = ?").run(o);
      const l = i.prepare(`
        INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const a of s.items) {
        const u = a.product.price * a.quantity;
        l.run(
          o,
          a.product.id,
          a.product.name,
          a.product.size || null,
          a.quantity,
          a.product.price,
          u
        ), B(a.product.id, -a.quantity, "sale", o);
      }
    }
    const t = [], n = [];
    s.subtotal !== void 0 && (t.push("subtotal = ?"), n.push(s.subtotal)), s.discountPercent !== void 0 && (t.push("discountPercent = ?"), n.push(s.discountPercent)), s.discountAmount !== void 0 && (t.push("discountAmount = ?"), n.push(s.discountAmount)), s.total !== void 0 && (t.push("total = ?"), n.push(s.total)), s.paymentMode !== void 0 && (t.push("paymentMode = ?"), n.push(s.paymentMode)), s.cashAmount !== void 0 && (t.push("cashAmount = ?"), n.push(s.cashAmount)), s.upiAmount !== void 0 && (t.push("upiAmount = ?"), n.push(s.upiAmount)), t.length > 0 && (n.push(o), i.prepare(`
        UPDATE bills SET ${t.join(", ")} WHERE id = ?
      `).run(...n));
  })(), w(
    "update",
    "bill",
    `Updated bill: ${e.bill.billNumber}`,
    o,
    JSON.stringify(e),
    JSON.stringify(s)
  ), F(o);
}
function Tt(o) {
  const s = m(), i = F(o);
  if (!i)
    throw new Error("Bill not found");
  return s.transaction(() => {
    const t = s.prepare("SELECT * FROM bill_items WHERE billId = ?").all(o);
    for (const n of t)
      B(n.productId, n.quantity, "adjustment");
    s.prepare("DELETE FROM bill_items WHERE billId = ?").run(o), s.prepare("DELETE FROM bills WHERE id = ?").run(o);
  })(), w(
    "delete",
    "bill",
    `Deleted bill: ${i.bill.billNumber} - Total: ₹${i.bill.total}`,
    o,
    JSON.stringify(i),
    void 0
  ), { success: !0, message: "Bill deleted and stock restored" };
}
function _() {
  const i = m().prepare("SELECT key, value FROM settings").all(), e = {};
  for (const r of i)
    e[r.key] = r.value;
  return e;
}
function V(o) {
  const e = m().prepare("SELECT value FROM settings WHERE key = ?").get(o);
  return e == null ? void 0 : e.value;
}
function Nt(o, s) {
  const i = m(), e = V(o), t = i.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updatedAt) 
    VALUES (?, ?, datetime('now', 'localtime'))
  `).run(o, s);
  return t.changes > 0 && w(
    "update",
    "setting",
    `Updated setting: ${o}`,
    void 0,
    e,
    s
  ), t.changes > 0;
}
function X(o) {
  const s = m(), i = _();
  return s.transaction(() => {
    const r = s.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt) 
      VALUES (?, ?, datetime('now', 'localtime'))
    `);
    for (const [t, n] of Object.entries(o))
      r.run(t, n);
  })(), w(
    "update",
    "setting",
    `Updated multiple settings: ${Object.keys(o).join(", ")}`,
    void 0,
    JSON.stringify(i),
    JSON.stringify(o)
  ), !0;
}
function Pt() {
  const o = _();
  return {
    storeName: o.storeName || "Vogue Prism",
    addressLine1: o.addressLine1 || "",
    addressLine2: o.addressLine2 || "",
    phone: o.phone || "",
    gstNumber: o.gstNumber || "",
    billPrefix: o.billPrefix || "VP",
    startingBillNumber: parseInt(o.startingBillNumber || "1"),
    maxDiscountPercent: parseFloat(o.maxDiscountPercent || "20"),
    lowStockThreshold: parseInt(o.lowStockThreshold || "5"),
    printerName: o.printerName || "",
    paperWidth: o.paperWidth || "80mm",
    autoPrint: o.autoPrint === "true"
  };
}
function At(o, s) {
  return m().prepare(`
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
  `).all(o, s);
}
function Lt(o, s) {
  return m().prepare(`
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
  `).all(o, s);
}
function wt(o, s) {
  return m().prepare(`
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
  `).all(o, s);
}
function Rt(o, s) {
  return m().prepare(`
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
  `).all(o, s);
}
function Ot(o, s) {
  return m().prepare(`
    SELECT 
      paymentMode,
      COUNT(*) as billCount,
      SUM(total) as totalAmount,
      AVG(total) as averageAmount
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY paymentMode
  `).all(o, s);
}
function It(o) {
  return m().prepare(`
    SELECT 
      strftime('%H', createdAt) as hour,
      COUNT(*) as billCount,
      SUM(total) as totalAmount
    FROM bills
    WHERE date(createdAt) = ?
    GROUP BY strftime('%H', createdAt)
    ORDER BY hour
  `).all(o);
}
function Ct() {
  return m().prepare(`
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
  `).all();
}
function Dt(o, s, i = 10) {
  return m().prepare(`
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
  `).all(o, s, i);
}
async function Mt() {
  try {
    const o = m(), s = await W.showSaveDialog({
      title: "Export Database Backup",
      defaultPath: k.join(
        C.getPath("desktop"),
        `vogue-prism-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.sql`
      ),
      filters: [
        { name: "SQL Files", extensions: ["sql"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (s.canceled)
      return { success: !1, cancelled: !0 };
    const i = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0",
      data: {
        products: o.prepare("SELECT * FROM products ORDER BY id").all(),
        bills: o.prepare("SELECT * FROM bills ORDER BY id").all(),
        bill_items: o.prepare("SELECT * FROM bill_items ORDER BY id").all(),
        stock_logs: o.prepare("SELECT * FROM stock_logs ORDER BY id").all(),
        settings: o.prepare("SELECT * FROM settings ORDER BY key").all()
      }
    };
    let e = `-- Vogue Prism Database Backup
`;
    e += `-- Created: ${i.timestamp}
`, e += `-- Version: ${i.version}

`;
    const r = (n) => n == null ? "NULL" : typeof n == "string" ? `'${n.replace(/'/g, "''")}'` : String(n), t = (n, c) => {
      if (c.length === 0) return "";
      const p = Object.keys(c[0]);
      let l = `-- Table: ${n}
`;
      l += `DELETE FROM ${n};
`;
      for (const a of c) {
        const u = p.map((E) => r(a[E])).join(", ");
        l += `INSERT INTO ${n} (${p.join(", ")}) VALUES (${u});
`;
      }
      return l += `
`, l;
    };
    return e += t("settings", i.data.settings), e += t("products", i.data.products), e += t("bills", i.data.bills), e += t("bill_items", i.data.bill_items), e += t("stock_logs", i.data.stock_logs), x.writeFileSync(s.filePath, e, "utf8"), {
      success: !0,
      path: s.filePath,
      recordCount: {
        products: i.data.products.length,
        bills: i.data.bills.length,
        bill_items: i.data.bill_items.length,
        stock_logs: i.data.stock_logs.length,
        settings: i.data.settings.length
      }
    };
  } catch (o) {
    return console.error("Backup export error:", o), {
      success: !1,
      error: o instanceof Error ? o.message : "Unknown error"
    };
  }
}
async function Ut() {
  try {
    const o = await W.showOpenDialog({
      title: "Import Database Backup",
      filters: [
        { name: "SQL Files", extensions: ["sql"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (o.canceled || !o.filePaths.length)
      return { success: !1, cancelled: !0 };
    if ((await W.showMessageBox({
      type: "warning",
      title: "Confirm Database Restore",
      message: "This will replace all current data with the backup data. This action cannot be undone.",
      detail: "Are you sure you want to continue?",
      buttons: ["Cancel", "Restore"],
      defaultId: 0,
      cancelId: 0
    })).response === 0)
      return { success: !1, cancelled: !0 };
    const i = m(), e = o.filePaths[0], r = x.readFileSync(e, "utf8");
    return i.transaction(() => {
      i.exec("PRAGMA foreign_keys = OFF;");
      const n = r.split(`
`);
      let c = "";
      for (const p of n) {
        const l = p.trim();
        if (!(!l || l.startsWith("--")) && (c += p + `
`, l.endsWith(";"))) {
          const a = c.trim();
          if (a && a !== ";")
            try {
              i.exec(a);
            } catch (u) {
              console.error("Error executing statement:", a), console.error("Error:", u);
            }
          c = "";
        }
      }
      i.exec("PRAGMA foreign_keys = ON;");
    })(), {
      success: !0,
      requiresRestart: !0,
      message: "Database restored successfully. Please restart the application."
    };
  } catch (o) {
    return console.error("Backup import error:", o), {
      success: !1,
      error: o instanceof Error ? o.message : "Unknown error"
    };
  }
}
function kt() {
  const o = m();
  return {
    products: o.prepare("SELECT COUNT(*) as count FROM products").get(),
    bills: o.prepare("SELECT COUNT(*) as count FROM bills").get(),
    bill_items: o.prepare("SELECT COUNT(*) as count FROM bill_items").get(),
    stock_logs: o.prepare("SELECT COUNT(*) as count FROM stock_logs").get(),
    settings: o.prepare("SELECT COUNT(*) as count FROM settings").get(),
    database_size: vt()
  };
}
function vt() {
  try {
    const o = k.join(C.getPath("userData"), "billing.db"), s = x.statSync(o);
    return {
      bytes: s.size,
      mb: Math.round(s.size / 1024 / 1024 * 100) / 100
    };
  } catch {
    return { bytes: 0, mb: 0 };
  }
}
function Bt() {
  [
    "printer:getList",
    "printer:refresh",
    "printer:getStatus",
    "printer:testPrint",
    "printer:print",
    "printer:getSettings",
    "printer:setSettings"
  ].forEach((e) => {
    try {
      d.removeHandler(e);
    } catch {
    }
  }), d.handle("products:create", async (e, r) => {
    try {
      const t = st(r);
      return M(Number(t));
    } catch (t) {
      throw console.error("Error creating product:", t), t;
    }
  }), d.handle("products:getAll", async (e, r) => {
    try {
      return nt(r);
    } catch (t) {
      throw console.error("Error getting products:", t), t;
    }
  }), d.handle("products:getById", async (e, r) => {
    try {
      return M(r);
    } catch (t) {
      throw console.error("Error getting product by id:", t), t;
    }
  }), d.handle("products:getByBarcode", async (e, r) => {
    try {
      return it(r);
    } catch (t) {
      throw console.error("Error getting product by barcode:", t), t;
    }
  }), d.handle("products:search", async (e, r) => {
    try {
      return ct(r);
    } catch (t) {
      throw console.error("Error searching products:", t), t;
    }
  }), d.handle("products:getByCategory", async (e, r) => {
    try {
      return at(r);
    } catch (t) {
      throw console.error("Error getting products by category:", t), t;
    }
  }), d.handle("products:getLowStock", async () => {
    try {
      return lt();
    } catch (e) {
      throw console.error("Error getting low stock products:", e), e;
    }
  }), d.handle("products:update", async (e, r) => {
    try {
      const { id: t, ...n } = r;
      if (ut(t, n))
        return M(t);
      throw new Error("Product not found");
    } catch (t) {
      throw console.error("Error updating product:", t), t;
    }
  }), d.handle("products:updateStock", async (e, r, t, n) => {
    try {
      return { success: B(r, t, n) };
    } catch (c) {
      throw console.error("Error updating stock:", c), c;
    }
  }), d.handle("products:delete", async (e, r, t) => {
    try {
      return q(r, t);
    } catch (n) {
      throw console.error("Error deleting product:", n), n;
    }
  }), d.handle("products:deactivate", async (e, r) => {
    try {
      return dt(r);
    } catch (t) {
      throw console.error("Error deactivating product:", t), t;
    }
  }), d.handle("products:reactivate", async (e, r) => {
    try {
      return { success: pt(r) };
    } catch (t) {
      throw console.error("Error reactivating product:", t), t;
    }
  }), d.handle("bills:create", async (e, r) => {
    try {
      console.log("Creating bill with data:", r);
      const t = mt(r);
      return console.log("Bill created successfully:", t), t;
    } catch (t) {
      throw console.error("Error creating bill:", t), console.error("Bill data that caused error:", r), new Error(`Failed to create bill: ${t instanceof Error ? t.message : "Unknown error"}`);
    }
  }), d.handle("bills:getAll", async (e, r, t, n) => {
    try {
      console.log("bills:getAll called with:", { dateFrom: r, dateTo: t, searchQuery: n });
      const c = Et(r, t, n);
      return console.log("bills:getAll returning", c.length, "bills"), c;
    } catch (c) {
      throw console.error("Error getting bills:", c), c;
    }
  }), d.handle("bills:getById", async (e, r) => {
    try {
      return F(r);
    } catch (t) {
      throw console.error("Error getting bill by id:", t), t;
    }
  }), d.handle("bills:getRecent", async (e, r) => {
    try {
      return gt(r);
    } catch (t) {
      throw console.error("Error getting recent bills:", t), t;
    }
  }), d.handle("bills:getDailySummary", async (e, r) => {
    try {
      return ht(r);
    } catch (t) {
      throw console.error("Error getting daily summary:", t), t;
    }
  }), d.handle("bills:getDateRangeSummary", async (e, r, t) => {
    try {
      return bt(r, t);
    } catch (n) {
      throw console.error("Error getting date range summary:", n), n;
    }
  }), d.handle("bills:getTopSelling", async (e, r) => {
    try {
      return ft(r);
    } catch (t) {
      throw console.error("Error getting top selling:", t), t;
    }
  }), d.handle("bills:update", async (e, r, t) => {
    try {
      return yt(r, t);
    } catch (n) {
      throw console.error("Error updating bill:", n), n;
    }
  }), d.handle("bills:delete", async (e, r) => {
    try {
      return Tt(r);
    } catch (t) {
      throw console.error("Error deleting bill:", t), t;
    }
  }), d.handle("settings:getAll", async () => {
    try {
      return _();
    } catch (e) {
      throw console.error("Error getting settings:", e), e;
    }
  }), d.handle("settings:get", async (e, r) => {
    try {
      return V(r);
    } catch (t) {
      throw console.error("Error getting setting:", t), t;
    }
  }), d.handle("settings:update", async (e, r, t) => {
    try {
      return { success: Nt(r, t) };
    } catch (n) {
      throw console.error("Error updating setting:", n), n;
    }
  }), d.handle("settings:updateAll", async (e, r) => {
    try {
      return { success: X(r) };
    } catch (t) {
      throw console.error("Error updating all settings:", t), t;
    }
  }), d.handle("settings:getTyped", async () => {
    try {
      return Pt();
    } catch (e) {
      throw console.error("Error getting typed settings:", e), e;
    }
  }), d.handle("reports:getSales", async (e, r, t) => {
    try {
      return At(r, t);
    } catch (n) {
      throw console.error("Error getting sales report:", n), n;
    }
  }), d.handle("reports:exportData", async (e, r, t) => {
    try {
      return Lt(r, t);
    } catch (n) {
      throw console.error("Error exporting data:", n), n;
    }
  }), d.handle("reports:getStockMovement", async (e, r, t) => {
    try {
      return wt(r, t);
    } catch (n) {
      throw console.error("Error getting stock movement report:", n), n;
    }
  }), d.handle("reports:getCategorySales", async (e, r, t) => {
    try {
      return Rt(r, t);
    } catch (n) {
      throw console.error("Error getting category sales:", n), n;
    }
  }), d.handle("reports:getPaymentModeSummary", async (e, r, t) => {
    try {
      return Ot(r, t);
    } catch (n) {
      throw console.error("Error getting payment mode summary:", n), n;
    }
  }), d.handle("reports:getHourlySales", async (e, r) => {
    try {
      return It(r);
    } catch (t) {
      throw console.error("Error getting hourly sales:", t), t;
    }
  }), d.handle("reports:getLowStockAlert", async () => {
    try {
      return Ct();
    } catch (e) {
      throw console.error("Error getting low stock alert:", e), e;
    }
  }), d.handle("reports:getProductPerformance", async (e, r, t, n) => {
    try {
      return Dt(r, t, n);
    } catch (c) {
      throw console.error("Error getting product performance:", c), c;
    }
  }), d.handle("backup:export", async () => {
    try {
      return await Mt();
    } catch (e) {
      throw console.error("Error exporting backup:", e), e;
    }
  }), d.handle("backup:import", async () => {
    try {
      return await Ut();
    } catch (e) {
      throw console.error("Error importing backup:", e), e;
    }
  }), d.handle("backup:getStats", async () => {
    try {
      return kt();
    } catch (e) {
      throw console.error("Error getting database stats:", e), e;
    }
  });
  const s = Q(J), i = async () => {
    var t, n, c, p, l, a;
    const e = [];
    if (process.platform === "win32")
      try {
        const { stdout: u } = await s('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Default | ConvertTo-Json"'), E = JSON.parse(u), S = Array.isArray(E) ? E : [E];
        for (const h of S) {
          if (!h || !h.Name) continue;
          let g = "unknown";
          switch (h.PrinterStatus) {
            case 0:
              g = "idle";
              break;
            case 1:
              g = "paused";
              break;
            case 2:
              g = "error";
              break;
            case 3:
              g = "pending_deletion";
              break;
            case 4:
              g = "paper_jam";
              break;
            case 5:
              g = "paper_out";
              break;
            case 6:
              g = "manual_feed";
              break;
            case 7:
              g = "paper_problem";
              break;
            case 8:
              g = "offline";
              break;
            default:
              g = "idle";
          }
          const T = h.Name, b = ((t = h.PortName) == null ? void 0 : t.includes("\\\\")) || ((n = h.PortName) == null ? void 0 : n.includes("IP_"));
          e.push({
            name: T,
            displayName: T,
            description: h.DriverName || "Windows Printer",
            location: b ? "Network" : "Local",
            status: g,
            isDefault: h.Default === !0,
            deviceUri: h.PortName || "",
            makeModel: h.DriverName || "",
            paperSize: T.toLowerCase().includes("80") || T.toLowerCase().includes("pos") ? "80mm" : T.toLowerCase().includes("58") ? "58mm" : "Unknown",
            driverName: h.DriverName || "",
            isNetworkPrinter: b,
            capabilities: []
          });
        }
        console.log(`Found ${e.length} Windows printers`);
      } catch (u) {
        console.error("Error getting Windows printers via PowerShell:", u);
        try {
          const { stdout: E } = await s("wmic printer get Name,DriverName,PortName,Default /format:csv"), S = E.split(`
`).filter((h) => h.trim() && !h.startsWith("Node"));
          for (const h of S) {
            const g = h.split(",");
            if (g.length >= 4) {
              const T = ((c = g[1]) == null ? void 0 : c.trim().toLowerCase()) === "true", b = ((p = g[2]) == null ? void 0 : p.trim()) || "", P = ((l = g[3]) == null ? void 0 : l.trim()) || "", A = ((a = g[4]) == null ? void 0 : a.trim()) || "";
              P && e.push({
                name: P,
                displayName: P,
                description: b || "Windows Printer",
                location: A != null && A.includes("\\\\") ? "Network" : "Local",
                status: "idle",
                isDefault: T,
                deviceUri: A,
                makeModel: b,
                paperSize: P.toLowerCase().includes("80") || P.toLowerCase().includes("pos") ? "80mm" : "Unknown",
                driverName: b,
                isNetworkPrinter: (A == null ? void 0 : A.includes("\\\\")) || !1,
                capabilities: []
              });
            }
          }
          console.log(`Found ${e.length} Windows printers via WMIC`);
        } catch (E) {
          console.error("Error getting Windows printers via WMIC:", E);
        }
      }
    else
      try {
        const { stdout: u } = await s("lpstat -p -d"), E = u.split(`
`).filter((g) => g.trim());
        let S = "";
        const h = [];
        for (const g of E)
          g.startsWith("system default destination:") ? S = g.split(":")[1].trim() : g.startsWith("printer ") && h.push(g);
        for (const g of h) {
          const T = g.match(/printer (\S+) (.+)/);
          if (T) {
            const b = T[1], P = T[2];
            try {
              const { stdout: A } = await s(`lpoptions -p ${b} -l`), { stdout: R } = await s(`lpstat -p ${b}`);
              let U = "unknown";
              R.includes("is idle") ? U = "idle" : R.includes("is printing") ? U = "printing" : R.includes("disabled") && (U = "offline");
              let O = "", I = "";
              try {
                const { stdout: N } = await s(`lpoptions -p ${b} | grep device-uri`), L = N.match(/device-uri=(\S+)/);
                L && (O = L[1]);
              } catch {
              }
              try {
                const { stdout: N } = await s(`lpoptions -p ${b} | grep printer-make-and-model`), L = N.match(/printer-make-and-model=(.+)/);
                L && (I = L[1]);
              } catch {
              }
              e.push({
                name: b,
                displayName: b,
                description: P.replace(/is\s+(idle|printing|disabled).*/, "").trim(),
                location: O.includes("usb://") ? "USB" : O.includes("network://") ? "Network" : "Local",
                status: U,
                isDefault: b === S,
                deviceUri: O,
                makeModel: I,
                paperSize: b.toLowerCase().includes("80") ? "80mm" : b.toLowerCase().includes("58") ? "58mm" : "Unknown",
                driverName: I,
                isNetworkPrinter: O.includes("ipp://") || O.includes("http://") || O.includes("socket://"),
                capabilities: A.split(`
`).filter((N) => N.includes("/")).map((N) => N.split("/")[0])
              });
            } catch {
              e.push({
                name: b,
                displayName: b,
                description: P.replace(/is\s+(idle|printing|disabled).*/, "").trim(),
                location: "Unknown",
                status: "unknown",
                isDefault: b === S,
                deviceUri: "",
                makeModel: "",
                paperSize: "Unknown",
                driverName: "",
                isNetworkPrinter: !1,
                capabilities: []
              });
            }
          }
        }
      } catch {
        console.log("CUPS not available");
      }
    return e.length === 0 && e.push({
      name: "Default",
      displayName: "Default Printer",
      description: "System Default Printer",
      location: "System",
      status: "unknown",
      isDefault: !0,
      deviceUri: "",
      makeModel: "",
      paperSize: "Unknown",
      driverName: "",
      isNetworkPrinter: !1,
      capabilities: []
    }), e;
  };
  d.handle("printer:getList", async () => {
    try {
      return await i();
    } catch (e) {
      return console.error("Error getting printers:", e), [{
        name: "Default",
        displayName: "Default Printer",
        description: "System Default Printer",
        location: "System",
        status: "unknown",
        isDefault: !0,
        deviceUri: "",
        makeModel: "",
        paperSize: "Unknown",
        driverName: "",
        isNetworkPrinter: !1,
        capabilities: []
      }];
    }
  }), d.handle("printer:refresh", async () => {
    try {
      return await i();
    } catch (e) {
      return console.error("Error refreshing printers:", e), [{
        name: "Default",
        displayName: "Default Printer",
        description: "System Default Printer",
        location: "System",
        status: "unknown",
        isDefault: !0,
        deviceUri: "",
        makeModel: "",
        paperSize: "Unknown",
        driverName: "",
        isNetworkPrinter: !1,
        capabilities: []
      }];
    }
  }), d.handle("printer:getStatus", async (e, r) => {
    try {
      if (process.platform === "win32") {
        const n = r.replace(/'/g, "''"), { stdout: c } = await s(`powershell -Command "(Get-Printer -Name '${n}').PrinterStatus"`), p = parseInt(c.trim(), 10);
        let l = "unknown", a = `Printer: ${r}`;
        switch (p) {
          case 0:
            l = "idle", a = "Printer is ready";
            break;
          case 1:
            l = "paused", a = "Printer is paused";
            break;
          case 2:
            l = "error", a = "Printer has an error";
            break;
          case 3:
            l = "pending_deletion", a = "Printer pending deletion";
            break;
          case 4:
            l = "paper_jam", a = "Paper jam";
            break;
          case 5:
            l = "paper_out", a = "Out of paper";
            break;
          case 6:
            l = "manual_feed", a = "Manual feed required";
            break;
          case 7:
            l = "paper_problem", a = "Paper problem";
            break;
          case 8:
            l = "offline", a = "Printer is offline";
            break;
          default:
            l = "idle", a = "Printer is ready";
        }
        return { status: l, details: a };
      } else {
        const { stdout: n } = await s(`lpstat -p ${r}`);
        let c = "unknown", p = n.trim();
        return n.includes("is idle") ? c = "idle" : n.includes("is printing") ? c = "printing" : n.includes("disabled") && (c = "offline"), { status: c, details: p };
      }
    } catch (t) {
      return { status: "error", details: `Error checking printer status: ${t}` };
    }
  }), d.handle("printer:testPrint", async (e, r, t) => {
    try {
      const n = process.platform === "win32";
      let c = t || `================================================
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
      c = c.replace(/₹/g, "Rs.");
      const p = Buffer.from([27, 64]), l = Buffer.from([27, 61, 1]), a = Buffer.from([27, 97, 0]), u = Buffer.from([27, 33, 0]), E = Buffer.from([27, 51, 32]), S = Buffer.from([27, 82, 0]), h = Buffer.from([10, 10, 10, 10]), g = Buffer.from([29, 86, 1]), T = Buffer.from([29, 86, 0]), b = await import("fs"), P = await import("path"), A = await import("os"), R = P.join(A.tmpdir(), `print-${Date.now()}.txt`), U = Buffer.from(c, "ascii"), O = Buffer.concat([
        p,
        // Initialize printer
        l,
        // Wake up printer
        a,
        // Set alignment
        u,
        // Set font
        E,
        // Set line spacing
        S,
        // Set character set
        U,
        // Receipt content
        h,
        // Feed paper
        g
        // Cut paper (partial cut is more reliable)
      ]);
      if (b.writeFileSync(R, O), n) {
        const I = r.replace(/'/g, "''").replace(/"/g, '""');
        try {
          let N = "UNKNOWN";
          try {
            const { stdout: y } = await s(`powershell -Command "try { (Get-Printer -Name '${I}').PortName } catch { 'UNKNOWN' }"`);
            N = y.trim();
          } catch {
            console.log("Could not get port name");
          }
          console.log(`Windows printer: ${r}, Port: ${N}`);
          let L = !1, D = "";
          console.log("Trying Method 1: .NET RawPrinterHelper...");
          try {
            const y = `
$ErrorActionPreference = 'Stop'
$printerName = '${I}'
$filePath = '${R.replace(/\\/g, "\\\\")}'

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
`, $ = P.join(A.tmpdir(), `print1-${Date.now()}.ps1`);
            b.writeFileSync($, y, "utf8");
            const { stdout: H } = await s(`powershell -ExecutionPolicy Bypass -File "${$}"`, { timeout: 3e4 });
            setTimeout(() => {
              try {
                b.unlinkSync($);
              } catch {
              }
            }, 1e3), H.trim().includes("SUCCESS") ? (L = !0, console.log("✓ Method 1 succeeded")) : (D = H.trim(), console.log(`Method 1 failed: ${D}`));
          } catch (y) {
            D = y.message, console.log(`Method 1 exception: ${y.message}`);
          }
          if (!L) {
            console.log("Trying Method 2: Windows print command...");
            try {
              await s(`print /D:"${r}" "${R}"`, { timeout: 15e3 }), L = !0, console.log("✓ Method 2 succeeded");
            } catch (y) {
              D = y.message, console.log(`Method 2 failed: ${y.message}`);
            }
          }
          if (!L) {
            console.log("Trying Method 3: Out-Printer...");
            try {
              const y = c.replace(/'/g, "''");
              await s(`powershell -Command "'${y}' | Out-Printer -Name '${I}'"`, { timeout: 15e3 }), L = !0, console.log("✓ Method 3 succeeded");
            } catch (y) {
              D = y.message, console.log(`Method 3 failed: ${y.message}`);
            }
          }
          if (!L) {
            console.log("Trying Method 4: Copy to printer...");
            try {
              await s(`copy /b "${R}" "\\\\%COMPUTERNAME%\\${r}"`, { timeout: 15e3 }), L = !0, console.log("✓ Method 4 succeeded");
            } catch (y) {
              D = y.message, console.log(`Method 4 failed: ${y.message}`);
            }
          }
          if (!L)
            throw new Error(`All print methods failed. Last error: ${D}`);
          console.log("✓ Successfully printed to Windows printer");
        } catch (N) {
          throw console.error("❌ Windows printing error:", N), N;
        }
      } else
        await s(`lp -d "${r}" -o raw "${R}"`);
      return setTimeout(() => {
        try {
          b.unlinkSync(R);
        } catch {
        }
      }, 5e3), { success: !0 };
    } catch (n) {
      return console.error("Print error:", n), { success: !1, error: `Print failed: ${n}` };
    }
  }), d.handle("printer:debugTest", async (e, r) => {
    try {
      const t = process.platform === "win32", n = await import("fs"), c = await import("path"), p = await import("os"), l = `
PRINTER TEST
============
Time: ${(/* @__PURE__ */ new Date()).toLocaleString()}
Printer: ${r}
============
If you see this, printing works!


`, a = c.join(p.tmpdir(), `debug-${Date.now()}.txt`);
      if (n.writeFileSync(a, l, "ascii"), console.log(`Debug test - Printer: ${r}, Platform: ${process.platform}`), t) {
        const u = r.replace(/'/g, "''").replace(/"/g, '""');
        try {
          console.log("Trying Windows raw print...");
          const E = `
$ErrorActionPreference = 'Stop'
$printerName = '${u}'
$filePath = '${a.replace(/\\/g, "\\\\")}'

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
`, S = c.join(p.tmpdir(), `debugprint-${Date.now()}.ps1`);
          n.writeFileSync(S, E, "utf8");
          const { stdout: h } = await s(`powershell -ExecutionPolicy Bypass -File "${S}"`, { timeout: 3e4 });
          if (setTimeout(() => {
            try {
              n.unlinkSync(S);
            } catch {
            }
          }, 1e3), h.trim().includes("SUCCESS"))
            return console.log("Windows raw print succeeded"), setTimeout(() => {
              try {
                n.unlinkSync(a);
              } catch {
              }
            }, 2e3), { success: !0, message: "Debug test sent successfully" };
          console.log(`Windows raw print failed: ${h.trim()}`);
        } catch (E) {
          console.log(`Windows print exception: ${E.message}`);
        }
        console.log("Trying Out-Printer...");
        try {
          const E = l.replace(/'/g, "''");
          return await s(`powershell -Command "'${E}' | Out-Printer -Name '${u}'"`, { timeout: 15e3 }), console.log("Out-Printer succeeded"), setTimeout(() => {
            try {
              n.unlinkSync(a);
            } catch {
            }
          }, 2e3), { success: !0, message: "Debug test sent successfully" };
        } catch (E) {
          console.log(`Out-Printer failed: ${E.message}`);
        }
        return setTimeout(() => {
          try {
            n.unlinkSync(a);
          } catch {
          }
        }, 2e3), { success: !1, error: "All Windows print methods failed" };
      } else {
        console.log("Trying Linux print methods...");
        try {
          const { stdout: u } = await s(`lpstat -p "${r}" 2>&1`);
          console.log("Printer status:", u.trim());
        } catch {
          console.log("Could not get printer status");
        }
        try {
          return await s(`lp -d "${r}" -o raw "${a}"`), console.log("lp -o raw succeeded"), setTimeout(() => {
            try {
              n.unlinkSync(a);
            } catch {
            }
          }, 2e3), { success: !0, message: "Debug test sent via lp -o raw" };
        } catch (u) {
          console.log("lp -o raw failed:", u.message);
        }
        try {
          return await s(`lp -d "${r}" "${a}"`), console.log("lp succeeded"), setTimeout(() => {
            try {
              n.unlinkSync(a);
            } catch {
            }
          }, 2e3), { success: !0, message: "Debug test sent via lp" };
        } catch (u) {
          console.log("lp failed:", u.message);
        }
        try {
          return await s(`lpr -P "${r}" "${a}"`), console.log("lpr succeeded"), setTimeout(() => {
            try {
              n.unlinkSync(a);
            } catch {
            }
          }, 2e3), { success: !0, message: "Debug test sent via lpr" };
        } catch (u) {
          console.log("lpr failed:", u.message);
        }
        try {
          return await s(`echo "${l}" | lp -d "${r}"`), console.log("echo | lp succeeded"), setTimeout(() => {
            try {
              n.unlinkSync(a);
            } catch {
            }
          }, 2e3), { success: !0, message: "Debug test sent via echo | lp" };
        } catch (u) {
          console.log("echo | lp failed:", u.message);
        }
        return setTimeout(() => {
          try {
            n.unlinkSync(a);
          } catch {
          }
        }, 2e3), { success: !1, error: "All Linux print methods failed. Check CUPS configuration and printer permissions." };
      }
    } catch (t) {
      return console.error("Debug test error:", t), { success: !1, error: `Debug test error: ${t}` };
    }
  }), d.handle("printer:print", async (e, r, t, n) => {
    try {
      const { BrowserWindow: c } = await import("electron"), p = new c({
        show: !1,
        webPreferences: {
          nodeIntegration: !1,
          contextIsolation: !0
        }
      });
      await p.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(r)}`);
      const l = {
        silent: !0,
        printBackground: !0,
        deviceName: t || void 0,
        margins: {
          marginType: "none"
        },
        pageSize: "A4"
      }, a = await p.webContents.print(l);
      return p.close(), { success: !0 };
    } catch (c) {
      return console.error("Error printing:", c), {
        success: !1,
        error: c instanceof Error ? c.message : "Print failed"
      };
    }
  }), d.handle("logs:getActivity", async (e, r, t, n, c, p) => {
    try {
      return et(r, t, n, c, p);
    } catch (l) {
      throw console.error("Error getting activity logs:", l), l;
    }
  }), d.handle("logs:getCount", async (e, r, t, n) => {
    try {
      return rt(r, t, n);
    } catch (c) {
      throw console.error("Error getting logs count:", c), c;
    }
  }), d.handle("logs:cleanup", async () => {
    try {
      return { success: !0, deletedCount: ot() };
    } catch (e) {
      throw console.error("Error cleaning up logs:", e), e;
    }
  }), d.handle("printer:getSettings", async () => {
    try {
      const e = _();
      return {
        selectedPrinter: e.selectedPrinter || "",
        paperWidth: e.paperWidth || "80mm",
        autoPrint: e.autoPrint === "true",
        printDensity: e.printDensity || "medium",
        cutPaper: e.cutPaper === "true",
        printSpeed: e.printSpeed || "medium",
        encoding: e.encoding || "utf8"
      };
    } catch (e) {
      return console.error("Error getting printer settings:", e), {
        selectedPrinter: "",
        paperWidth: "80mm",
        autoPrint: !1,
        printDensity: "medium",
        cutPaper: !0,
        printSpeed: "medium",
        encoding: "utf8"
      };
    }
  }), d.handle("printer:setSettings", async (e, r) => {
    try {
      const t = {};
      return r.selectedPrinter !== void 0 && (t.selectedPrinter = r.selectedPrinter), r.paperWidth !== void 0 && (t.paperWidth = r.paperWidth), r.autoPrint !== void 0 && (t.autoPrint = r.autoPrint.toString()), r.printDensity !== void 0 && (t.printDensity = r.printDensity), r.cutPaper !== void 0 && (t.cutPaper = r.cutPaper.toString()), r.printSpeed !== void 0 && (t.printSpeed = r.printSpeed), r.encoding !== void 0 && (t.encoding = r.encoding), X(t), { success: !0 };
    } catch (t) {
      return console.error("Error saving printer settings:", t), { success: !1, error: `Failed to save printer settings: ${t}` };
    }
  }), d.handle("printer:fastPrint", async (e, r, t) => {
    try {
      const n = process.platform === "win32";
      t = t.replace(/₹/g, "Rs.");
      const c = await import("fs"), p = await import("path"), l = await import("os"), a = p.join(l.tmpdir(), `fastprint-${Date.now()}.txt`);
      if (n) {
        const u = r.replace(/"/g, '""');
        try {
          const { stdout: E } = await s(`powershell -Command "try { (Get-Printer -Name '${u}').PortName } catch { 'UNKNOWN' }"`), S = E.trim();
          if (S && (S.includes("USB") || S.includes("COM") || S.includes("LPT"))) {
            const h = Buffer.from([27, 64]), g = Buffer.from([27, 97, 0]), T = Buffer.from(t, "ascii"), b = Buffer.from([10, 10, 10, 10, 29, 86, 1]), P = Buffer.concat([h, g, T, b]);
            return c.writeFileSync(a, P), await s(`copy "${a}" "${S}" /B`, { timeout: 8e3 }), setTimeout(() => {
              try {
                c.unlinkSync(a);
              } catch {
              }
            }, 1e3), { success: !0 };
          }
        } catch (E) {
          console.log("Port method failed:", E.message);
        }
        try {
          const E = Buffer.from([27, 64]), S = Buffer.from(t, "ascii"), h = Buffer.from([10, 10, 10, 29, 86, 1]), g = Buffer.concat([E, S, h]);
          c.writeFileSync(a, g);
          const T = `
$printerName = "${u}"
$filePath = "${a.replace(/\\/g, "\\\\")}"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$printer = New-Object -ComObject WScript.Network
$printer.SetDefaultPrinter($printerName)
$shell = New-Object -ComObject WScript.Shell
$shell.Run("notepad /p \\"$filePath\\"", 0, $true)
`, b = p.join(l.tmpdir(), `fastprint-${Date.now()}.ps1`);
          return c.writeFileSync(b, T, "utf8"), await s(`powershell -ExecutionPolicy Bypass -File "${b}"`, { timeout: 8e3 }), setTimeout(() => {
            try {
              c.unlinkSync(a), c.unlinkSync(b);
            } catch {
            }
          }, 2e3), { success: !0 };
        } catch (E) {
          console.log("PowerShell method failed:", E.message);
        }
        try {
          return c.writeFileSync(a, t, "utf8"), await s(`print "${a}"`, { timeout: 8e3 }), setTimeout(() => {
            try {
              c.unlinkSync(a);
            } catch {
            }
          }, 1e3), { success: !0 };
        } catch {
          return { success: !1, error: "All fast print methods failed" };
        }
      } else
        try {
          const u = Buffer.from([27, 64]), E = Buffer.from(t, "ascii"), S = Buffer.from([10, 10, 10, 29, 86, 1]), h = Buffer.concat([u, E, S]);
          return c.writeFileSync(a, h), await s(`lp -d "${r}" -o raw "${a}"`, { timeout: 8e3 }), setTimeout(() => {
            try {
              c.unlinkSync(a);
            } catch {
            }
          }, 1e3), { success: !0 };
        } catch (u) {
          return { success: !1, error: "Fast print failed: " + u.message };
        }
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), console.log("All IPC handlers set up successfully");
}
const Ft = j(import.meta.url), G = k.dirname(Ft);
let v = null;
function z() {
  v = new Y({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: k.join(G, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "default",
    title: "Vogue Prism - Billing Software"
  }), v.setMenuBarVisibility(!1), process.env.VITE_DEV_SERVER_URL ? v.loadURL(process.env.VITE_DEV_SERVER_URL) : v.loadFile(k.join(G, "../dist/index.html"));
}
C.on("window-all-closed", () => {
  process.platform !== "darwin" && (C.quit(), v = null);
});
C.on("activate", () => {
  Y.getAllWindows().length === 0 && z();
});
C.whenReady().then(async () => {
  await Z(), Bt(), z();
});
C.on("before-quit", async () => {
  await tt();
});

import { app as T, dialog as y, ipcMain as i, BrowserWindow as I } from "electron";
import h from "path";
import { fileURLToPath as D } from "node:url";
import M from "better-sqlite3";
import L from "fs";
let u;
async function v() {
  const t = h.join(T.getPath("userData"), "billing.db");
  u = new M(t), u.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      size TEXT,
      barcode TEXT UNIQUE,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      lowStockThreshold INTEGER NOT NULL DEFAULT 5,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try {
    u.prepare("PRAGMA table_info(products)").all().some((n) => n.name === "isActive") || (console.log("Adding isActive column to products table..."), u.exec("ALTER TABLE products ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1"), console.log("Migration completed: isActive column added"));
  } catch (o) {
    console.error("Migration error:", o);
  }
  u.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL CHECK (entityType IN ('product', 'bill', 'setting', 'system')),
      entityId INTEGER,
      details TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT,
      userId TEXT DEFAULT 'system',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try {
    const o = u.prepare("PRAGMA table_info(bills)").all(), s = o.some((c) => c.name === "cashAmount"), n = o.some((c) => c.name === "upiAmount");
    s || (console.log("Adding cashAmount column to bills table..."), u.exec("ALTER TABLE bills ADD COLUMN cashAmount REAL DEFAULT 0")), n || (console.log("Adding upiAmount column to bills table..."), u.exec("ALTER TABLE bills ADD COLUMN upiAmount REAL DEFAULT 0"));
    try {
      u.prepare(`
        INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount)
        VALUES ('TEST_MIXED', 100, 0, 0, 100, 'mixed', 50, 50)
      `).run(), u.exec("DELETE FROM bills WHERE billNumber = 'TEST_MIXED'"), console.log("Mixed payment mode already supported");
    } catch {
      console.log("Updating bills table to support mixed payment mode..."), u.exec("PRAGMA foreign_keys = OFF;"), u.exec("DROP TABLE IF EXISTS bills_backup;"), u.exec(`
        CREATE TABLE bills_backup AS SELECT * FROM bills;
      `), u.exec("DROP TABLE bills;"), u.exec(`
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
          createdAt TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `), u.exec(`
        INSERT INTO bills (id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, status, createdAt)
        SELECT id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, 
               COALESCE(cashAmount, 0), COALESCE(upiAmount, 0), status, createdAt
        FROM bills_backup;
      `), u.exec("DROP TABLE bills_backup;"), u.exec("PRAGMA foreign_keys = ON;"), console.log("Bills table updated to support mixed payment mode");
    }
    (!s || !n) && console.log("Migration completed: payment columns added");
  } catch (o) {
    console.error("Bills migration error:", o);
  }
  u.exec(`
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
  `), u.exec(`
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
  `), u.exec(`
    CREATE TABLE IF NOT EXISTS stock_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      changeType TEXT NOT NULL CHECK (changeType IN ('sale', 'restock', 'adjustment')),
      quantityChange INTEGER NOT NULL,
      referenceId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (productId) REFERENCES products (id)
    );
  `), u.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const r = [
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
  ], e = u.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [o, s] of r)
    e.run(o, s);
  u.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
    CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(createdAt);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(billId);
    CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(productId);
  `), console.log("Database initialized at", t);
}
function a() {
  if (!u) throw new Error("Database not initialized");
  return u;
}
async function P() {
  u && (u.close(), console.log("Database closed"));
}
function b(t, r, e, o, s, n, c) {
  return a().prepare(`
    INSERT INTO activity_logs (action, entityType, entityId, details, oldValue, newValue, userId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    t,
    r,
    o || null,
    e,
    s || null,
    n || null,
    "system"
  ).lastInsertRowid;
}
function _(t = 100, r = 0, e, o, s) {
  const n = a();
  let c = "SELECT * FROM activity_logs";
  const l = [], p = [];
  return e && (p.push("entityType = ?"), l.push(e)), o && (p.push("date(createdAt) >= ?"), l.push(o)), s && (p.push("date(createdAt) <= ?"), l.push(s)), p.length > 0 && (c += " WHERE " + p.join(" AND ")), c += " ORDER BY createdAt DESC LIMIT ? OFFSET ?", l.push(t, r), n.prepare(c).all(...l);
}
function F(t, r, e) {
  const o = a();
  let s = "SELECT COUNT(*) as count FROM activity_logs";
  const n = [], c = [];
  return t && (c.push("entityType = ?"), n.push(t)), r && (c.push("date(createdAt) >= ?"), n.push(r)), e && (c.push("date(createdAt) <= ?"), n.push(e)), c.length > 0 && (s += " WHERE " + c.join(" AND ")), o.prepare(s).get(...n);
}
function k() {
  return a().prepare(`
    DELETE FROM activity_logs 
    WHERE id NOT IN (
      SELECT id FROM activity_logs 
      ORDER BY createdAt DESC 
      LIMIT 1000
    )
  `).run().changes;
}
function B(t) {
  const s = a().prepare(`
    INSERT INTO products (name, category, size, barcode, price, stock, lowStockThreshold, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    t.name,
    t.category,
    t.size || null,
    t.barcode || null,
    t.price,
    t.stock,
    t.lowStockThreshold,
    t.isActive !== !1 ? 1 : 0
  ).lastInsertRowid;
  return b(
    "create",
    "product",
    `Created product: ${t.name}`,
    s,
    void 0,
    JSON.stringify(t)
  ), s;
}
function W(t = !1) {
  const r = a();
  let e = "SELECT * FROM products";
  return t || (e += " WHERE (isActive = 1 OR isActive IS NULL)"), e += " ORDER BY id DESC", r.prepare(e).all().map((n) => ({
    ...n,
    isActive: n.isActive === null ? !0 : !!n.isActive
  }));
}
function g(t) {
  const o = a().prepare("SELECT * FROM products WHERE id = ?").get(t);
  return o && {
    ...o,
    isActive: o.isActive === null ? !0 : !!o.isActive
  };
}
function H(t) {
  const o = a().prepare("SELECT * FROM products WHERE barcode = ?").get(t);
  return o && {
    ...o,
    isActive: o.isActive === null ? !0 : !!o.isActive
  };
}
function x(t) {
  const e = a().prepare(`
    SELECT * FROM products 
    WHERE (name LIKE ? OR barcode LIKE ?) AND (isActive = 1 OR isActive IS NULL)
    ORDER BY name
  `), o = `%${t}%`;
  return e.all(o, o).map((n) => ({
    ...n,
    isActive: n.isActive === null ? !0 : !!n.isActive
  }));
}
function X(t) {
  return a().prepare("SELECT * FROM products WHERE category = ? AND (isActive = 1 OR isActive IS NULL) ORDER BY name").all(t).map((s) => ({
    ...s,
    isActive: s.isActive === null ? !0 : !!s.isActive
  }));
}
function Y() {
  return a().prepare(`
    SELECT * FROM products 
    WHERE stock <= lowStockThreshold 
    ORDER BY stock ASC, name
  `).all();
}
function $(t, r) {
  const e = a(), o = g(t), s = [], n = [];
  r.name !== void 0 && (s.push("name = ?"), n.push(r.name)), r.category !== void 0 && (s.push("category = ?"), n.push(r.category)), r.size !== void 0 && (s.push("size = ?"), n.push(r.size || null)), r.barcode !== void 0 && (s.push("barcode = ?"), n.push(r.barcode || null)), r.price !== void 0 && (s.push("price = ?"), n.push(r.price)), r.stock !== void 0 && (s.push("stock = ?"), n.push(r.stock)), r.lowStockThreshold !== void 0 && (s.push("lowStockThreshold = ?"), n.push(r.lowStockThreshold)), r.isActive !== void 0 && (s.push("isActive = ?"), n.push(r.isActive ? 1 : 0)), s.push("updatedAt = datetime('now')"), n.push(t);
  const l = e.prepare(`UPDATE products SET ${s.join(", ")} WHERE id = ?`).run(...n);
  return l.changes > 0 && o && b(
    "update",
    "product",
    `Updated product: ${o.name}`,
    t,
    JSON.stringify(o),
    JSON.stringify(r)
  ), l.changes > 0;
}
function S(t, r, e, o) {
  const s = a(), n = g(t);
  return s.transaction(() => {
    s.prepare(`
      UPDATE products 
      SET stock = stock + ?, updatedAt = datetime('now') 
      WHERE id = ?
    `).run(r, t), s.prepare(`
      INSERT INTO stock_logs (productId, changeType, quantityChange, referenceId, createdAt)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(t, e, r, o || null);
  })(), n && b(
    "update",
    "product",
    `${e === "sale" ? "Stock reduced (sale)" : e === "restock" ? "Stock increased (restock)" : "Stock adjusted"}: ${n.name} - Quantity: ${r > 0 ? "+" : ""}${r}`,
    t,
    void 0,
    JSON.stringify({ changeType: e, quantity: r, referenceId: o })
  ), !0;
}
function C(t, r = !1) {
  const e = a(), o = g(t), n = e.prepare(`
    SELECT COUNT(*) as count FROM bill_items WHERE productId = ?
  `).get(t);
  if (n.count > 0)
    if (r) {
      const E = e.prepare(`
        UPDATE products 
        SET isActive = 0, updatedAt = datetime('now') 
        WHERE id = ?
      `).run(t);
      return E.changes > 0 && o && b(
        "deactivate",
        "product",
        `Deactivated product: ${o.name} (referenced in ${n.count} bills)`,
        t,
        JSON.stringify(o),
        void 0
      ), {
        success: E.changes > 0,
        deactivated: !0,
        message: "Product deactivated successfully (was referenced in bills)"
      };
    } else
      throw new Error(`Cannot delete product. It is referenced in ${n.count} bill(s). Use deactivate option instead.`);
  const l = e.transaction(() => {
    e.prepare("DELETE FROM stock_logs WHERE productId = ?").run(t);
    const d = e.prepare("DELETE FROM products WHERE id = ?").run(t);
    if (d.changes === 0)
      throw new Error("Product not found");
    return d.changes > 0;
  })();
  return l && o && b(
    "delete",
    "product",
    `Deleted product: ${o.name}`,
    t,
    JSON.stringify(o),
    void 0
  ), { success: l, deleted: !0, message: "Product deleted successfully" };
}
function V(t) {
  return C(t, !0);
}
function G(t) {
  const r = a(), e = g(t), s = r.prepare(`
    UPDATE products 
    SET isActive = 1, updatedAt = datetime('now') 
    WHERE id = ?
  `).run(t);
  return s.changes > 0 && e && b(
    "reactivate",
    "product",
    `Reactivated product: ${e.name}`,
    t,
    void 0,
    JSON.stringify({ isActive: !0 })
  ), s.changes > 0;
}
function q(t) {
  const r = a(), e = Z(), s = r.transaction(() => {
    const E = r.prepare(`
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(
      e,
      t.subtotal,
      t.discountPercent,
      t.discountAmount,
      t.total,
      t.paymentMode,
      t.cashAmount || 0,
      t.upiAmount || 0
    ).lastInsertRowid, d = r.prepare(`
      INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of t.items) {
      const R = m.product.price * m.quantity;
      d.run(
        E,
        m.product.id,
        m.product.name,
        m.product.size || null,
        m.quantity,
        m.product.price,
        R
      ), S(m.product.id, -m.quantity, "sale", E);
    }
    return E;
  })(), c = r.prepare("SELECT * FROM bills WHERE id = ?").get(s);
  return b(
    "create",
    "bill",
    `Created bill: ${e} - Total: ₹${t.total} (${t.paymentMode})`,
    s,
    void 0,
    JSON.stringify({
      billNumber: e,
      total: t.total,
      paymentMode: t.paymentMode,
      itemCount: t.items.length
    })
  ), c;
}
function z(t, r) {
  const e = a();
  let o = "SELECT * FROM bills";
  const s = [];
  return t && r ? (o += " WHERE date(createdAt) BETWEEN ? AND ?", s.push(t, r)) : t ? (o += " WHERE date(createdAt) >= ?", s.push(t)) : r && (o += " WHERE date(createdAt) <= ?", s.push(r)), o += " ORDER BY createdAt DESC", e.prepare(o).all(...s);
}
function A(t) {
  const r = a(), o = r.prepare("SELECT * FROM bills WHERE id = ?").get(t);
  if (!o) return null;
  const n = r.prepare("SELECT * FROM bill_items WHERE billId = ?").all(t);
  return { bill: o, items: n };
}
function J(t = 5) {
  return a().prepare(`
    SELECT * FROM bills 
    ORDER BY createdAt DESC 
    LIMIT ?
  `).all(t);
}
function j(t) {
  const r = a(), e = t || (/* @__PURE__ */ new Date()).toISOString().split("T")[0], s = r.prepare(`
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
  `).get(e);
  return !s || s.totalBills === 0 ? {
    totalSales: 0,
    totalBills: 0,
    cashSales: 0,
    upiSales: 0,
    itemsSold: 0
  } : s;
}
function K(t, r) {
  const s = a().prepare(`
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
  `).get(t, r);
  return !s || s.totalBills === 0 ? {
    totalSales: 0,
    totalBills: 0,
    cashSales: 0,
    upiSales: 0,
    itemsSold: 0
  } : s;
}
function Q(t, r = 5) {
  const e = a(), o = t || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return e.prepare(`
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
  `).all(o, r);
}
function Z() {
  var p, E;
  const t = a(), e = ((p = t.prepare("SELECT value FROM settings WHERE key = ?").get("billPrefix")) == null ? void 0 : p.value) || "VP", o = t.prepare("SELECT value FROM settings WHERE key = ?"), s = parseInt(((E = o.get("startingBillNumber")) == null ? void 0 : E.value) || "1"), c = t.prepare(`
    SELECT billNumber FROM bills 
    WHERE billNumber LIKE ? 
    ORDER BY id DESC 
    LIMIT 1
  `).get(`${e}%`);
  let l = s;
  return c && (l = parseInt(c.billNumber.replace(e, "")) + 1), `${e}${l.toString().padStart(4, "0")}`;
}
function tt(t, r) {
  const e = a(), o = A(t);
  if (!o)
    throw new Error("Bill not found");
  return e.transaction(() => {
    if (r.items) {
      const p = e.prepare("SELECT * FROM bill_items WHERE billId = ?").all(t);
      for (const d of p)
        S(d.productId, d.quantity, "adjustment");
      e.prepare("DELETE FROM bill_items WHERE billId = ?").run(t);
      const E = e.prepare(`
        INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of r.items) {
        const m = d.product.price * d.quantity;
        E.run(
          t,
          d.product.id,
          d.product.name,
          d.product.size || null,
          d.quantity,
          d.product.price,
          m
        ), S(d.product.id, -d.quantity, "sale", t);
      }
    }
    const n = [], c = [];
    r.subtotal !== void 0 && (n.push("subtotal = ?"), c.push(r.subtotal)), r.discountPercent !== void 0 && (n.push("discountPercent = ?"), c.push(r.discountPercent)), r.discountAmount !== void 0 && (n.push("discountAmount = ?"), c.push(r.discountAmount)), r.total !== void 0 && (n.push("total = ?"), c.push(r.total)), r.paymentMode !== void 0 && (n.push("paymentMode = ?"), c.push(r.paymentMode)), r.cashAmount !== void 0 && (n.push("cashAmount = ?"), c.push(r.cashAmount)), r.upiAmount !== void 0 && (n.push("upiAmount = ?"), c.push(r.upiAmount)), n.length > 0 && (c.push(t), e.prepare(`
        UPDATE bills SET ${n.join(", ")} WHERE id = ?
      `).run(...c));
  })(), b(
    "update",
    "bill",
    `Updated bill: ${o.bill.billNumber}`,
    t,
    JSON.stringify(o),
    JSON.stringify(r)
  ), A(t);
}
function et(t) {
  const r = a(), e = A(t);
  if (!e)
    throw new Error("Bill not found");
  return r.transaction(() => {
    const n = r.prepare("SELECT * FROM bill_items WHERE billId = ?").all(t);
    for (const c of n)
      S(c.productId, c.quantity, "adjustment");
    r.prepare("DELETE FROM bill_items WHERE billId = ?").run(t), r.prepare("DELETE FROM bills WHERE id = ?").run(t);
  })(), b(
    "delete",
    "bill",
    `Deleted bill: ${e.bill.billNumber} - Total: ₹${e.bill.total}`,
    t,
    JSON.stringify(e),
    void 0
  ), { success: !0, message: "Bill deleted and stock restored" };
}
function f() {
  const e = a().prepare("SELECT key, value FROM settings").all(), o = {};
  for (const s of e)
    o[s.key] = s.value;
  return o;
}
function w(t) {
  const o = a().prepare("SELECT value FROM settings WHERE key = ?").get(t);
  return o == null ? void 0 : o.value;
}
function rt(t, r) {
  const e = a(), o = w(t), n = e.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updatedAt) 
    VALUES (?, ?, datetime('now'))
  `).run(t, r);
  return n.changes > 0 && b(
    "update",
    "setting",
    `Updated setting: ${t}`,
    void 0,
    o,
    r
  ), n.changes > 0;
}
function ot(t) {
  const r = a(), e = f();
  return r.transaction(() => {
    const s = r.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt) 
      VALUES (?, ?, datetime('now'))
    `);
    for (const [n, c] of Object.entries(t))
      s.run(n, c);
  })(), b(
    "update",
    "setting",
    `Updated multiple settings: ${Object.keys(t).join(", ")}`,
    void 0,
    JSON.stringify(e),
    JSON.stringify(t)
  ), !0;
}
function st() {
  const t = f();
  return {
    storeName: t.storeName || "Vogue Prism",
    addressLine1: t.addressLine1 || "",
    addressLine2: t.addressLine2 || "",
    phone: t.phone || "",
    gstNumber: t.gstNumber || "",
    billPrefix: t.billPrefix || "VP",
    startingBillNumber: parseInt(t.startingBillNumber || "1"),
    maxDiscountPercent: parseFloat(t.maxDiscountPercent || "20"),
    lowStockThreshold: parseInt(t.lowStockThreshold || "5"),
    printerName: t.printerName || "",
    paperWidth: t.paperWidth || "80mm",
    autoPrint: t.autoPrint === "true"
  };
}
function nt(t, r) {
  return a().prepare(`
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
  `).all(t, r);
}
function ct(t, r) {
  return a().prepare(`
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
  `).all(t, r);
}
function it(t, r) {
  return a().prepare(`
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
  `).all(t, r);
}
function at(t, r) {
  return a().prepare(`
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
  `).all(t, r);
}
function lt(t, r) {
  return a().prepare(`
    SELECT 
      paymentMode,
      COUNT(*) as billCount,
      SUM(total) as totalAmount,
      AVG(total) as averageAmount
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY paymentMode
  `).all(t, r);
}
function ut(t) {
  return a().prepare(`
    SELECT 
      strftime('%H', createdAt) as hour,
      COUNT(*) as billCount,
      SUM(total) as totalAmount
    FROM bills
    WHERE date(createdAt) = ?
    GROUP BY strftime('%H', createdAt)
    ORDER BY hour
  `).all(t);
}
function dt() {
  return a().prepare(`
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
function Et(t, r, e = 10) {
  return a().prepare(`
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
  `).all(t, r, e);
}
async function pt() {
  try {
    const t = a(), r = await y.showSaveDialog({
      title: "Export Database Backup",
      defaultPath: h.join(
        T.getPath("desktop"),
        `vogue-prism-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.sql`
      ),
      filters: [
        { name: "SQL Files", extensions: ["sql"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (r.canceled)
      return { success: !1, cancelled: !0 };
    const e = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0",
      data: {
        products: t.prepare("SELECT * FROM products ORDER BY id").all(),
        bills: t.prepare("SELECT * FROM bills ORDER BY id").all(),
        bill_items: t.prepare("SELECT * FROM bill_items ORDER BY id").all(),
        stock_logs: t.prepare("SELECT * FROM stock_logs ORDER BY id").all(),
        settings: t.prepare("SELECT * FROM settings ORDER BY key").all()
      }
    };
    let o = `-- Vogue Prism Database Backup
`;
    o += `-- Created: ${e.timestamp}
`, o += `-- Version: ${e.version}

`;
    const s = (c) => c == null ? "NULL" : typeof c == "string" ? `'${c.replace(/'/g, "''")}'` : String(c), n = (c, l) => {
      if (l.length === 0) return "";
      const p = Object.keys(l[0]);
      let E = `-- Table: ${c}
`;
      E += `DELETE FROM ${c};
`;
      for (const d of l) {
        const m = p.map((R) => s(d[R])).join(", ");
        E += `INSERT INTO ${c} (${p.join(", ")}) VALUES (${m});
`;
      }
      return E += `
`, E;
    };
    return o += n("settings", e.data.settings), o += n("products", e.data.products), o += n("bills", e.data.bills), o += n("bill_items", e.data.bill_items), o += n("stock_logs", e.data.stock_logs), L.writeFileSync(r.filePath, o, "utf8"), {
      success: !0,
      path: r.filePath,
      recordCount: {
        products: e.data.products.length,
        bills: e.data.bills.length,
        bill_items: e.data.bill_items.length,
        stock_logs: e.data.stock_logs.length,
        settings: e.data.settings.length
      }
    };
  } catch (t) {
    return console.error("Backup export error:", t), {
      success: !1,
      error: t instanceof Error ? t.message : "Unknown error"
    };
  }
}
async function mt() {
  try {
    const t = await y.showOpenDialog({
      title: "Import Database Backup",
      filters: [
        { name: "SQL Files", extensions: ["sql"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (t.canceled || !t.filePaths.length)
      return { success: !1, cancelled: !0 };
    if ((await y.showMessageBox({
      type: "warning",
      title: "Confirm Database Restore",
      message: "This will replace all current data with the backup data. This action cannot be undone.",
      detail: "Are you sure you want to continue?",
      buttons: ["Cancel", "Restore"],
      defaultId: 0,
      cancelId: 0
    })).response === 0)
      return { success: !1, cancelled: !0 };
    const e = a(), o = t.filePaths[0], s = L.readFileSync(o, "utf8");
    return e.transaction(() => {
      e.exec("PRAGMA foreign_keys = OFF;");
      const c = s.split(`
`);
      let l = "";
      for (const p of c) {
        const E = p.trim();
        if (!(!E || E.startsWith("--")) && (l += p + `
`, E.endsWith(";"))) {
          const d = l.trim();
          if (d && d !== ";")
            try {
              e.exec(d);
            } catch (m) {
              console.error("Error executing statement:", d), console.error("Error:", m);
            }
          l = "";
        }
      }
      e.exec("PRAGMA foreign_keys = ON;");
    })(), {
      success: !0,
      requiresRestart: !0,
      message: "Database restored successfully. Please restart the application."
    };
  } catch (t) {
    return console.error("Backup import error:", t), {
      success: !1,
      error: t instanceof Error ? t.message : "Unknown error"
    };
  }
}
function bt() {
  const t = a();
  return {
    products: t.prepare("SELECT COUNT(*) as count FROM products").get(),
    bills: t.prepare("SELECT COUNT(*) as count FROM bills").get(),
    bill_items: t.prepare("SELECT COUNT(*) as count FROM bill_items").get(),
    stock_logs: t.prepare("SELECT COUNT(*) as count FROM stock_logs").get(),
    settings: t.prepare("SELECT COUNT(*) as count FROM settings").get(),
    database_size: Tt()
  };
}
function Tt() {
  try {
    const t = h.join(T.getPath("userData"), "billing.db"), r = L.statSync(t);
    return {
      bytes: r.size,
      mb: Math.round(r.size / 1024 / 1024 * 100) / 100
    };
  } catch {
    return { bytes: 0, mb: 0 };
  }
}
function gt() {
  i.handle("products:create", async (t, r) => {
    try {
      const e = B(r);
      return g(Number(e));
    } catch (e) {
      throw console.error("Error creating product:", e), e;
    }
  }), i.handle("products:getAll", async (t, r) => {
    try {
      return W(r);
    } catch (e) {
      throw console.error("Error getting products:", e), e;
    }
  }), i.handle("products:getById", async (t, r) => {
    try {
      return g(r);
    } catch (e) {
      throw console.error("Error getting product by id:", e), e;
    }
  }), i.handle("products:getByBarcode", async (t, r) => {
    try {
      return H(r);
    } catch (e) {
      throw console.error("Error getting product by barcode:", e), e;
    }
  }), i.handle("products:search", async (t, r) => {
    try {
      return x(r);
    } catch (e) {
      throw console.error("Error searching products:", e), e;
    }
  }), i.handle("products:getByCategory", async (t, r) => {
    try {
      return X(r);
    } catch (e) {
      throw console.error("Error getting products by category:", e), e;
    }
  }), i.handle("products:getLowStock", async () => {
    try {
      return Y();
    } catch (t) {
      throw console.error("Error getting low stock products:", t), t;
    }
  }), i.handle("products:update", async (t, r) => {
    try {
      const { id: e, ...o } = r;
      if ($(e, o))
        return g(e);
      throw new Error("Product not found");
    } catch (e) {
      throw console.error("Error updating product:", e), e;
    }
  }), i.handle("products:updateStock", async (t, r, e, o) => {
    try {
      return { success: S(r, e, o) };
    } catch (s) {
      throw console.error("Error updating stock:", s), s;
    }
  }), i.handle("products:delete", async (t, r, e) => {
    try {
      return C(r, e);
    } catch (o) {
      throw console.error("Error deleting product:", o), o;
    }
  }), i.handle("products:deactivate", async (t, r) => {
    try {
      return V(r);
    } catch (e) {
      throw console.error("Error deactivating product:", e), e;
    }
  }), i.handle("products:reactivate", async (t, r) => {
    try {
      return { success: G(r) };
    } catch (e) {
      throw console.error("Error reactivating product:", e), e;
    }
  }), i.handle("bills:create", async (t, r) => {
    try {
      console.log("Creating bill with data:", r);
      const e = q(r);
      return console.log("Bill created successfully:", e), e;
    } catch (e) {
      throw console.error("Error creating bill:", e), console.error("Bill data that caused error:", r), new Error(`Failed to create bill: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }), i.handle("bills:getAll", async (t, r, e) => {
    try {
      return z(r, e);
    } catch (o) {
      throw console.error("Error getting bills:", o), o;
    }
  }), i.handle("bills:getById", async (t, r) => {
    try {
      return A(r);
    } catch (e) {
      throw console.error("Error getting bill by id:", e), e;
    }
  }), i.handle("bills:getRecent", async (t, r) => {
    try {
      return J(r);
    } catch (e) {
      throw console.error("Error getting recent bills:", e), e;
    }
  }), i.handle("bills:getDailySummary", async (t, r) => {
    try {
      return j(r);
    } catch (e) {
      throw console.error("Error getting daily summary:", e), e;
    }
  }), i.handle("bills:getDateRangeSummary", async (t, r, e) => {
    try {
      return K(r, e);
    } catch (o) {
      throw console.error("Error getting date range summary:", o), o;
    }
  }), i.handle("bills:getTopSelling", async (t, r) => {
    try {
      return Q(r);
    } catch (e) {
      throw console.error("Error getting top selling:", e), e;
    }
  }), i.handle("bills:update", async (t, r, e) => {
    try {
      return tt(r, e);
    } catch (o) {
      throw console.error("Error updating bill:", o), o;
    }
  }), i.handle("bills:delete", async (t, r) => {
    try {
      return et(r);
    } catch (e) {
      throw console.error("Error deleting bill:", e), e;
    }
  }), i.handle("settings:getAll", async () => {
    try {
      return f();
    } catch (t) {
      throw console.error("Error getting settings:", t), t;
    }
  }), i.handle("settings:get", async (t, r) => {
    try {
      return w(r);
    } catch (e) {
      throw console.error("Error getting setting:", e), e;
    }
  }), i.handle("settings:update", async (t, r, e) => {
    try {
      return { success: rt(r, e) };
    } catch (o) {
      throw console.error("Error updating setting:", o), o;
    }
  }), i.handle("settings:updateAll", async (t, r) => {
    try {
      return { success: ot(r) };
    } catch (e) {
      throw console.error("Error updating all settings:", e), e;
    }
  }), i.handle("settings:getTyped", async () => {
    try {
      return st();
    } catch (t) {
      throw console.error("Error getting typed settings:", t), t;
    }
  }), i.handle("reports:getSales", async (t, r, e) => {
    try {
      return nt(r, e);
    } catch (o) {
      throw console.error("Error getting sales report:", o), o;
    }
  }), i.handle("reports:exportData", async (t, r, e) => {
    try {
      return ct(r, e);
    } catch (o) {
      throw console.error("Error exporting data:", o), o;
    }
  }), i.handle("reports:getStockMovement", async (t, r, e) => {
    try {
      return it(r, e);
    } catch (o) {
      throw console.error("Error getting stock movement report:", o), o;
    }
  }), i.handle("reports:getCategorySales", async (t, r, e) => {
    try {
      return at(r, e);
    } catch (o) {
      throw console.error("Error getting category sales:", o), o;
    }
  }), i.handle("reports:getPaymentModeSummary", async (t, r, e) => {
    try {
      return lt(r, e);
    } catch (o) {
      throw console.error("Error getting payment mode summary:", o), o;
    }
  }), i.handle("reports:getHourlySales", async (t, r) => {
    try {
      return ut(r);
    } catch (e) {
      throw console.error("Error getting hourly sales:", e), e;
    }
  }), i.handle("reports:getLowStockAlert", async () => {
    try {
      return dt();
    } catch (t) {
      throw console.error("Error getting low stock alert:", t), t;
    }
  }), i.handle("reports:getProductPerformance", async (t, r, e, o) => {
    try {
      return Et(r, e, o);
    } catch (s) {
      throw console.error("Error getting product performance:", s), s;
    }
  }), i.handle("backup:export", async () => {
    try {
      return await pt();
    } catch (t) {
      throw console.error("Error exporting backup:", t), t;
    }
  }), i.handle("backup:import", async () => {
    try {
      return await mt();
    } catch (t) {
      throw console.error("Error importing backup:", t), t;
    }
  }), i.handle("backup:getStats", async () => {
    try {
      return bt();
    } catch (t) {
      throw console.error("Error getting database stats:", t), t;
    }
  }), i.handle("printer:getList", async () => {
    try {
      const { webContents: t } = await import("electron"), r = t.getAllWebContents();
      return r.length > 0 ? (await r[0].getPrinters()).map((o) => ({
        name: o.name,
        isDefault: o.isDefault || !1,
        status: o.status || "unknown"
      })) : [
        { name: "Default Printer", isDefault: !0, status: "available" },
        { name: "Thermal Printer", isDefault: !1, status: "unknown" }
      ];
    } catch (t) {
      return console.error("Error getting printers:", t), [
        { name: "Default Printer", isDefault: !0, status: "available" },
        { name: "Thermal Printer", isDefault: !1, status: "unknown" }
      ];
    }
  }), i.handle("printer:print", async (t, r, e) => {
    try {
      const { BrowserWindow: o } = await import("electron"), s = new o({
        show: !1,
        webPreferences: {
          nodeIntegration: !1,
          contextIsolation: !0
        }
      });
      await s.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(r)}`);
      const n = {
        silent: !0,
        printBackground: !0,
        deviceName: e || void 0,
        margins: {
          marginType: "none"
        },
        pageSize: "A4"
      }, c = await s.webContents.print(n);
      return s.close(), { success: !0 };
    } catch (o) {
      return console.error("Error printing:", o), {
        success: !1,
        error: o instanceof Error ? o.message : "Print failed"
      };
    }
  }), i.handle("printer:testPrint", async (t, r) => {
    try {
      const e = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold">TEST PRINT</div>
          <div class="center">Vogue Prism POS</div>
          <div class="center">${(/* @__PURE__ */ new Date()).toLocaleString()}</div>
          <br>
          <div>Printer: ${r || "Default"}</div>
          <div>Status: Connected</div>
          <br>
          <div class="center">Test completed successfully!</div>
        </body>
        </html>
      `, { BrowserWindow: o } = await import("electron"), s = new o({
        show: !1,
        webPreferences: {
          nodeIntegration: !1,
          contextIsolation: !0
        }
      });
      await s.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(e)}`);
      const n = {
        silent: !0,
        printBackground: !0,
        deviceName: r || void 0,
        margins: {
          marginType: "none"
        },
        pageSize: "A4"
      }, c = await s.webContents.print(n);
      return s.close(), { success: !0 };
    } catch (e) {
      return console.error("Error in test print:", e), {
        success: !1,
        error: e instanceof Error ? e.message : "Test print failed"
      };
    }
  }), i.handle("logs:getActivity", async (t, r, e, o, s, n) => {
    try {
      return _(r, e, o, s, n);
    } catch (c) {
      throw console.error("Error getting activity logs:", c), c;
    }
  }), i.handle("logs:getCount", async (t, r, e, o) => {
    try {
      return F(r, e, o);
    } catch (s) {
      throw console.error("Error getting logs count:", s), s;
    }
  }), i.handle("logs:cleanup", async () => {
    try {
      return { success: !0, deletedCount: k() };
    } catch (t) {
      throw console.error("Error cleaning up logs:", t), t;
    }
  }), console.log("All IPC handlers set up successfully");
}
const ht = D(import.meta.url), O = h.dirname(ht);
let N = null;
function U() {
  N = new I({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: h.join(O, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "default",
    title: "Vogue Prism - Billing Software"
  }), N.setMenuBarVisibility(!1), process.env.VITE_DEV_SERVER_URL ? N.loadURL(process.env.VITE_DEV_SERVER_URL) : N.loadFile(h.join(O, "../dist/index.html"));
}
T.on("window-all-closed", () => {
  process.platform !== "darwin" && (T.quit(), N = null);
});
T.on("activate", () => {
  I.getAllWindows().length === 0 && U();
});
T.whenReady().then(async () => {
  await v(), gt(), U();
});
T.on("before-quit", async () => {
  await P();
});

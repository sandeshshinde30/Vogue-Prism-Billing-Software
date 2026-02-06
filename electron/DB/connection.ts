import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export async function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'billing.db');

  db = new Database(dbPath);

  // Create products table with all required fields
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

  // Migration: Add isActive column if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const hasIsActive = tableInfo.some((column: any) => column.name === 'isActive');
    
    if (!hasIsActive) {
      console.log('Adding isActive column to products table...');
      db.exec('ALTER TABLE products ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1');
      console.log('Migration completed: isActive column added');
    }
    
    // Migration: Add costPrice column if it doesn't exist
    const hasCostPrice = tableInfo.some((column: any) => column.name === 'costPrice');
    if (!hasCostPrice) {
      console.log('Adding costPrice column to products table...');
      db.exec('ALTER TABLE products ADD COLUMN costPrice REAL DEFAULT 0');
      console.log('Migration completed: costPrice column added');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Create activity_logs table
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
    const hasCashAmount = billsTableInfo.some((column: any) => column.name === 'cashAmount');
    const hasUpiAmount = billsTableInfo.some((column: any) => column.name === 'upiAmount');
    
    if (!hasCashAmount) {
      console.log('Adding cashAmount column to bills table...');
      db.exec('ALTER TABLE bills ADD COLUMN cashAmount REAL DEFAULT 0');
    }
    
    if (!hasUpiAmount) {
      console.log('Adding upiAmount column to bills table...');
      db.exec('ALTER TABLE bills ADD COLUMN upiAmount REAL DEFAULT 0');
    }
    
    // Check if we need to update the paymentMode constraint
    // We'll recreate the table if it has the old constraint
    try {
      // Test if we can insert a 'mixed' payment mode
      const testStmt = db.prepare(`
        INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount)
        VALUES ('TEST_MIXED', 100, 0, 0, 100, 'mixed', 50, 50)
      `);
      testStmt.run();
      
      // If successful, delete the test record
      db.exec("DELETE FROM bills WHERE billNumber = 'TEST_MIXED'");
      console.log('Mixed payment mode already supported');
    } catch (constraintError) {
      console.log('Updating bills table to support mixed payment mode...');
      
      // Disable foreign key constraints temporarily
      db.exec('PRAGMA foreign_keys = OFF;');
      
      // Drop backup table if it exists
      db.exec('DROP TABLE IF EXISTS bills_backup;');
      
      // Backup existing data
      db.exec(`
        CREATE TABLE bills_backup AS SELECT * FROM bills;
      `);
      
      // Drop the old table
      db.exec('DROP TABLE bills;');
      
      // Recreate with updated constraint
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
      
      // Restore data
      db.exec(`
        INSERT INTO bills (id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, customerMobileNumber, status, createdAt)
        SELECT id, billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, 
               COALESCE(cashAmount, 0), COALESCE(upiAmount, 0), NULL as customerMobileNumber, status, createdAt
        FROM bills_backup;
      `);
      
      // Drop backup table
      db.exec('DROP TABLE bills_backup;');
      
      // Re-enable foreign key constraints
      db.exec('PRAGMA foreign_keys = ON;');
      
      console.log('Bills table updated to support mixed payment mode');
    }
    
    if (!hasCashAmount || !hasUpiAmount) {
      console.log('Migration completed: payment columns added');
    }
    
    // Check and add customerMobileNumber column
    const hasCustomerMobile = billsTableInfo.some((column: any) => column.name === 'customerMobileNumber');
    if (!hasCustomerMobile) {
      console.log('Adding customerMobileNumber column to bills table...');
      db.exec('ALTER TABLE bills ADD COLUMN customerMobileNumber TEXT');
      console.log('Migration completed: customerMobileNumber column added');
    }
  } catch (error) {
    console.error('Bills migration error:', error);
  }

  // Create bills table
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

  // Create bill_items table
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

  // Create stock_logs table for tracking stock changes
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

  // Create settings table for app configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Create deleted_bills table for tracking deleted bills with restore capability
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

  // Insert default settings if they don't exist
  const defaultSettings = [
    ['storeName', 'Vogue Prism'],
    ['addressLine1', ''],
    ['addressLine2', ''],
    ['phone', ''],
    ['gstNumber', ''],
    ['billPrefix', 'VP'],
    ['startingBillNumber', '1'],
    ['maxDiscountPercent', '20'],
    ['lowStockThreshold', '5'],
    ['printerName', ''],
    ['paperWidth', '80mm'],
    ['autoPrint', 'false']
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
    CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(createdAt);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(billId);
    CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(productId);
  `);

  console.log('Database initialized at', dbPath);
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database closed');
  }
}

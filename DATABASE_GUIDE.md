# 🗄️ Complete SQLite Database Implementation Guide

## 📋 Overview

This guide explains the complete SQLite database implementation for Vogue Prism Billing Software. Every feature is now powered by SQLite with easy-to-understand code structure.

## 🏗️ Database Architecture

### 📁 File Structure
```
electron/DB/
├── connection.ts     # Database connection & initialization
├── products.ts       # Product CRUD operations
├── bills.ts         # Bill & transaction management
├── settings.ts      # App settings storage
├── reports.ts       # Report generation queries
└── backup.ts        # Backup & restore functionality
```

### 🗃️ Database Tables

#### 1. **products** - Product Inventory
```sql
CREATE TABLE products (
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
```

#### 2. **bills** - Sales Transactions
```sql
CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billNumber TEXT NOT NULL UNIQUE,
  subtotal REAL NOT NULL,
  discountPercent REAL NOT NULL DEFAULT 0,
  discountAmount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  paymentMode TEXT NOT NULL CHECK (paymentMode IN ('cash', 'upi')),
  status TEXT NOT NULL DEFAULT 'completed',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### 3. **bill_items** - Individual Bill Items
```sql
CREATE TABLE bill_items (
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
```

#### 4. **stock_logs** - Stock Movement History
```sql
CREATE TABLE stock_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productId INTEGER NOT NULL,
  changeType TEXT NOT NULL CHECK (changeType IN ('sale', 'restock', 'adjustment')),
  quantityChange INTEGER NOT NULL,
  referenceId INTEGER,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (productId) REFERENCES products (id)
);
```

#### 5. **settings** - Application Configuration
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 🔧 Database Modules Explained

### 1. **connection.ts** - Database Setup
```typescript
// Initialize database with all tables and default settings
export async function initDatabase()

// Get database instance
export function getDatabase(): Database.Database

// Close database connection
export async function closeDatabase()
```

### 2. **products.ts** - Product Management
```typescript
// CREATE - Add new product
export function addProduct(data: ProductData)

// READ - Get all products
export function getProducts()

// READ - Get product by ID
export function getProductById(id: number)

// READ - Get product by barcode (for scanning)
export function getProductByBarcode(barcode: string)

// READ - Search products by name or barcode
export function searchProducts(query: string)

// READ - Get products by category
export function getProductsByCategory(category: string)

// READ - Get low stock products
export function getLowStockProducts()

// UPDATE - Update product details
export function updateProduct(id: number, data: Partial<ProductData>)

// UPDATE - Update stock with logging
export function updateStock(id: number, quantity: number, changeType: string, referenceId?: number)

// DELETE - Delete product
export function deleteProduct(id: number)
```

### 3. **bills.ts** - Sales Management
```typescript
// CREATE - Create new bill with items (uses transaction)
export function createBill(data: BillData)

// READ - Get bills with date filtering
export function getBills(dateFrom?: string, dateTo?: string)

// READ - Get bill by ID with items
export function getBillById(id: number)

// READ - Get recent bills for dashboard
export function getRecentBills(limit: number = 5)

// READ - Get daily sales summary
export function getDailySummary(date?: string)

// READ - Get top selling products
export function getTopSelling(date?: string, limit: number = 5)
```

### 4. **settings.ts** - Configuration Management
```typescript
// READ - Get all settings as key-value pairs
export function getSettings()

// READ - Get single setting by key
export function getSetting(key: string)

// UPDATE - Update single setting
export function updateSetting(key: string, value: string)

// UPDATE - Update multiple settings at once
export function updateAllSettings(settings: Record<string, string>)

// UTILITY - Get settings with proper types
export function getTypedSettings()
```

### 5. **reports.ts** - Analytics & Reports
```typescript
// Sales report by date range
export function getSalesReport(dateFrom: string, dateTo: string)

// Export data for Excel
export function exportData(dateFrom: string, dateTo: string)

// Stock movement report
export function getStockMovementReport(dateFrom: string, dateTo: string)

// Category-wise sales
export function getCategorySales(dateFrom: string, dateTo: string)

// Payment mode summary
export function getPaymentModeSummary(dateFrom: string, dateTo: string)

// Hourly sales pattern
export function getHourlySales(date: string)

// Low stock alert data
export function getLowStockAlert()

// Product performance analysis
export function getProductPerformance(dateFrom: string, dateTo: string, limit?: number)
```

### 6. **backup.ts** - Data Protection
```typescript
// Export database backup as SQL file
export async function exportBackup()

// Import database from backup file
export async function importBackup()

// Get database statistics
export function getDatabaseStats()
```

## 🔌 IPC Handlers (electron/ipc-handlers.ts)

All database operations are exposed through IPC handlers:

### Product Handlers
- `products:create` - Create product
- `products:getAll` - Get all products
- `products:getById` - Get product by ID
- `products:getByBarcode` - Get product by barcode
- `products:search` - Search products
- `products:getByCategory` - Get products by category
- `products:getLowStock` - Get low stock products
- `products:update` - Update product
- `products:updateStock` - Update stock
- `products:delete` - Delete product

### Bill Handlers
- `bills:create` - Create bill
- `bills:getAll` - Get bills
- `bills:getById` - Get bill by ID
- `bills:getRecent` - Get recent bills
- `bills:getDailySummary` - Get daily summary
- `bills:getTopSelling` - Get top selling products

### Settings Handlers
- `settings:getAll` - Get all settings
- `settings:get` - Get single setting
- `settings:update` - Update single setting
- `settings:updateAll` - Update all settings
- `settings:getTyped` - Get typed settings

### Report Handlers
- `reports:getSales` - Get sales report
- `reports:exportData` - Export data
- `reports:getStockMovement` - Get stock movement
- `reports:getCategorySales` - Get category sales
- `reports:getPaymentModeSummary` - Get payment summary
- `reports:getHourlySales` - Get hourly sales
- `reports:getLowStockAlert` - Get low stock alert
- `reports:getProductPerformance` - Get product performance

### Backup Handlers
- `backup:export` - Export backup
- `backup:import` - Import backup
- `backup:getStats` - Get database stats

### Printer Handlers
- `printer:getList` - Get available printers
- `printer:print` - Print content

## 🌐 Frontend API (electron/preload.ts)

The preload script exposes all database functions to the frontend through `window.electronAPI`:

```typescript
// Example usage in React components:
const products = await window.electronAPI.getProducts();
const bill = await window.electronAPI.createBill(billData);
const settings = await window.electronAPI.getSettings();
```

## 📊 Features Implemented

### ✅ Complete Feature List

1. **Product Management**
   - ✅ Add, edit, delete products
   - ✅ Barcode scanning and generation
   - ✅ Category and size management
   - ✅ Stock tracking with thresholds
   - ✅ Search and filtering

2. **Billing System**
   - ✅ Create bills with multiple items
   - ✅ Apply discounts (percentage or fixed)
   - ✅ Payment mode selection (Cash/UPI)
   - ✅ Auto-generate bill numbers
   - ✅ Transaction integrity with SQLite transactions

3. **Stock Management**
   - ✅ Real-time stock updates
   - ✅ Stock movement logging
   - ✅ Low stock alerts
   - ✅ Stock adjustment tracking

4. **Dashboard Analytics**
   - ✅ Daily sales summary
   - ✅ Recent bills display
   - ✅ Top selling products
   - ✅ Low stock notifications
   - ✅ Payment mode breakdown

5. **Reports & Analytics**
   - ✅ Sales reports by date range
   - ✅ Product performance analysis
   - ✅ Category-wise sales
   - ✅ Stock movement reports
   - ✅ Excel export functionality
   - ✅ Hourly sales patterns

6. **Settings Management**
   - ✅ Store information
   - ✅ Billing configuration
   - ✅ Printer settings
   - ✅ Discount limits
   - ✅ Stock thresholds

7. **Backup & Restore**
   - ✅ Database export as SQL
   - ✅ Database import/restore
   - ✅ Database statistics
   - ✅ Data integrity checks

## 🚀 How to Use

### Starting the Application
```bash
npm run dev  # Development mode
npm run build  # Production build
```

### Database Location
- **Development**: `~/.config/vogue-prism-billing-software/billing.db`
- **Production**: Same location in user data directory

### Key Benefits

1. **Easy to Understand**: Each module has a single responsibility
2. **Type Safe**: Full TypeScript support with proper interfaces
3. **Transaction Safe**: Critical operations use SQLite transactions
4. **Performance Optimized**: Proper indexes for fast queries
5. **Backup Ready**: Complete backup and restore functionality
6. **Extensible**: Easy to add new features or modify existing ones

## 🔍 Debugging & Troubleshooting

### Common Issues

1. **better-sqlite3 Module Error**
   ```bash
   npx electron-rebuild -f -w better-sqlite3
   ```

2. **Database Locked**
   - Ensure proper connection closing
   - Check for long-running transactions

3. **Performance Issues**
   - Database includes optimized indexes
   - Use prepared statements (already implemented)

### Database Inspection
You can inspect the database using any SQLite browser or CLI:
```bash
sqlite3 ~/.config/vogue-prism-billing-software/billing.db
```

## 🎯 Next Steps

The database is now fully implemented and ready for all features. You can:

1. **Add New Features**: Follow the existing patterns in each module
2. **Customize Reports**: Add new queries in `reports.ts`
3. **Extend Settings**: Add new configuration options in `settings.ts`
4. **Enhance Backup**: Add more backup formats or cloud integration

## 📝 Code Examples

### Creating a Product
```typescript
const product = await window.electronAPI.createProduct({
  name: "Blue Denim Shirt",
  category: "Shirt",
  size: "L",
  barcode: "VP0001",
  price: 1299.99,
  stock: 25,
  lowStockThreshold: 5
});
```

### Creating a Bill
```typescript
const bill = await window.electronAPI.createBill({
  items: [
    { product: selectedProduct, quantity: 2 }
  ],
  subtotal: 2599.98,
  discountPercent: 10,
  discountAmount: 259.99,
  total: 2339.99,
  paymentMode: 'cash'
});
```

### Getting Reports
```typescript
const salesReport = await window.electronAPI.getSalesReport('2024-01-01', '2024-01-31');
const dailySummary = await window.electronAPI.getDailySummary();
const lowStockProducts = await window.electronAPI.getLowStockProducts();
```

---

🎉 **Your SQLite database is now fully implemented with all features!** Every part of the application is powered by SQLite with clean, maintainable, and easy-to-understand code.
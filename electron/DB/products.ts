import { getDatabase } from './connection';

export interface ProductData {
  name: string;
  category: string;
  size?: string;
  barcode?: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
}

// CREATE - Add new product
export function addProduct(data: ProductData) {
  const db = getDatabase();
  const stmt = db.prepare(`
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

// READ - Get all products
export function getProducts() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM products ORDER BY id DESC');
  return stmt.all();
}

// READ - Get product by ID
export function getProductById(id: number) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
  return stmt.get(id);
}

// READ - Get product by barcode
export function getProductByBarcode(barcode: string) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM products WHERE barcode = ?');
  return stmt.get(barcode);
}

// READ - Search products by name or barcode
export function searchProducts(query: string) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM products 
    WHERE name LIKE ? OR barcode LIKE ? 
    ORDER BY name
  `);
  const searchTerm = `%${query}%`;
  return stmt.all(searchTerm, searchTerm);
}

// READ - Get products by category
export function getProductsByCategory(category: string) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM products WHERE category = ? ORDER BY name');
  return stmt.all(category);
}

// READ - Get low stock products
export function getLowStockProducts() {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM products 
    WHERE stock <= lowStockThreshold 
    ORDER BY stock ASC, name
  `);
  return stmt.all();
}

// UPDATE - Update product
export function updateProduct(id: number, data: Partial<ProductData>) {
  const db = getDatabase();
  
  const fields = [];
  const values = [];
  
  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.category !== undefined) {
    fields.push('category = ?');
    values.push(data.category);
  }
  if (data.size !== undefined) {
    fields.push('size = ?');
    values.push(data.size || null);
  }
  if (data.barcode !== undefined) {
    fields.push('barcode = ?');
    values.push(data.barcode || null);
  }
  if (data.price !== undefined) {
    fields.push('price = ?');
    values.push(data.price);
  }
  if (data.stock !== undefined) {
    fields.push('stock = ?');
    values.push(data.stock);
  }
  if (data.lowStockThreshold !== undefined) {
    fields.push('lowStockThreshold = ?');
    values.push(data.lowStockThreshold);
  }
  
  fields.push('updatedAt = datetime(\'now\')');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  
  return result.changes > 0;
}

// UPDATE - Update stock and log the change
export function updateStock(id: number, quantity: number, changeType: 'sale' | 'restock' | 'adjustment', referenceId?: number) {
  const db = getDatabase();
  
  // Start transaction
  const transaction = db.transaction(() => {
    // Update product stock
    const updateStmt = db.prepare(`
      UPDATE products 
      SET stock = stock + ?, updatedAt = datetime('now') 
      WHERE id = ?
    `);
    updateStmt.run(quantity, id);
    
    // Log the stock change
    const logStmt = db.prepare(`
      INSERT INTO stock_logs (productId, changeType, quantityChange, referenceId, createdAt)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    logStmt.run(id, changeType, quantity, referenceId || null);
  });
  
  transaction();
  return true;
}

// DELETE - Delete product
export function deleteProduct(id: number) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM products WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

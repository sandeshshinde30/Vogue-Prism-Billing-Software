import { getDatabase } from './connection';
import { addActivityLog } from './logs';

export interface ProductData {
  name: string;
  category: string;
  size?: string;
  barcode?: string;
  costPrice?: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  isActive?: boolean;
}

// CREATE - Add new product
export function addProduct(data: ProductData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO products (name, category, size, barcode, costPrice, price, stock, lowStockThreshold, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
  
  const productId = result.lastInsertRowid as number;
  
  // Log the activity
  addActivityLog(
    'create',
    'product',
    `Created product: ${data.name}`,
    productId,
    undefined,
    JSON.stringify(data)
  );
  
  return productId;
}

// READ - Get all products (only active by default)
export function getProducts(includeInactive: boolean = false) {
  const db = getDatabase();
  let query = 'SELECT * FROM products';
  if (!includeInactive) {
    query += ' WHERE (isActive = 1 OR isActive IS NULL)'; // Handle legacy data
  }
  query += ' ORDER BY id DESC';
  
  const stmt = db.prepare(query);
  const results = stmt.all();
  
  // Ensure isActive is properly set for all results
  return results.map((product: any) => ({
    ...product,
    isActive: product.isActive === null ? true : Boolean(product.isActive)
  }));
}

// READ - Get product by ID
export function getProductById(id: number) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
  const result = stmt.get(id);
  
  if (result) {
    return {
      ...result,
      isActive: (result as any).isActive === null ? true : Boolean((result as any).isActive)
    };
  }
  
  return result;
}

// READ - Get product by barcode
export function getProductByBarcode(barcode: string) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM products WHERE barcode = ?');
  const result = stmt.get(barcode);
  
  if (result) {
    return {
      ...result,
      isActive: (result as any).isActive === null ? true : Boolean((result as any).isActive)
    };
  }
  
  return result;
}

// READ - Search products by name or barcode (only active)
export function searchProducts(query: string) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM products 
    WHERE (name LIKE ? OR barcode LIKE ?) AND (isActive = 1 OR isActive IS NULL)
    ORDER BY name
  `);
  const searchTerm = `%${query}%`;
  const results = stmt.all(searchTerm, searchTerm);
  
  // Ensure isActive is properly set
  return results.map((product: any) => ({
    ...product,
    isActive: product.isActive === null ? true : Boolean(product.isActive)
  }));
}

// READ - Get products by category (only active)
export function getProductsByCategory(category: string) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM products WHERE category = ? AND (isActive = 1 OR isActive IS NULL) ORDER BY name');
  const results = stmt.all(category);
  
  // Ensure isActive is properly set
  return results.map((product: any) => ({
    ...product,
    isActive: product.isActive === null ? true : Boolean(product.isActive)
  }));
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
  
  // Get old product data for logging
  const oldProduct = getProductById(id);
  
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
  if (data.costPrice !== undefined) {
    fields.push('costPrice = ?');
    values.push(data.costPrice);
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
  if (data.isActive !== undefined) {
    fields.push('isActive = ?');
    values.push(data.isActive ? 1 : 0);
  }
  
  fields.push('updatedAt = datetime(\'now\')');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  
  // Log the activity
  if (result.changes > 0 && oldProduct) {
    addActivityLog(
      'update',
      'product',
      `Updated product: ${oldProduct.name}`,
      id,
      JSON.stringify(oldProduct),
      JSON.stringify(data)
    );
  }
  
  return result.changes > 0;
}

// UPDATE - Update stock and log the change
export function updateStock(id: number, quantity: number, changeType: 'sale' | 'restock' | 'adjustment', referenceId?: number) {
  const db = getDatabase();
  
  // Get product info for logging
  const product = getProductById(id);
  
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
  
  // Log the activity
  if (product) {
    const action = changeType === 'sale' ? 'Stock reduced (sale)' : 
                   changeType === 'restock' ? 'Stock increased (restock)' : 
                   'Stock adjusted';
    addActivityLog(
      'update',
      'product',
      `${action}: ${product.name} - Quantity: ${quantity > 0 ? '+' : ''}${quantity}`,
      id,
      undefined,
      JSON.stringify({ changeType, quantity, referenceId })
    );
  }
  
  return true;
}

// DELETE - Delete product (with validation) or deactivate if referenced
export function deleteProduct(id: number, forceDeactivate: boolean = false) {
  const db = getDatabase();
  
  // Get product info for logging
  const product = getProductById(id);
  
  // Check if product is referenced in any bills
  const billCheckStmt = db.prepare(`
    SELECT COUNT(*) as count FROM bill_items WHERE productId = ?
  `);
  const billCheck = billCheckStmt.get(id) as { count: number };
  
  if (billCheck.count > 0) {
    if (forceDeactivate) {
      // Deactivate instead of delete
      const deactivateStmt = db.prepare(`
        UPDATE products 
        SET isActive = 0, updatedAt = datetime('now') 
        WHERE id = ?
      `);
      const result = deactivateStmt.run(id);
      
      // Log the activity
      if (result.changes > 0 && product) {
        addActivityLog(
          'deactivate',
          'product',
          `Deactivated product: ${product.name} (referenced in ${billCheck.count} bills)`,
          id,
          JSON.stringify(product),
          undefined
        );
      }
      
      return { 
        success: result.changes > 0, 
        deactivated: true,
        message: 'Product deactivated successfully (was referenced in bills)'
      };
    } else {
      throw new Error(`Cannot delete product. It is referenced in ${billCheck.count} bill(s). Use deactivate option instead.`);
    }
  }
  
  // Start transaction to delete product and related records
  const transaction = db.transaction(() => {
    // Delete stock logs first
    const deleteLogsStmt = db.prepare('DELETE FROM stock_logs WHERE productId = ?');
    deleteLogsStmt.run(id);
    
    // Delete the product
    const deleteProductStmt = db.prepare('DELETE FROM products WHERE id = ?');
    const result = deleteProductStmt.run(id);
    
    if (result.changes === 0) {
      throw new Error('Product not found');
    }
    
    return result.changes > 0;
  });
  
  const success = transaction();
  
  // Log the activity
  if (success && product) {
    addActivityLog(
      'delete',
      'product',
      `Deleted product: ${product.name}`,
      id,
      JSON.stringify(product),
      undefined
    );
  }
  
  return { success, deleted: true, message: 'Product deleted successfully' };
}

// UTILITY - Deactivate product
export function deactivateProduct(id: number) {
  return deleteProduct(id, true);
}

// UTILITY - Reactivate product
export function reactivateProduct(id: number) {
  const db = getDatabase();
  
  // Get product info for logging
  const product = getProductById(id);
  
  const stmt = db.prepare(`
    UPDATE products 
    SET isActive = 1, updatedAt = datetime('now') 
    WHERE id = ?
  `);
  const result = stmt.run(id);
  
  // Log the activity
  if (result.changes > 0 && product) {
    addActivityLog(
      'reactivate',
      'product',
      `Reactivated product: ${product.name}`,
      id,
      undefined,
      JSON.stringify({ isActive: true })
    );
  }
  
  return result.changes > 0;
}

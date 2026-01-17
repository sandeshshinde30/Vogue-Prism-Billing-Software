import { getDatabase } from './connection';
import { updateStock } from './products';
import { addActivityLog } from './logs';

export interface BillData {
  items: Array<{
    product: {
      id: number;
      name: string;
      size?: string;
      price: number;
    };
    quantity: number;
  }>;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMode: 'cash' | 'upi' | 'mixed';
  cashAmount?: number;
  upiAmount?: number;
}

// CREATE - Create new bill with items
export function createBill(data: BillData) {
  const db = getDatabase();
  
  // Generate bill number outside transaction so it's available for logging
  const billNumber = generateBillNumber();
  
  // Start transaction to ensure data consistency
  const transaction = db.transaction(() => {
    // Insert bill with local time
    const billStmt = db.prepare(`
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    
    const billResult = billStmt.run(
      billNumber,
      data.subtotal,
      data.discountPercent,
      data.discountAmount,
      data.total,
      data.paymentMode,
      data.cashAmount || 0,
      data.upiAmount || 0
    );
    
    const billId = billResult.lastInsertRowid as number;
    
    // Insert bill items and update stock
    const itemStmt = db.prepare(`
      INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of data.items) {
      const totalPrice = item.product.price * item.quantity;
      
      // Insert bill item
      itemStmt.run(
        billId,
        item.product.id,
        item.product.name,
        item.product.size || null,
        item.quantity,
        item.product.price,
        totalPrice
      );
      
      // Update product stock (negative quantity for sale)
      updateStock(item.product.id, -item.quantity, 'sale', billId);
    }
    
    return billId;
  });
  
  const billId = transaction();
  
  // Get the created bill and return just the bill object (not the full structure)
  const billStmt = db.prepare('SELECT * FROM bills WHERE id = ?');
  const bill = billStmt.get(billId);
  
  // Log the activity
  addActivityLog(
    'create',
    'bill',
    `Created bill: ${billNumber} - Total: ₹${data.total} (${data.paymentMode})`,
    billId,
    undefined,
    JSON.stringify({
      billNumber,
      total: data.total,
      paymentMode: data.paymentMode,
      itemCount: data.items.length
    })
  );
  
  return bill;
}

// READ - Get all bills with date filtering
export function getBills(dateFrom?: string, dateTo?: string, searchQuery?: string) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM bills';
  const params: any[] = [];
  const conditions: string[] = [];
  
  // Date filtering
  if (dateFrom && dateTo) {
    conditions.push('date(createdAt) BETWEEN ? AND ?');
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    conditions.push('date(createdAt) >= ?');
    params.push(dateFrom);
  } else if (dateTo) {
    conditions.push('date(createdAt) <= ?');
    params.push(dateTo);
  }
  
  // Search filtering
  if (searchQuery && searchQuery.trim()) {
    conditions.push('(billNumber LIKE ? OR customerMobileNumber LIKE ?)');
    const searchTerm = `%${searchQuery.trim()}%`;
    params.push(searchTerm, searchTerm);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY createdAt DESC';
  
  console.log('Bills query:', query, 'params:', params);
  
  try {
    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    console.log('Bills query results:', results.length, 'bills found');
    return results;
  } catch (error) {
    console.error('Error executing bills query:', error);
    throw error;
  }
}

// READ - Get bill by ID with items
export function getBillById(id: number) {
  const db = getDatabase();
  
  // Get bill
  const billStmt = db.prepare('SELECT * FROM bills WHERE id = ?');
  const bill = billStmt.get(id);
  
  if (!bill) return null;
  
  // Get bill items
  const itemsStmt = db.prepare('SELECT * FROM bill_items WHERE billId = ?');
  const items = itemsStmt.all(id);
  
  return { bill, items };
}

// READ - Get recent bills
export function getRecentBills(limit: number = 5) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM bills 
    ORDER BY createdAt DESC 
    LIMIT ?
  `);
  return stmt.all(limit);
}

// READ - Get daily summary with proper date handling
export function getDailySummary(date?: string) {
  const db = getDatabase();
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const stmt = db.prepare(`
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
  
  // If no bills found, return zero values
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

// READ - Get summary for date range
export function getDateRangeSummary(dateFrom: string, dateTo: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
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
  
  // If no bills found, return zero values
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

// READ - Get top selling products
export function getTopSelling(date?: string, limit: number = 5) {
  const db = getDatabase();
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const stmt = db.prepare(`
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

// UTILITY - Generate bill number
function generateBillNumber(): string {
  const db = getDatabase();
  
  // Get bill prefix from settings
  const prefixStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const prefix = prefixStmt.get('billPrefix')?.value || 'VP';
  
  // Get starting bill number from settings
  const startingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const startingNumber = parseInt(startingStmt.get('startingBillNumber')?.value || '1');
  
  // Get the last bill number
  const lastBillStmt = db.prepare(`
    SELECT billNumber FROM bills 
    WHERE billNumber LIKE ? 
    ORDER BY id DESC 
    LIMIT 1
  `);
  const lastBill = lastBillStmt.get(`${prefix}%`);
  
  let nextNumber = startingNumber;
  if (lastBill) {
    const lastNumber = parseInt(lastBill.billNumber.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// UPDATE - Edit existing bill
export function updateBill(billId: number, data: Partial<BillData>) {
  const db = getDatabase();
  
  // Get the original bill and items
  const originalBill = getBillById(billId);
  if (!originalBill) {
    throw new Error('Bill not found');
  }
  
  const transaction = db.transaction(() => {
    // If items are being updated, we need to restore old stock and apply new stock changes
    if (data.items) {
      // Restore stock for old items
      const oldItemsStmt = db.prepare('SELECT * FROM bill_items WHERE billId = ?');
      const oldItems = oldItemsStmt.all(billId);
      
      for (const oldItem of oldItems as any[]) {
        // Restore stock (add back the quantity that was sold)
        updateStock(oldItem.productId, oldItem.quantity, 'adjustment');
      }
      
      // Delete old items
      db.prepare('DELETE FROM bill_items WHERE billId = ?').run(billId);
      
      // Insert new items and update stock
      const itemStmt = db.prepare(`
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
        
        // Update product stock (negative quantity for sale)
        updateStock(item.product.id, -item.quantity, 'sale', billId);
      }
    }
    
    // Update bill details
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (data.subtotal !== undefined) {
      updateFields.push('subtotal = ?');
      updateValues.push(data.subtotal);
    }
    if (data.discountPercent !== undefined) {
      updateFields.push('discountPercent = ?');
      updateValues.push(data.discountPercent);
    }
    if (data.discountAmount !== undefined) {
      updateFields.push('discountAmount = ?');
      updateValues.push(data.discountAmount);
    }
    if (data.total !== undefined) {
      updateFields.push('total = ?');
      updateValues.push(data.total);
    }
    if (data.paymentMode !== undefined) {
      updateFields.push('paymentMode = ?');
      updateValues.push(data.paymentMode);
    }
    if (data.cashAmount !== undefined) {
      updateFields.push('cashAmount = ?');
      updateValues.push(data.cashAmount);
    }
    if (data.upiAmount !== undefined) {
      updateFields.push('upiAmount = ?');
      updateValues.push(data.upiAmount);
    }
    
    if (updateFields.length > 0) {
      updateValues.push(billId);
      const updateStmt = db.prepare(`
        UPDATE bills SET ${updateFields.join(', ')} WHERE id = ?
      `);
      updateStmt.run(...updateValues);
    }
  });
  
  transaction();
  
  // Log the activity
  addActivityLog(
    'update',
    'bill',
    `Updated bill: ${originalBill.bill.billNumber}`,
    billId,
    JSON.stringify(originalBill),
    JSON.stringify(data)
  );
  
  return getBillById(billId);
}

// DELETE - Delete bill and restore stock
export function deleteBill(billId: number) {
  const db = getDatabase();
  
  // Get the bill and items before deletion
  const billData = getBillById(billId);
  if (!billData) {
    throw new Error('Bill not found');
  }
  
  const transaction = db.transaction(() => {
    // Restore stock for all items
    const itemsStmt = db.prepare('SELECT * FROM bill_items WHERE billId = ?');
    const items = itemsStmt.all(billId);
    
    for (const item of items as any[]) {
      // Restore stock (add back the quantity that was sold)
      updateStock(item.productId, item.quantity, 'adjustment');
    }
    
    // Delete bill items
    db.prepare('DELETE FROM bill_items WHERE billId = ?').run(billId);
    
    // Delete the bill
    db.prepare('DELETE FROM bills WHERE id = ?').run(billId);
  });
  
  transaction();
  
  // Log the activity
  addActivityLog(
    'delete',
    'bill',
    `Deleted bill: ${billData.bill.billNumber} - Total: ₹${billData.bill.total}`,
    billId,
    JSON.stringify(billData),
    undefined
  );
  
  return { success: true, message: 'Bill deleted and stock restored' };
}

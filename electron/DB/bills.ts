import { getDatabase } from './connection';
import { updateStock } from './products';
import { addActivityLog } from './logs';
import { trackLocalChange } from '../services/dbSync';
import { recordBillPaymentTransactions, reverseBillPaymentTransactions, updateBillPaymentTransactions } from './cashUpiTransactions';

export interface BillData {
  items: Array<{
    product: {
      id: number;
      name: string;
      size?: string;
      price: number;
    };
    quantity: number;
    discountLocked?: boolean;
  }>;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMode: 'cash' | 'upi' | 'mixed';
  cashAmount?: number;
  upiAmount?: number;
  customerMobileNumber?: string;
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
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, customerMobileNumber, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    
    const billResult = billStmt.run(
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
    
    const billId = billResult.lastInsertRowid as number;
    
    // Insert bill items and update stock
    const itemStmt = db.prepare(`
      INSERT INTO bill_items (billId, productId, productName, size, quantity, unitPrice, totalPrice, discountLocked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        totalPrice,
        item.discountLocked ? 1 : 0
      );
      
      // Update product stock (negative quantity for sale)
      updateStock(item.product.id, -item.quantity, 'sale', billId);
    }
    
    return billId;
  });
  
  const billId = transaction();
  
  // Get the created bill and return just the bill object (not the full structure)
  const billStmt = db.prepare('SELECT * FROM bills WHERE id = ?');
  const bill = billStmt.get(billId) as any;
  
  // Track for sync
  trackLocalChange('bills', 'insert', billId, {
    bill_number: bill.billNumber,
    subtotal: bill.subtotal,
    discount_percent: bill.discountPercent,
    discount_amount: bill.discountAmount,
    total: bill.total,
    payment_mode: bill.paymentMode,
    cash_amount: bill.cashAmount,
    upi_amount: bill.upiAmount,
    customer_mobile_number: bill.customerMobileNumber,
    status: bill.status,
    created_at: bill.createdAt,
  });
  
  // Track bill items for sync
  const itemsStmt = db.prepare('SELECT * FROM bill_items WHERE billId = ?');
  const items = itemsStmt.all(billId) as any[];
  for (const item of items) {
    trackLocalChange('bill_items', 'insert', item.id, {
      bill_id: item.billId,
      product_id: item.productId,
      product_name: item.productName,
      size: item.size,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      discount_locked: item.discountLocked,
      created_at: new Date().toISOString(),
    });
  }
  
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

  // Record cash/UPI transactions for bill payments
  try {
    console.log(`🔄 About to record cash/UPI transactions for bill ${billNumber}:`);
    console.log(`   Payment Mode: ${data.paymentMode}`);
    console.log(`   Raw Cash Amount: ${data.cashAmount}`);
    console.log(`   Raw UPI Amount: ${data.upiAmount}`);
    console.log(`   Total: ₹${data.total}`);
    
    // Calculate actual cash and UPI amounts based on payment mode
    let actualCashAmount = data.cashAmount || 0;
    let actualUpiAmount = data.upiAmount || 0;
    
    // If payment mode is 'cash' but cashAmount is not set, use the total
    if (data.paymentMode === 'cash' && actualCashAmount === 0) {
      actualCashAmount = data.total;
      console.log(`💰 Setting cash amount to total (${data.total}) for cash payment mode`);
    }
    
    // If payment mode is 'upi' but upiAmount is not set, use the total
    if (data.paymentMode === 'upi' && actualUpiAmount === 0) {
      actualUpiAmount = data.total;
      console.log(`📱 Setting UPI amount to total (${data.total}) for UPI payment mode`);
    }
    
    // For mixed payments, both amounts should already be set correctly
    if (data.paymentMode === 'mixed') {
      console.log(`🔀 Mixed payment detected:`);
      console.log(`   Cash: ₹${actualCashAmount}`);
      console.log(`   UPI: ₹${actualUpiAmount}`);
      console.log(`   Sum: ₹${actualCashAmount + actualUpiAmount}`);
      console.log(`   Expected Total: ₹${data.total}`);
      
      if (actualCashAmount === 0 && actualUpiAmount === 0) {
        console.error(`❌ Mixed payment but both amounts are 0! This should not happen.`);
      }
      
      if (Math.abs((actualCashAmount + actualUpiAmount) - data.total) > 0.01) {
        console.warn(`⚠️  Mixed payment amounts don't match total! Difference: ₹${Math.abs((actualCashAmount + actualUpiAmount) - data.total)}`);
      }
    }
    
    console.log(`📤 Calling recordBillPaymentTransactions with:`);
    console.log(`   Cash: ₹${actualCashAmount}, UPI: ₹${actualUpiAmount}`);
    
    recordBillPaymentTransactions(
      billNumber,
      data.paymentMode,
      actualCashAmount,
      actualUpiAmount
    );
    
    console.log(`✅ Successfully called recordBillPaymentTransactions for bill ${billNumber}`);
  } catch (error) {
    console.error('❌ Error recording bill payment transactions:', error);
  }
  
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
    conditions.push('(billNumber LIKE ?)');
    const searchTerm = `%${searchQuery.trim()}%`;
    params.push(searchTerm);
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
  
  // Check if the generated bill number already exists and increment until we find an available one
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM bills WHERE billNumber = ?');
  let billNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  
  while (checkStmt.get(billNumber).count > 0) {
    nextNumber++;
    billNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }
  
  return billNumber;
}

// UPDATE - Edit existing bill
export function updateBill(billId: number, data: Partial<BillData>) {
  const db = getDatabase();
  
  // Get the original bill and items
  const originalBill = getBillById(billId);
  if (!originalBill) {
    throw new Error('Bill not found');
  }
  
  // Store original payment details for cash/UPI tracking
  const originalPaymentMode = originalBill.bill.paymentMode;
  const originalCashAmount = originalBill.bill.cashAmount || 0;
  const originalUpiAmount = originalBill.bill.upiAmount || 0;
  
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
  
  // Get the updated bill to check new payment details
  const updatedBill = getBillById(billId);
  if (updatedBill) {
    const newPaymentMode = updatedBill.bill.paymentMode;
    const newCashAmount = updatedBill.bill.cashAmount || 0;
    const newUpiAmount = updatedBill.bill.upiAmount || 0;
    
    // Update cash/UPI tracking if payment details changed
    if (originalPaymentMode !== newPaymentMode || 
        originalCashAmount !== newCashAmount || 
        originalUpiAmount !== newUpiAmount) {
      
      try {
        updateBillPaymentTransactions(
          originalBill.bill.billNumber,
          originalPaymentMode,
          originalCashAmount,
          originalUpiAmount,
          newPaymentMode,
          newCashAmount,
          newUpiAmount
        );
      } catch (error) {
        console.error('❌ Error updating cash/UPI transactions for bill edit:', error);
      }
    }
  }
  
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

// DELETE - Delete bill, save to deleted_bills, and restore stock
export function deleteBill(billId: number, reason?: string) {
  const db = getDatabase();
  
  // Get the bill and items before deletion
  const billData = getBillById(billId);
  if (!billData) {
    throw new Error('Bill not found');
  }
  
  const transaction = db.transaction(() => {
    // Save to deleted_bills table for potential restoration
    const deletedBillStmt = db.prepare(`
      INSERT INTO deleted_bills (originalBillId, billNumber, billData, itemsData, deletedAt, deletedBy, reason)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)
    `);
    deletedBillStmt.run(
      billId,
      billData.bill.billNumber,
      JSON.stringify(billData.bill),
      JSON.stringify(billData.items),
      'system',
      reason || 'Deleted by user'
    );
    
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
  
  // Reverse cash/UPI transactions for the deleted bill
  try {
    const cashAmount = billData.bill.cashAmount || 0;
    const upiAmount = billData.bill.upiAmount || 0;
    
    // Calculate actual amounts based on payment mode
    let actualCashAmount = cashAmount;
    let actualUpiAmount = upiAmount;
    
    if (billData.bill.paymentMode === 'cash' && actualCashAmount === 0) {
      actualCashAmount = billData.bill.total;
    }
    
    if (billData.bill.paymentMode === 'upi' && actualUpiAmount === 0) {
      actualUpiAmount = billData.bill.total;
    }
    
    reverseBillPaymentTransactions(
      billData.bill.billNumber,
      billData.bill.paymentMode,
      actualCashAmount,
      actualUpiAmount
    );
  } catch (error) {
    console.error('❌ Error reversing cash/UPI transactions for bill deletion:', error);
  }
  
  // Log the activity
  addActivityLog(
    'delete',
    'bill',
    `Deleted bill: ${billData.bill.billNumber} - Total: ₹${billData.bill.total}${reason ? ` - Reason: ${reason}` : ''}`,
    billId,
    JSON.stringify(billData),
    undefined
  );
  
  return { success: true, message: 'Bill deleted and saved to deleted bills' };
}

// READ - Get deleted bills
export function getDeletedBills(limit: number = 100, offset: number = 0) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM deleted_bills 
    ORDER BY deletedAt DESC 
    LIMIT ? OFFSET ?
  `);
  return stmt.all(limit, offset);
}

// READ - Get deleted bill by ID
export function getDeletedBillById(id: number) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM deleted_bills WHERE id = ?');
  return stmt.get(id);
}

// RESTORE - Restore a deleted bill
export function restoreDeletedBill(deletedBillId: number) {
  const db = getDatabase();
  
  // Get the deleted bill data
  const deletedBill: any = getDeletedBillById(deletedBillId);
  if (!deletedBill) {
    throw new Error('Deleted bill not found');
  }
  
  const billData = JSON.parse(deletedBill.billData);
  const itemsData = JSON.parse(deletedBill.itemsData);
  
  const transaction = db.transaction(() => {
    // Restore the bill (without id to get new auto-increment id)
    const billStmt = db.prepare(`
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, cashAmount, upiAmount, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const billResult = billStmt.run(
      billData.billNumber + '-RESTORED',
      billData.subtotal,
      billData.discountPercent,
      billData.discountAmount,
      billData.total,
      billData.paymentMode,
      billData.cashAmount || 0,
      billData.upiAmount || 0,
      'completed',
      billData.createdAt
    );
    
    const newBillId = Number(billResult.lastInsertRowid);
    
    // Restore bill items
    const itemStmt = db.prepare(`
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
      
      // Reduce stock again (since it was restored when deleted)
      updateStock(item.productId, -item.quantity, 'sale', newBillId);
    }
    
    // Remove from deleted_bills table
    db.prepare('DELETE FROM deleted_bills WHERE id = ?').run(deletedBillId);
  });
  
  transaction();
  
  // Restore cash/UPI transactions for the recovered bill
  try {
    const cashAmount = billData.cashAmount || 0;
    const upiAmount = billData.upiAmount || 0;
    
    // Calculate actual amounts based on payment mode
    let actualCashAmount = cashAmount;
    let actualUpiAmount = upiAmount;
    
    if (billData.paymentMode === 'cash' && actualCashAmount === 0) {
      actualCashAmount = billData.total;
    }
    
    if (billData.paymentMode === 'upi' && actualUpiAmount === 0) {
      actualUpiAmount = billData.total;
    }
    
    recordBillPaymentTransactions(
      billData.billNumber + '-RESTORED',
      billData.paymentMode,
      actualCashAmount,
      actualUpiAmount
    );
  } catch (error) {
    console.error('❌ Error recording cash/UPI transactions for bill recovery:', error);
  }
  
  // Log the activity
  addActivityLog(
    'create',
    'bill',
    `Restored deleted bill: ${billData.billNumber} as ${billData.billNumber}-RESTORED`,
    deletedBillId
  );
  
  return { success: true, message: 'Bill restored successfully', billNumber: billData.billNumber + '-RESTORED' };
}

// DELETE - Permanently delete a deleted bill record
export function permanentlyDeleteBill(deletedBillId: number) {
  const db = getDatabase();
  const deletedBill: any = getDeletedBillById(deletedBillId);
  
  if (!deletedBill) {
    throw new Error('Deleted bill not found');
  }
  
  db.prepare('DELETE FROM deleted_bills WHERE id = ?').run(deletedBillId);
  
  addActivityLog(
    'delete',
    'bill',
    `Permanently deleted bill record: ${deletedBill.billNumber}`,
    deletedBillId
  );
  
  return { success: true, message: 'Bill permanently deleted' };
}


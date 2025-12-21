import { getDatabase } from './connection';
import { updateStock } from './products';

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
  paymentMode: 'cash' | 'upi';
}

// CREATE - Create new bill with items
export function createBill(data: BillData) {
  const db = getDatabase();
  
  // Start transaction to ensure data consistency
  const transaction = db.transaction(() => {
    // Generate bill number
    const billNumber = generateBillNumber();
    
    // Insert bill
    const billStmt = db.prepare(`
      INSERT INTO bills (billNumber, subtotal, discountPercent, discountAmount, total, paymentMode, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const billResult = billStmt.run(
      billNumber,
      data.subtotal,
      data.discountPercent,
      data.discountAmount,
      data.total,
      data.paymentMode
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
  
  return bill;
}

// READ - Get all bills with date filtering
export function getBills(dateFrom?: string, dateTo?: string) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM bills';
  const params: any[] = [];
  
  if (dateFrom && dateTo) {
    query += ' WHERE date(createdAt) BETWEEN ? AND ?';
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    query += ' WHERE date(createdAt) >= ?';
    params.push(dateFrom);
  } else if (dateTo) {
    query += ' WHERE date(createdAt) <= ?';
    params.push(dateTo);
  }
  
  query += ' ORDER BY createdAt DESC';
  
  const stmt = db.prepare(query);
  return stmt.all(...params);
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
      COALESCE(SUM(CASE WHEN paymentMode = 'cash' THEN total ELSE 0 END), 0) as cashSales,
      COALESCE(SUM(CASE WHEN paymentMode = 'upi' THEN total ELSE 0 END), 0) as upiSales,
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
      COALESCE(SUM(CASE WHEN paymentMode = 'cash' THEN total ELSE 0 END), 0) as cashSales,
      COALESCE(SUM(CASE WHEN paymentMode = 'upi' THEN total ELSE 0 END), 0) as upiSales,
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
import { getDatabase } from './connection';
import { addActivityLog } from './logs';

export interface CashUpiTransaction {
  id?: number;
  type: 'cash' | 'upi';
  transactionType: 'incoming' | 'outgoing';
  amount: number;
  reason: string;
  description?: string;
  billNumber?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface CashUpiSummary {
  cashBalance: number;
  upiBalance: number;
  totalIncoming: number;
  totalOutgoing: number;
  todayIncoming: number;
  todayOutgoing: number;
  transactionCount: number;
}

// CREATE - Add new cash/UPI transaction
export function addCashUpiTransaction(data: CashUpiTransaction): number {
  const db = getDatabase();
  
  // Check for negative balance constraint for outgoing transactions
  if (data.transactionType === 'outgoing') {
    const currentSummary = getCashUpiSummary();
    
    if (data.type === 'cash') {
      const newCashBalance = currentSummary.cashBalance - data.amount;
      if (newCashBalance < 0) {
        throw new Error(`Insufficient cash balance. Current: ₹${currentSummary.cashBalance.toFixed(2)}, Required: ₹${data.amount.toFixed(2)}, Shortage: ₹${Math.abs(newCashBalance).toFixed(2)}`);
      }
    } else if (data.type === 'upi') {
      const newUpiBalance = currentSummary.upiBalance - data.amount;
      if (newUpiBalance < 0) {
        throw new Error(`Insufficient UPI balance. Current: ₹${currentSummary.upiBalance.toFixed(2)}, Required: ₹${data.amount.toFixed(2)}, Shortage: ₹${Math.abs(newUpiBalance).toFixed(2)}`);
      }
    }
  }
  
  const stmt = db.prepare(`
    INSERT INTO cash_upi_transactions (type, transactionType, amount, reason, description, billNumber, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    data.type,
    data.transactionType,
    data.amount,
    data.reason,
    data.description || null,
    data.billNumber || null,
    data.createdBy || 'system'
  );
  
  const transactionId = result.lastInsertRowid as number;
  
  // Log the activity
  addActivityLog(
    `${data.transactionType} ${data.type} transaction`,
    'system',
    transactionId,
    `${data.transactionType === 'incoming' ? 'Added' : 'Deducted'} ₹${data.amount} - ${data.reason}${data.billNumber ? ` (Bill: ${data.billNumber})` : ''}`
  );
  
  return transactionId;
}

// CREATE - Record bill payment transactions automatically
export function recordBillPaymentTransactions(billNumber: string, paymentMode: string, cashAmount: number, upiAmount: number): void {
  const db = getDatabase();
  
  try {
    console.log(`🔄 Recording bill payment transactions for bill ${billNumber}:`);
    console.log(`   Payment Mode: ${paymentMode}`);
    console.log(`   Cash Amount: ₹${cashAmount}`);
    console.log(`   UPI Amount: ₹${upiAmount}`);
    console.log(`   Total: ₹${cashAmount + upiAmount}`);
    
    let transactionsCreated = 0;
    
    // Record cash transaction if cash amount > 0
    if (cashAmount > 0) {
      const cashTransactionId = addCashUpiTransaction({
        type: 'cash',
        transactionType: 'incoming',
        amount: cashAmount,
        reason: 'Bill Payment',
        description: `Payment received for bill ${billNumber}`,
        billNumber: billNumber,
        createdBy: 'system'
      });
      console.log(`✅ Created cash transaction ${cashTransactionId} for ₹${cashAmount}`);
      transactionsCreated++;
    } else {
      console.log(`⏭️  Skipping cash transaction (amount: ₹${cashAmount})`);
    }
    
    // Record UPI transaction if UPI amount > 0
    if (upiAmount > 0) {
      const upiTransactionId = addCashUpiTransaction({
        type: 'upi',
        transactionType: 'incoming',
        amount: upiAmount,
        reason: 'Bill Payment',
        description: `UPI payment received for bill ${billNumber}`,
        billNumber: billNumber,
        createdBy: 'system'
      });
      console.log(`✅ Created UPI transaction ${upiTransactionId} for ₹${upiAmount}`);
      transactionsCreated++;
    } else {
      console.log(`⏭️  Skipping UPI transaction (amount: ₹${upiAmount})`);
    }
    
    if (transactionsCreated === 0) {
      console.warn(`⚠️  No transactions recorded for bill ${billNumber} - both amounts are 0`);
    } else {
      console.log(`🎉 Successfully recorded ${transactionsCreated} transaction(s) for bill ${billNumber}`);
    }
  } catch (error) {
    console.error('❌ Error recording bill payment transactions:', error);
    throw error;
  }
}

// READ - Get all transactions with optional filters
export function getCashUpiTransactions(
  type?: 'cash' | 'upi',
  transactionType?: 'incoming' | 'outgoing',
  dateFrom?: string,
  dateTo?: string,
  limit: number = 100,
  offset: number = 0
): CashUpiTransaction[] {
  const db = getDatabase();
  
  let query = `
    SELECT * FROM cash_upi_transactions
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }
  
  if (transactionType) {
    query += ` AND transactionType = ?`;
    params.push(transactionType);
  }
  
  if (dateFrom) {
    query += ` AND date(createdAt) >= date(?)`;
    params.push(dateFrom);
  }
  
  if (dateTo) {
    query += ` AND date(createdAt) <= date(?)`;
    params.push(dateTo);
  }
  
  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const stmt = db.prepare(query);
  return stmt.all(...params) as CashUpiTransaction[];
}

// READ - Get transaction by ID
export function getCashUpiTransactionById(id: number): CashUpiTransaction | null {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM cash_upi_transactions WHERE id = ?
  `);
  
  return stmt.get(id) as CashUpiTransaction || null;
}

// READ - Get summary/balance information
export function getCashUpiSummary(dateFrom?: string, dateTo?: string): CashUpiSummary {
  const db = getDatabase();
  
  let whereClause = '';
  const params: any[] = [];
  
  if (dateFrom && dateTo) {
    whereClause = ` WHERE date(createdAt) BETWEEN date(?) AND date(?)`;
    params.push(dateFrom, dateTo);
  }
  
  // Get overall balances (all time)
  const balanceStmt = db.prepare(`
    SELECT 
      type,
      transactionType,
      SUM(amount) as total
    FROM cash_upi_transactions
    GROUP BY type, transactionType
  `);
  
  const balanceData = balanceStmt.all() as Array<{
    type: 'cash' | 'upi';
    transactionType: 'incoming' | 'outgoing';
    total: number;
  }>;
  
  // Calculate balances
  let cashIncoming = 0, cashOutgoing = 0, upiIncoming = 0, upiOutgoing = 0;
  
  balanceData.forEach(row => {
    if (row.type === 'cash') {
      if (row.transactionType === 'incoming') cashIncoming = row.total;
      else cashOutgoing = row.total;
    } else {
      if (row.transactionType === 'incoming') upiIncoming = row.total;
      else upiOutgoing = row.total;
    }
  });
  
  // Get period-specific totals
  const periodStmt = db.prepare(`
    SELECT 
      transactionType,
      SUM(amount) as total
    FROM cash_upi_transactions
    ${whereClause}
    GROUP BY transactionType
  `);
  
  const periodData = periodStmt.all(...params) as Array<{
    transactionType: 'incoming' | 'outgoing';
    total: number;
  }>;
  
  let periodIncoming = 0, periodOutgoing = 0;
  periodData.forEach(row => {
    if (row.transactionType === 'incoming') periodIncoming = row.total;
    else periodOutgoing = row.total;
  });
  
  // Get today's totals
  const todayStmt = db.prepare(`
    SELECT 
      transactionType,
      SUM(amount) as total
    FROM cash_upi_transactions
    WHERE date(createdAt) = date('now', 'localtime')
    GROUP BY transactionType
  `);
  
  const todayData = todayStmt.all() as Array<{
    transactionType: 'incoming' | 'outgoing';
    total: number;
  }>;
  
  let todayIncoming = 0, todayOutgoing = 0;
  todayData.forEach(row => {
    if (row.transactionType === 'incoming') todayIncoming = row.total;
    else todayOutgoing = row.total;
  });
  
  // Get transaction count
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM cash_upi_transactions ${whereClause}
  `);
  const countResult = countStmt.get(...params) as { count: number };
  
  return {
    cashBalance: cashIncoming - cashOutgoing,
    upiBalance: upiIncoming - upiOutgoing,
    totalIncoming: periodIncoming,
    totalOutgoing: periodOutgoing,
    todayIncoming,
    todayOutgoing,
    transactionCount: countResult.count
  };
}

// READ - Get daily summary for a specific date
export function getDailyCashUpiSummary(date?: string): CashUpiSummary {
  const targetDate = date || new Date().toISOString().split('T')[0];
  return getCashUpiSummary(targetDate, targetDate);
}

// UPDATE - Update transaction (limited fields for security)
export function updateCashUpiTransaction(
  id: number, 
  updates: { description?: string; referenceNumber?: string }
): boolean {
  const db = getDatabase();
  
  const fields: string[] = [];
  const params: any[] = [];
  
  if (updates.description !== undefined) {
    fields.push('description = ?');
    params.push(updates.description);
  }
  
  if (updates.referenceNumber !== undefined) {
    fields.push('referenceNumber = ?');
    params.push(updates.referenceNumber);
  }
  
  if (fields.length === 0) return false;
  
  params.push(id);
  
  const stmt = db.prepare(`
    UPDATE cash_upi_transactions 
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  
  const result = stmt.run(...params);
  
  if (result.changes > 0) {
    addActivityLog(
      'Updated cash/UPI transaction',
      'system',
      id,
      `Updated transaction details`
    );
  }
  
  return result.changes > 0;
}

// DELETE - Soft delete (for audit trail) - Only for recent transactions
export function deleteCashUpiTransaction(id: number, reason: string): boolean {
  const db = getDatabase();
  
  // Check if transaction exists and is recent (within 24 hours)
  const checkStmt = db.prepare(`
    SELECT * FROM cash_upi_transactions 
    WHERE id = ? AND datetime(createdAt) > datetime('now', '-1 day', 'localtime')
  `);
  
  const transaction = checkStmt.get(id) as CashUpiTransaction;
  
  if (!transaction) {
    throw new Error('Transaction not found or too old to delete');
  }
  
  // For now, we'll just log the deletion attempt
  // In a production system, you might want to mark as deleted instead of actual deletion
  addActivityLog(
    'Attempted to delete cash/UPI transaction',
    'system',
    id,
    `Deletion requested: ${reason}. Transaction: ${transaction.type} ${transaction.transactionType} ₹${transaction.amount}`
  );
  
  // For security, we don't actually delete financial records
  // Instead, we log the attempt and return false
  return false;
}
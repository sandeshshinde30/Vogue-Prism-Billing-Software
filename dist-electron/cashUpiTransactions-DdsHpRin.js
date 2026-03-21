import { g as getDatabase, a as addActivityLog } from "./main-BbhSEMqQ.js";
function addCashUpiTransaction(data) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO cash_upi_transactions (type, transactionType, amount, reason, description, referenceNumber, billNumber, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.type,
    data.transactionType,
    data.amount,
    data.reason,
    data.description || null,
    data.referenceNumber || null,
    data.billNumber || null,
    data.createdBy || "system"
  );
  const transactionId = result.lastInsertRowid;
  addActivityLog(
    `${data.transactionType} ${data.type} transaction`,
    "cash_upi",
    transactionId,
    `${data.transactionType === "incoming" ? "Added" : "Deducted"} ₹${data.amount} - ${data.reason}${data.billNumber ? ` (Bill: ${data.billNumber})` : ""}`
  );
  return transactionId;
}
function recordBillPaymentTransactions(billNumber, paymentMode, cashAmount, upiAmount) {
  getDatabase();
  try {
    if (cashAmount > 0) {
      addCashUpiTransaction({
        type: "cash",
        transactionType: "incoming",
        amount: cashAmount,
        reason: "Bill Payment",
        description: `Payment received for bill ${billNumber}`,
        billNumber,
        createdBy: "system"
      });
    }
    if (upiAmount > 0) {
      addCashUpiTransaction({
        type: "upi",
        transactionType: "incoming",
        amount: upiAmount,
        reason: "Bill Payment",
        description: `UPI payment received for bill ${billNumber}`,
        billNumber,
        createdBy: "system"
      });
    }
    console.log(`Recorded payment transactions for bill ${billNumber}: Cash ₹${cashAmount}, UPI ₹${upiAmount}`);
  } catch (error) {
    console.error("Error recording bill payment transactions:", error);
  }
}
function getCashUpiTransactions(type, transactionType, dateFrom, dateTo, limit = 100, offset = 0) {
  const db = getDatabase();
  let query = `
    SELECT * FROM cash_upi_transactions
    WHERE 1=1
  `;
  const params = [];
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
  return stmt.all(...params);
}
function getCashUpiTransactionById(id) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM cash_upi_transactions WHERE id = ?
  `);
  return stmt.get(id) || null;
}
function getCashUpiSummary(dateFrom, dateTo) {
  const db = getDatabase();
  let whereClause = "";
  const params = [];
  if (dateFrom && dateTo) {
    whereClause = ` WHERE date(createdAt) BETWEEN date(?) AND date(?)`;
    params.push(dateFrom, dateTo);
  }
  const balanceStmt = db.prepare(`
    SELECT 
      type,
      transactionType,
      SUM(amount) as total
    FROM cash_upi_transactions
    GROUP BY type, transactionType
  `);
  const balanceData = balanceStmt.all();
  let cashIncoming = 0, cashOutgoing = 0, upiIncoming = 0, upiOutgoing = 0;
  balanceData.forEach((row) => {
    if (row.type === "cash") {
      if (row.transactionType === "incoming") cashIncoming = row.total;
      else cashOutgoing = row.total;
    } else {
      if (row.transactionType === "incoming") upiIncoming = row.total;
      else upiOutgoing = row.total;
    }
  });
  const periodStmt = db.prepare(`
    SELECT 
      transactionType,
      SUM(amount) as total
    FROM cash_upi_transactions
    ${whereClause}
    GROUP BY transactionType
  `);
  const periodData = periodStmt.all(...params);
  let periodIncoming = 0, periodOutgoing = 0;
  periodData.forEach((row) => {
    if (row.transactionType === "incoming") periodIncoming = row.total;
    else periodOutgoing = row.total;
  });
  const todayStmt = db.prepare(`
    SELECT 
      transactionType,
      SUM(amount) as total
    FROM cash_upi_transactions
    WHERE date(createdAt) = date('now', 'localtime')
    GROUP BY transactionType
  `);
  const todayData = todayStmt.all();
  let todayIncoming = 0, todayOutgoing = 0;
  todayData.forEach((row) => {
    if (row.transactionType === "incoming") todayIncoming = row.total;
    else todayOutgoing = row.total;
  });
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM cash_upi_transactions ${whereClause}
  `);
  const countResult = countStmt.get(...params);
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
function getDailyCashUpiSummary(date) {
  const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return getCashUpiSummary(targetDate, targetDate);
}
function updateCashUpiTransaction(id, updates) {
  const db = getDatabase();
  const fields = [];
  const params = [];
  if (updates.description !== void 0) {
    fields.push("description = ?");
    params.push(updates.description);
  }
  if (updates.referenceNumber !== void 0) {
    fields.push("referenceNumber = ?");
    params.push(updates.referenceNumber);
  }
  if (fields.length === 0) return false;
  params.push(id);
  const stmt = db.prepare(`
    UPDATE cash_upi_transactions 
    SET ${fields.join(", ")}
    WHERE id = ?
  `);
  const result = stmt.run(...params);
  if (result.changes > 0) {
    addActivityLog(
      "Updated cash/UPI transaction",
      "cash_upi",
      id,
      `Updated transaction details`
    );
  }
  return result.changes > 0;
}
export {
  addCashUpiTransaction,
  getCashUpiSummary,
  getCashUpiTransactionById,
  getCashUpiTransactions,
  getDailyCashUpiSummary,
  recordBillPaymentTransactions,
  updateCashUpiTransaction
};

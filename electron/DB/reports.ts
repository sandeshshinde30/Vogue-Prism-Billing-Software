import { getDatabase } from './connection';

// READ - Get sales report by date range
export function getSalesReport(dateFrom: string, dateTo: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
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
  `);
  
  return stmt.all(dateFrom, dateTo);
}

// READ - Export data for Excel with enhanced fields
export function exportData(dateFrom: string, dateTo: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
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
  `);
  
  return stmt.all(dateFrom, dateTo);
}

// READ - Get stock movement report
export function getStockMovementReport(dateFrom: string, dateTo: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
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
  `);
  
  return stmt.all(dateFrom, dateTo);
}

// READ - Get category-wise sales
export function getCategorySales(dateFrom: string, dateTo: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
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
  `);
  
  return stmt.all(dateFrom, dateTo);
}

// READ - Get payment mode summary
export function getPaymentModeSummary(dateFrom: string, dateTo: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT 
      paymentMode,
      COUNT(*) as billCount,
      SUM(total) as totalAmount,
      AVG(total) as averageAmount
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY paymentMode
  `);
  
  return stmt.all(dateFrom, dateTo);
}

// READ - Get hourly sales pattern
export function getHourlySales(date: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT 
      strftime('%H', createdAt) as hour,
      COUNT(*) as billCount,
      SUM(total) as totalAmount
    FROM bills
    WHERE date(createdAt) = ?
    GROUP BY strftime('%H', createdAt)
    ORDER BY hour
  `);
  
  return stmt.all(date);
}

// READ - Get low stock alert data
export function getLowStockAlert() {
  const db = getDatabase();
  
  const stmt = db.prepare(`
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
  `);
  
  return stmt.all();
}

// READ - Get product performance
export function getProductPerformance(dateFrom: string, dateTo: string, limit: number = 10) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
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
  `);
  
  return stmt.all(dateFrom, dateTo, limit);
}
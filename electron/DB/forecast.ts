import { getDatabase } from './connection';

// Ultra-lightweight forecast - returns raw data, frontend does calculations

export interface ForecastData {
  dailyRevenue: { date: string; revenue: number; bills: number }[];
  products: { name: string; category: string; size: string; stock: number; price: number; quantity: number; date: string }[];
  payments: { date: string; mode: string; total: number }[];
  discounts: { discountPercent: number; total: number }[];
}

export function getForecast(): ForecastData {
  const db = getDatabase();
  
  // Get today's date
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  
  // Calculate 60 days ago
  const d60 = new Date(now);
  d60.setDate(d60.getDate() - 60);
  const day60ago = `${d60.getFullYear()}-${String(d60.getMonth()+1).padStart(2,'0')}-${String(d60.getDate()).padStart(2,'0')}`;

  // 1. Daily revenue - simple aggregation
  const dailyRevenue = db.prepare(`
    SELECT date(createdAt, 'localtime') as date,
           SUM(total) as revenue,
           COUNT(*) as bills
    FROM bills
    WHERE date(createdAt, 'localtime') >= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(day60ago) as { date: string; revenue: number; bills: number }[];

  // 2. Product sales - simple join, limit to reduce load
  const products = db.prepare(`
    SELECT p.name, p.category, COALESCE(p.size,'') as size,
           p.stock, p.price,
           bi.quantity,
           date(b.createdAt, 'localtime') as date
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt, 'localtime') >= ?
      AND p.isActive = 1
    ORDER BY b.createdAt DESC
    LIMIT 500
  `).all(day60ago) as any[];

  // 3. Payment modes - simple aggregation
  const payments = db.prepare(`
    SELECT date(createdAt, 'localtime') as date,
           paymentMode as mode,
           total
    FROM bills
    WHERE date(createdAt, 'localtime') >= ?
    ORDER BY date ASC
  `).all(day60ago) as { date: string; mode: string; total: number }[];

  // 4. Discounts - simple query
  const discounts = db.prepare(`
    SELECT discountPercent, total
    FROM bills
    WHERE date(createdAt, 'localtime') >= ?
  `).all(day60ago) as { discountPercent: number; total: number }[];

  return {
    dailyRevenue,
    products,
    payments,
    discounts,
  };
}

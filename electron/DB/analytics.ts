import { getDatabase } from './connection';

export interface AnalyticsData {
  dailyStats: {
    date: string;
    sales: number;
    profit: number;
    cost: number;
    bills: number;
  }[];
  categoryBreakdown: {
    category: string;
    value: number;
    profit: number;
  }[];
  paymentModeStats: {
    mode: string;
    value: number;
    percentage: number;
  }[];
  hourlyStats: {
    hour: string;
    sales: number;
  }[];
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
  }[];
  summary: {
    totalRevenue: number;
    totalProfit: number;
    totalCost: number;
    totalBills: number;
    avgBillValue: number;
    profitMargin: number;
  };
}

export function getAnalytics(dateFrom: string, dateTo: string): AnalyticsData {
  const db = getDatabase();

  // Daily Stats
  const dailyStatsStmt = db.prepare(`
    SELECT 
      date(b.createdAt) as date,
      COALESCE(SUM(b.total), 0) as sales,
      COALESCE(SUM(
        (SELECT SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0)))
         FROM bill_items bi
         LEFT JOIN products p ON bi.productId = p.id
         WHERE bi.billId = b.id)
      ), 0) as profit,
      COALESCE(SUM(
        (SELECT SUM(bi.quantity * COALESCE(p.costPrice, 0))
         FROM bill_items bi
         LEFT JOIN products p ON bi.productId = p.id
         WHERE bi.billId = b.id)
      ), 0) as cost,
      COUNT(*) as bills
    FROM bills b
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY date(b.createdAt)
    ORDER BY date(b.createdAt)
  `);
  const dailyStats = dailyStatsStmt.all(dateFrom, dateTo) as any[];

  // Category Breakdown
  const categoryStmt = db.prepare(`
    SELECT 
      p.category,
      COALESCE(SUM(bi.totalPrice), 0) as value,
      COALESCE(SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0))), 0) as profit
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY p.category
    ORDER BY value DESC
  `);
  const categoryBreakdown = categoryStmt.all(dateFrom, dateTo) as any[];

  // Payment Mode Stats
  const paymentStmt = db.prepare(`
    SELECT 
      paymentMode as mode,
      COALESCE(SUM(total), 0) as value
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY paymentMode
  `);
  const paymentModeData = paymentStmt.all(dateFrom, dateTo) as any[];
  
  const totalPayments = paymentModeData.reduce((sum, item) => sum + item.value, 0);
  const paymentModeStats = paymentModeData.map(item => ({
    mode: item.mode.charAt(0).toUpperCase() + item.mode.slice(1),
    value: item.value,
    percentage: totalPayments > 0 ? (item.value / totalPayments) * 100 : 0
  }));

  // Hourly Stats
  const hourlyStmt = db.prepare(`
    SELECT 
      CAST(strftime('%H', createdAt) AS INTEGER) as hour,
      COALESCE(SUM(total), 0) as sales
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY hour
    ORDER BY hour
  `);
  const hourlyData = hourlyStmt.all(dateFrom, dateTo) as any[];
  
  // Fill in missing hours with 0
  const hourlyStats = Array.from({ length: 24 }, (_, i) => {
    const hourData = hourlyData.find(h => h.hour === i);
    return {
      hour: `${i.toString().padStart(2, '0')}:00`,
      sales: hourData ? hourData.sales : 0
    };
  });

  // Top Products
  const topProductsStmt = db.prepare(`
    SELECT 
      bi.productName as name,
      SUM(bi.quantity) as quantity,
      SUM(bi.totalPrice) as revenue,
      COALESCE(SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0))), 0) as profit
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi.productName
    ORDER BY revenue DESC
    LIMIT 10
  `);
  const topProducts = topProductsStmt.all(dateFrom, dateTo) as any[];

  // Summary
  const summaryStmt = db.prepare(`
    SELECT 
      COALESCE(SUM(b.total), 0) as totalRevenue,
      COALESCE(SUM(
        (SELECT SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0)))
         FROM bill_items bi
         LEFT JOIN products p ON bi.productId = p.id
         WHERE bi.billId = b.id)
      ), 0) as totalProfit,
      COALESCE(SUM(
        (SELECT SUM(bi.quantity * COALESCE(p.costPrice, 0))
         FROM bill_items bi
         LEFT JOIN products p ON bi.productId = p.id
         WHERE bi.billId = b.id)
      ), 0) as totalCost,
      COUNT(*) as totalBills,
      COALESCE(AVG(b.total), 0) as avgBillValue
    FROM bills b
    WHERE date(b.createdAt) BETWEEN ? AND ?
  `);
  const summaryData = summaryStmt.get(dateFrom, dateTo) as any;
  
  const profitMargin = summaryData.totalRevenue > 0 
    ? (summaryData.totalProfit / summaryData.totalRevenue) * 100 
    : 0;

  return {
    dailyStats,
    categoryBreakdown,
    paymentModeStats,
    hourlyStats,
    topProducts,
    summary: {
      totalRevenue: summaryData.totalRevenue,
      totalProfit: summaryData.totalProfit,
      totalCost: summaryData.totalCost,
      totalBills: summaryData.totalBills,
      avgBillValue: Math.round(summaryData.avgBillValue * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100
    }
  };
}

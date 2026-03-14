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
  // New analytics features
  salesGrowth: {
    currentRevenue: number;
    previousRevenue: number;
    growthPercentage: number;
    currentPeriodData: { date: string; sales: number }[];
    previousPeriodData: { date: string; sales: number }[];
  };
  customerRetention: {
    repeatCustomers: number;
    newCustomers: number;
    repeatPercentage: number;
  };
  profitableProducts: {
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    profitMargin: number;
  }[];
  lowPerformingProducts: {
    name: string;
    quantitySold: number;
    revenue: number;
    daysSinceLastSale: number;
  }[];
  peakSalesDay: {
    weekday: string;
    revenue: number;
    bills: number;
  }[];
  productBundles: {
    productA: string;
    productB: string;
    timesBoughtTogether: number;
  }[];
  inventoryRisk: {
    product: string;
    stock: number;
    avgDailySales: number;
    daysLeft: number;
  }[];
  discountEffectiveness: {
    revenueWithDiscount: number;
    revenueWithoutDiscount: number;
    avgBillWithDiscount: number;
    avgBillWithoutDiscount: number;
  };
  salesTarget: {
    target: number;
    achieved: number;
    percentage: number;
  };
}

export function getAnalytics(dateFrom: string, dateTo: string): AnalyticsData {
  const db = getDatabase();

  console.log('Analytics query - dateFrom:', dateFrom, 'dateTo:', dateTo);

  // Daily Stats with date filtering
  const dailyStatsStmt = db.prepare(`
    SELECT 
      date(b.createdAt) as date,
      COALESCE(SUM(b.total), 0) as sales,
      COUNT(*) as bills
    FROM bills b
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY date(b.createdAt)
    ORDER BY date(b.createdAt) DESC
  `);
  const dailyStatsRaw = dailyStatsStmt.all(dateFrom, dateTo) as any[];
  
  // Calculate profit and cost for each day
  const dailyStats = dailyStatsRaw.map(day => {
    const costStmt = db.prepare(`
      SELECT 
        COALESCE(SUM(bi.quantity * COALESCE(p.costPrice, 0)), 0) as cost
      FROM bill_items bi
      JOIN bills b ON bi.billId = b.id
      LEFT JOIN products p ON bi.productId = p.id
      WHERE date(b.createdAt) = ?
    `);
    const costData = costStmt.get(day.date) as any;
    const cost = costData?.cost || 0;
    const profit = day.sales - cost;
    
    return {
      date: day.date,
      sales: day.sales,
      profit: profit,
      cost: cost,
      bills: day.bills
    };
  });

  // Category Breakdown with date filtering
  const categoryStmt = db.prepare(`
    SELECT 
      COALESCE(p.category, 'Unknown') as category,
      COALESCE(SUM(bi.totalPrice), 0) as value
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY p.category
    ORDER BY value DESC
    LIMIT 10
  `);
  const categoryBreakdownRaw = categoryStmt.all(dateFrom, dateTo) as any[];
  
  // Calculate profit for each category
  const categoryBreakdown = categoryBreakdownRaw.map(cat => {
    const profitStmt = db.prepare(`
      SELECT 
        COALESCE(SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0))), 0) as profit
      FROM bill_items bi
      JOIN bills b ON bi.billId = b.id
      LEFT JOIN products p ON bi.productId = p.id
      WHERE COALESCE(p.category, 'Unknown') = ?
        AND date(b.createdAt) BETWEEN ? AND ?
    `);
    const profitData = profitStmt.get(cat.category, dateFrom, dateTo) as any;
    
    return {
      category: cat.category,
      value: cat.value,
      profit: profitData?.profit || 0
    };
  });

  // Payment Mode Stats with date filtering
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

  // Hourly Stats - all historical data
  const hourlyStmt = db.prepare(`
    SELECT 
      CAST(strftime('%H', createdAt) AS INTEGER) as hour,
      COALESCE(SUM(total), 0) as sales
    FROM bills
    GROUP BY hour
    ORDER BY hour
  `);
  const hourlyData = hourlyStmt.all() as any[];
  
  // Fill in missing hours with 0
  const hourlyStats = Array.from({ length: 24 }, (_, i) => {
    const hourData = hourlyData.find(h => h.hour === i);
    return {
      hour: `${i.toString().padStart(2, '0')}:00`,
      sales: hourData ? hourData.sales : 0
    };
  });

  // Top Products with date filtering
  const topProductsStmt = db.prepare(`
    SELECT 
      bi.productName as name,
      SUM(bi.quantity) as quantity,
      SUM(bi.totalPrice) as revenue
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi.productName
    ORDER BY revenue DESC
    LIMIT 10
  `);
  const topProductsRaw = topProductsStmt.all(dateFrom, dateTo) as any[];
  
  // Calculate profit for each product
  const topProducts = topProductsRaw.map(prod => {
    const profitStmt = db.prepare(`
      SELECT 
        COALESCE(SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0))), 0) as profit
      FROM bill_items bi
      JOIN bills b ON bi.billId = b.id
      LEFT JOIN products p ON bi.productId = p.id
      WHERE bi.productName = ?
        AND date(b.createdAt) BETWEEN ? AND ?
    `);
    const profitData = profitStmt.get(prod.name, dateFrom, dateTo) as any;
    
    return {
      name: prod.name,
      quantity: prod.quantity,
      revenue: prod.revenue,
      profit: profitData?.profit || 0
    };
  });

  // Summary with date filtering
  const summaryStmt = db.prepare(`
    SELECT 
      COALESCE(SUM(b.total), 0) as totalRevenue,
      COUNT(*) as totalBills,
      COALESCE(AVG(b.total), 0) as avgBillValue
    FROM bills b
    WHERE date(b.createdAt) BETWEEN ? AND ?
  `);
  const summaryData = summaryStmt.get(dateFrom, dateTo) as any;
  
  // Calculate total cost with date filtering
  const costStmt = db.prepare(`
    SELECT 
      COALESCE(SUM(bi.quantity * COALESCE(p.costPrice, 0)), 0) as totalCost
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
  `);
  const costData = costStmt.get(dateFrom, dateTo) as any;
  const totalCost = costData?.totalCost || 0;
  const totalProfit = summaryData.totalRevenue - totalCost;
  
  const profitMargin = summaryData.totalRevenue > 0 
    ? (totalProfit / summaryData.totalRevenue) * 100 
    : 0;

  // 1. Sales Growth Trend
  const daysDiff = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevDateFrom = new Date(new Date(dateFrom).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const prevDateTo = new Date(new Date(dateFrom).getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const currentPeriodStmt = db.prepare(`
    SELECT date(createdAt) as date, COALESCE(SUM(total), 0) as sales
    FROM bills WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY date(createdAt) ORDER BY date(createdAt)
  `);
  const currentPeriodData = currentPeriodStmt.all(dateFrom, dateTo) as any[];

  const previousPeriodStmt = db.prepare(`
    SELECT date(createdAt) as date, COALESCE(SUM(total), 0) as sales
    FROM bills WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY date(createdAt) ORDER BY date(createdAt)
  `);
  const previousPeriodDataRaw = previousPeriodStmt.all(prevDateFrom, prevDateTo) as any[];
  
  // Align previous period data with current period by index
  const previousPeriodData = previousPeriodDataRaw.map((item, idx) => ({
    date: `Day ${idx + 1}`,
    sales: item.sales
  }));

  const currentRevenue = currentPeriodData.reduce((sum, d) => sum + d.sales, 0);
  const previousRevenue = previousPeriodDataRaw.reduce((sum, d) => sum + d.sales, 0);
  const growthPercentage = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  // 3. Customer Retention (using phone numbers)
  const customerStmt = db.prepare(`
    SELECT customerMobileNumber, COUNT(*) as purchaseCount
    FROM bills
    WHERE customerMobileNumber IS NOT NULL AND customerMobileNumber != ''
      AND date(createdAt) BETWEEN ? AND ?
    GROUP BY customerMobileNumber
  `);
  const customers = customerStmt.all(dateFrom, dateTo) as any[];
  const repeatCustomers = customers.filter(c => c.purchaseCount > 1).length;
  const newCustomers = customers.filter(c => c.purchaseCount === 1).length;
  const totalCustomers = customers.length;
  const repeatPercentage = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

  // 4. Product Profitability Ranking
  const profitableStmt = db.prepare(`
    SELECT 
      bi.productName as name,
      SUM(bi.totalPrice) as revenue,
      SUM(bi.quantity * COALESCE(p.costPrice, 0)) as cost,
      SUM(bi.quantity * (bi.unitPrice - COALESCE(p.costPrice, 0))) as profit
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi.productName
    ORDER BY profit DESC
    LIMIT 10
  `);
  const profitableProductsRaw = profitableStmt.all(dateFrom, dateTo) as any[];
  const profitableProducts = profitableProductsRaw.map(p => ({
    ...p,
    profitMargin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0
  }));

  // 5. Low Performing Products
  const lowPerformingStmt = db.prepare(`
    SELECT 
      p.name,
      COALESCE(SUM(bi.quantity), 0) as quantitySold,
      COALESCE(SUM(bi.totalPrice), 0) as revenue,
      COALESCE(JULIANDAY('now') - JULIANDAY(MAX(b.createdAt)), 999) as daysSinceLastSale
    FROM products p
    LEFT JOIN bill_items bi ON p.id = bi.productId
    LEFT JOIN bills b ON bi.billId = b.id AND date(b.createdAt) BETWEEN ? AND ?
    WHERE p.isActive = 1
    GROUP BY p.id, p.name
    ORDER BY quantitySold ASC, revenue ASC
    LIMIT 10
  `);
  const lowPerformingProducts = lowPerformingStmt.all(dateFrom, dateTo) as any[];

  // 6. Peak Sales Day Analysis
  const peakDayStmt = db.prepare(`
    SELECT 
      CASE CAST(strftime('%w', createdAt) AS INTEGER)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as weekday,
      SUM(total) as revenue,
      COUNT(*) as bills
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
    GROUP BY strftime('%w', createdAt)
    ORDER BY revenue DESC
  `);
  const peakSalesDay = peakDayStmt.all(dateFrom, dateTo) as any[];

  // 7. Product Bundle Opportunities
  const bundleStmt = db.prepare(`
    SELECT 
      bi1.productName as productA,
      bi2.productName as productB,
      COUNT(*) as timesBoughtTogether
    FROM bill_items bi1
    JOIN bill_items bi2 ON bi1.billId = bi2.billId AND bi1.productId < bi2.productId
    JOIN bills b ON bi1.billId = b.id
    WHERE date(b.createdAt) BETWEEN ? AND ?
    GROUP BY bi1.productName, bi2.productName
    HAVING timesBoughtTogether > 1
    ORDER BY timesBoughtTogether DESC
    LIMIT 10
  `);
  const productBundles = bundleStmt.all(dateFrom, dateTo) as any[];

  // 8. Inventory Risk
  const inventoryStmt = db.prepare(`
    SELECT 
      p.name as product,
      p.stock,
      COALESCE(SUM(bi.quantity) / NULLIF(?, 1), 0) as avgDailySales
    FROM products p
    LEFT JOIN bill_items bi ON p.id = bi.productId
    LEFT JOIN bills b ON bi.billId = b.id AND date(b.createdAt) BETWEEN ? AND ?
    WHERE p.isActive = 1 AND p.stock > 0
    GROUP BY p.id, p.name, p.stock
  `);
  const inventoryRaw = inventoryStmt.all(daysDiff || 1, dateFrom, dateTo) as any[];
  const inventoryRisk = inventoryRaw.map(i => ({
    ...i,
    daysLeft: i.avgDailySales > 0 ? Math.floor(i.stock / i.avgDailySales) : 999
  })).filter(i => i.daysLeft < 30).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 10);

  // 9. Discount Effectiveness
  const discountStmt = db.prepare(`
    SELECT 
      SUM(CASE WHEN discountAmount > 0 THEN total ELSE 0 END) as revenueWithDiscount,
      SUM(CASE WHEN discountAmount = 0 THEN total ELSE 0 END) as revenueWithoutDiscount,
      AVG(CASE WHEN discountAmount > 0 THEN total ELSE NULL END) as avgBillWithDiscount,
      AVG(CASE WHEN discountAmount = 0 THEN total ELSE NULL END) as avgBillWithoutDiscount
    FROM bills
    WHERE date(createdAt) BETWEEN ? AND ?
  `);
  const discountData = discountStmt.get(dateFrom, dateTo) as any;
  const discountEffectiveness = {
    revenueWithDiscount: discountData.revenueWithDiscount || 0,
    revenueWithoutDiscount: discountData.revenueWithoutDiscount || 0,
    avgBillWithDiscount: discountData.avgBillWithDiscount || 0,
    avgBillWithoutDiscount: discountData.avgBillWithoutDiscount || 0
  };

  // 10. Sales Target Progress (get target from settings)
  const targetSettingStmt = db.prepare(`SELECT value FROM settings WHERE key = 'monthlyTarget'`);
  const targetSetting = targetSettingStmt.get() as any;
  const monthlyTarget = targetSetting ? parseFloat(targetSetting.value) : 100000;
  
  const targetStmt = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as achieved
    FROM bills
    WHERE strftime('%Y-%m', createdAt) = strftime('%Y-%m', 'now')
  `);
  const targetData = targetStmt.get() as any;
  const salesTarget = {
    target: monthlyTarget,
    achieved: targetData.achieved || 0,
    percentage: (targetData.achieved / monthlyTarget) * 100
  };

  return {
    dailyStats,
    categoryBreakdown,
    paymentModeStats,
    hourlyStats,
    topProducts,
    summary: {
      totalRevenue: summaryData.totalRevenue,
      totalProfit: totalProfit,
      totalCost: totalCost,
      totalBills: summaryData.totalBills,
      avgBillValue: Math.round(summaryData.avgBillValue * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100
    },
    salesGrowth: {
      currentRevenue,
      previousRevenue,
      growthPercentage: Math.round(growthPercentage * 100) / 100,
      currentPeriodData,
      previousPeriodData
    },
    customerRetention: {
      repeatCustomers,
      newCustomers,
      repeatPercentage: Math.round(repeatPercentage * 100) / 100
    },
    profitableProducts,
    lowPerformingProducts,
    peakSalesDay,
    productBundles,
    inventoryRisk,
    discountEffectiveness,
    salesTarget
  };
}

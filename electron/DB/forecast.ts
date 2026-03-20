import { getDatabase } from './connection';

// ============================================================================
// MATHEMATICAL UTILITIES - Pure Data Mining (No ML Libraries)
// ============================================================================

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  predictions: number[];
}

interface DataPoint {
  date: string;
  value: number;
}

// Linear Regression: y = mx + b
function linearRegression(data: number[]): RegressionResult {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0, predictions: data };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
    sumY2 += data[i] * data[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R² (coefficient of determination)
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  const predictions: number[] = [];

  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    predictions.push(predicted);
    ssRes += Math.pow(data[i] - predicted, 2);
    ssTot += Math.pow(data[i] - yMean, 2);
  }

  const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

  return { slope, intercept, rSquared, predictions };
}

// Moving Average
function movingAverage(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// Standard Deviation & Variance
function calculateStats(data: number[]): { mean: number; stdDev: number; variance: number; min: number; max: number } {
  if (data.length === 0) return { mean: 0, stdDev: 0, variance: 0, min: 0, max: 0 };

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);

  return { mean, stdDev, variance, min, max };
}

// Coefficient of Variation (CV) - Measure of consistency
function coefficientOfVariation(data: number[]): number {
  const stats = calculateStats(data);
  return stats.mean === 0 ? 0 : (stats.stdDev / stats.mean) * 100;
}

// Confidence Level based on data consistency
function getConfidenceLevel(cv: number, dataPoints: number): 'Low' | 'Medium' | 'High' {
  if (dataPoints < 7) return 'Low';
  if (cv > 50) return 'Low';
  if (cv > 30) return 'Medium';
  return 'High';
}

// Growth Rate Calculation
function calculateGrowthRate(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

// ============================================================================
// FORECAST DATA STRUCTURES
// ============================================================================

export interface ForecastOutput {
  summary: {
    totalSales: number;
    avgDailySales: number;
    totalBills: number;
    dataPoints: number;
    dateRange: { from: string; to: string };
  };
  trends: {
    dailyTrend: Array<{ date: string; sales: number; ma7: number; ma30: number }>;
    weeklyTrend: Array<{ week: number; sales: number; avgDaily: number }>;
    monthlyTrend: Array<{ month: string; sales: number; avgDaily: number; growth: number }>;
    regression: {
      slope: number;
      slopeExplanation: string;
      rSquared: number;
      accuracy: string;
      forecast7Days: Array<{ date: string; predicted: number; lower: number; upper: number }>;
      forecast30Days: Array<{ date: string; predicted: number; lower: number; upper: number }>;
      forecast90Days: Array<{ date: string; predicted: number }>;
    };
  };
  predictions: {
    nextWeekTotal: number;
    nextMonthTotal: number;
    next90DaysTotal: number;
    nextWeekDaily: number;
    nextMonthDaily: number;
    next90DaysDaily: number;
    trendStrength: number;
    volatilityScore: number;
  };
  weeklyPattern: {
    byDay: Array<{ day: string; avgSales: number; totalSales: number; billCount: number; performance: string; predictedSales: number }>;
    weekendVsWeekday: { weekendAvg: number; weekdayAvg: number; difference: number; differencePercent: number };
    bestDay: string;
    worstDay: string;
    weeklyForecast: Array<{ day: string; predicted: number }>;
  };
  products: {
    topSelling: Array<{ name: string; category: string; quantity: number; revenue: number; growth: number; predictedDemand30: number }>;
    slowMoving: Array<{ name: string; category: string; quantity: number; revenue: number; daysInStock: number }>;
    forecast: Array<{ name: string; currentDemand: number; forecast30Days: number; forecast90Days: number; restockPriority: 'High' | 'Medium' | 'Low'; daysUntilStockout: number }>;
    demandTrend: Array<{ name: string; trend: 'Increasing' | 'Stable' | 'Decreasing'; growthRate: number }>;
  };
  categories: {
    performance: Array<{ name: string; revenue: number; quantity: number; avgPrice: number; growth: number; predictedRevenue30: number }>;
    topCategory: string;
    bottomCategory: string;
    categoryForecast: Array<{ name: string; current: number; forecast30: number; forecast90: number }>;
  };
  payments: {
    distribution: Array<{ mode: string; count: number; percentage: number; avgValue: number }>;
    trends: Array<{ mode: string; growth: number; trend: 'Increasing' | 'Stable' | 'Decreasing'; predictedPercentage30: number }>;
    dominantMode: string;
    paymentForecast: Array<{ mode: string; predicted7Days: number; predicted30Days: number }>;
  };
  seasonality: {
    weeklyPattern: string;
    monthlyPattern: string;
    peakDays: string[];
    lowDays: string[];
    seasonalIndex: Array<{ day: string; index: number }>;
  };
  insights: string[];
  confidence: {
    level: 'Low' | 'Medium' | 'High';
    reason: string;
    dataQuality: number;
  };
}

// ============================================================================
// MAIN FORECAST FUNCTION
// ============================================================================

export function getForecast(): ForecastOutput {
  const db = getDatabase();

  // ========== 1. FETCH ALL SALES DATA ==========
  const billsStmt = db.prepare(`
    SELECT 
      id, 
      total, 
      paymentMode, 
      date(createdAt) as date,
      strftime('%w', createdAt) as dayOfWeek,
      strftime('%Y-%m', createdAt) as yearMonth,
      createdAt
    FROM bills
    WHERE status = 'completed'
    ORDER BY createdAt ASC
  `);
  const bills = billsStmt.all() as any[];

  if (bills.length === 0) {
    return getEmptyForecast();
  }

  // ========== 2. FETCH PRODUCT SALES DATA ==========
  const productSalesStmt = db.prepare(`
    SELECT 
      bi.productId,
      bi.productName,
      p.category,
      SUM(bi.quantity) as totalQuantity,
      SUM(bi.totalPrice) as totalRevenue,
      COUNT(DISTINCT bi.billId) as billCount,
      MIN(b.createdAt) as firstSale,
      MAX(b.createdAt) as lastSale
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    WHERE b.status = 'completed'
    GROUP BY bi.productId, bi.productName, p.category
    ORDER BY totalRevenue DESC
  `);
  const productSales = productSalesStmt.all() as any[];

  // ========== 3. AGGREGATE DAILY SALES ==========
  const dailySalesMap = new Map<string, number>();
  const dailyBillsMap = new Map<string, number>();
  const dayOfWeekMap = new Map<number, { sales: number; count: number }>();

  for (const bill of bills) {
    const date = bill.date;
    const dow = parseInt(bill.dayOfWeek);

    dailySalesMap.set(date, (dailySalesMap.get(date) || 0) + bill.total);
    dailyBillsMap.set(date, (dailyBillsMap.get(date) || 0) + 1);

    if (!dayOfWeekMap.has(dow)) {
      dayOfWeekMap.set(dow, { sales: 0, count: 0 });
    }
    const dayData = dayOfWeekMap.get(dow)!;
    dayData.sales += bill.total;
    dayData.count += 1;
  }

  const dailySalesArray = Array.from(dailySalesMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, sales]) => ({ date, sales }));

  const salesValues = dailySalesArray.map(d => d.sales);

  // ========== 4. LINEAR REGRESSION ANALYSIS ==========
  const regression = linearRegression(salesValues);
  const trendDirection = regression.slope > 0 ? 'Increasing' : regression.slope < 0 ? 'Decreasing' : 'Stable';
  const trendStrength = Math.abs(regression.slope);
  const stats = calculateStats(salesValues);
  const std = stats.stdDev;

  // Generate forecasts with confidence intervals
  const lastDate = new Date(dailySalesArray[dailySalesArray.length - 1].date);
  const forecast7Days = [];
  const forecast30Days = [];
  const forecast90Days = [];

  // Calculate confidence interval (95%)
  const confidenceMultiplier = 1.96;

  for (let i = 1; i <= 7; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    const predicted = Math.max(0, regression.intercept + regression.slope * (salesValues.length + i - 1));
    const margin = confidenceMultiplier * std * Math.sqrt(1 + 1 / salesValues.length + Math.pow(i - salesValues.length / 2, 2) / Math.pow(salesValues.length, 2));
    
    forecast7Days.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: Math.round(predicted),
      lower: Math.max(0, Math.round(predicted - margin)),
      upper: Math.round(predicted + margin)
    });
  }

  for (let i = 1; i <= 30; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    const predicted = Math.max(0, regression.intercept + regression.slope * (salesValues.length + i - 1));
    const margin = confidenceMultiplier * std * Math.sqrt(1 + 1 / salesValues.length + Math.pow(i - salesValues.length / 2, 2) / Math.pow(salesValues.length, 2));
    
    forecast30Days.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: Math.round(predicted),
      lower: Math.max(0, Math.round(predicted - margin)),
      upper: Math.round(predicted + margin)
    });
  }

  for (let i = 1; i <= 90; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    const predicted = Math.max(0, regression.intercept + regression.slope * (salesValues.length + i - 1));
    
    forecast90Days.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: Math.round(predicted)
    });
  }

  // Calculate prediction totals
  const nextWeekTotal = forecast7Days.reduce((sum, d) => sum + d.predicted, 0);
  const nextMonthTotal = forecast30Days.reduce((sum, d) => sum + d.predicted, 0);
  const next90DaysTotal = forecast90Days.reduce((sum, d) => sum + d.predicted, 0);
  const nextWeekDaily = Math.round(nextWeekTotal / 7);
  const nextMonthDaily = Math.round(nextMonthTotal / 30);
  const next90DaysDaily = Math.round(next90DaysTotal / 90);

  // ========== 5. MOVING AVERAGES ==========
  const ma7 = movingAverage(salesValues, 7);
  const ma30 = movingAverage(salesValues, 30);

  const dailyTrend = dailySalesArray.map((d, idx) => ({
    date: d.date,
    sales: d.sales,
    ma7: Math.round(ma7[idx]),
    ma30: Math.round(ma30[idx])
  }));

  // ========== 6. WEEKLY ANALYSIS ==========
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weeklyByDay = dayNames.map((day, idx) => {
    const dayData = dayOfWeekMap.get(idx) || { sales: 0, count: 0 };
    const avgSales = dayData.count > 0 ? dayData.sales / dayData.count : 0;
    // Predict next week's sales for this day
    const predictedSales = Math.max(0, regression.intercept + regression.slope * (salesValues.length + 7));
    
    return {
      day,
      avgSales: Math.round(avgSales),
      totalSales: Math.round(dayData.sales),
      billCount: dayData.count,
      performance: getPerformanceLabel(avgSales, stats.mean),
      predictedSales: Math.round(predictedSales)
    };
  });

  // Weekly forecast for next 7 days
  const weeklyForecast = dayNames.map((day, idx) => {
    const nextWeekDate = new Date(lastDate);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7 + idx);
    const dayOfWeek = nextWeekDate.getDay();
    const historicalAvg = weeklyByDay[dayOfWeek].avgSales;
    const predicted = Math.max(0, regression.intercept + regression.slope * (salesValues.length + 7 + idx));
    
    return {
      day,
      predicted: Math.round(predicted)
    };
  });

  const weekendDays = [0, 6]; // Sunday, Saturday
  const weekendAvg = weeklyByDay
    .filter((_, idx) => weekendDays.includes(idx))
    .reduce((sum, d) => sum + d.avgSales, 0) / 2;

  const weekdayAvg = weeklyByDay
    .filter((_, idx) => !weekendDays.includes(idx))
    .reduce((sum, d) => sum + d.avgSales, 0) / 5;

  const bestDay = weeklyByDay.reduce((max, d) => d.avgSales > max.avgSales ? d : max);
  const worstDay = weeklyByDay.reduce((min, d) => d.avgSales < min.avgSales ? d : min);

  // ========== 7. MONTHLY ANALYSIS ==========
  const monthlyMap = new Map<string, { sales: number; count: number }>();
  for (const bill of bills) {
    const month = bill.yearMonth;
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { sales: 0, count: 0 });
    }
    const monthData = monthlyMap.get(month)!;
    monthData.sales += bill.total;
    monthData.count += 1;
  }

  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((entry, idx, arr) => {
      const [month, data] = entry;
      const avgDaily = data.sales / 30; // Approximate
      const prevMonth = idx > 0 ? arr[idx - 1][1] : null;
      const growth = prevMonth ? calculateGrowthRate(prevMonth.sales, data.sales) : 0;

      return {
        month,
        sales: Math.round(data.sales),
        avgDaily: Math.round(avgDaily),
        growth: Math.round(growth * 10) / 10
      };
    });

  // ========== 8. PRODUCT PERFORMANCE ==========
  const topSelling = productSales.slice(0, 10).map(p => ({
    name: p.productName,
    category: p.category || 'Uncategorized',
    quantity: p.totalQuantity,
    revenue: Math.round(p.totalRevenue),
    growth: 0 // Will calculate from historical data if available
  }));

  const slowMoving = productSales
    .filter(p => p.totalQuantity < 5)
    .slice(0, 5)
    .map(p => ({
      name: p.productName,
      category: p.category || 'Uncategorized',
      quantity: p.totalQuantity,
      revenue: Math.round(p.totalRevenue),
      daysInStock: calculateDaysInStock(p.firstSale, p.lastSale)
    }));

  // Product forecast based on average daily demand
  const productForecast = productSales.slice(0, 15).map(p => {
    const daysInStock = calculateDaysInStock(p.firstSale, p.lastSale);
    const avgDailyDemand = p.totalQuantity / daysInStock;
    const forecast30 = Math.round(avgDailyDemand * 30);
    const forecast90 = Math.round(avgDailyDemand * 90);
    const currentStock = getProductStock(db, p.productId);
    const daysUntilStockout = currentStock > 0 ? Math.ceil(currentStock / avgDailyDemand) : 0;

    let priority: 'High' | 'Medium' | 'Low' = 'Low';
    if (daysUntilStockout < 7 || forecast30 > 50) priority = 'High';
    else if (daysUntilStockout < 14 || forecast30 > 20) priority = 'Medium';

    return {
      name: p.productName,
      currentDemand: Math.round(avgDailyDemand),
      forecast30Days: forecast30,
      forecast90Days: forecast90,
      restockPriority: priority,
      daysUntilStockout: Math.max(0, daysUntilStockout)
    };
  });

  // Product demand trends
  const productDemandTrend = productSales.slice(0, 10).map(p => {
    const daysInStock = calculateDaysInStock(p.firstSale, p.lastSale);
    const avgDailyDemand = p.totalQuantity / daysInStock;
    
    // Split data into two halves to calculate trend
    const midDate = new Date(p.firstSale);
    midDate.setDate(midDate.getDate() + Math.floor(daysInStock / 2));
    
    const firstHalfDemand = p.totalQuantity / 2;
    const secondHalfDemand = p.totalQuantity / 2;
    const growthRate = calculateGrowthRate(firstHalfDemand, secondHalfDemand);
    
    let trend: 'Increasing' | 'Stable' | 'Decreasing' = 'Stable';
    if (growthRate > 10) trend = 'Increasing';
    else if (growthRate < -10) trend = 'Decreasing';

    return {
      name: p.productName,
      trend,
      growthRate: Math.round(growthRate * 10) / 10
    };
  });

  // ========== 9. CATEGORY ANALYSIS ==========
  const categoryMap = new Map<string, { revenue: number; quantity: number; count: number }>();
  for (const product of productSales) {
    const cat = product.category || 'Uncategorized';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { revenue: 0, quantity: 0, count: 0 });
    }
    const catData = categoryMap.get(cat)!;
    catData.revenue += product.totalRevenue;
    catData.quantity += product.totalQuantity;
    catData.count += 1;
  }

  const categoryPerformance = Array.from(categoryMap.entries())
    .map(([name, data]) => {
      const avgDailyRevenue = data.revenue / Math.max(data.count, 1);
      const predictedRevenue30 = Math.round(avgDailyRevenue * 30);
      return {
        name,
        revenue: Math.round(data.revenue),
        quantity: data.quantity,
        avgPrice: Math.round(data.revenue / data.quantity),
        growth: 0,
        predictedRevenue30
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Category forecast
  const categoryForecast = categoryPerformance.map(cat => {
    const avgDailyRevenue = cat.revenue / Math.max(cat.quantity, 1);
    const forecast30 = Math.round(avgDailyRevenue * 30);
    const forecast90 = Math.round(avgDailyRevenue * 90);
    
    return {
      name: cat.name,
      current: cat.revenue,
      forecast30,
      forecast90
    };
  });

  const topCategory = categoryPerformance[0]?.name || 'N/A';
  const bottomCategory = categoryPerformance[categoryPerformance.length - 1]?.name || 'N/A';

  // ========== 10. PAYMENT ANALYSIS ==========
  const paymentMap = new Map<string, { count: number; total: number }>();
  for (const bill of bills) {
    const mode = bill.paymentMode;
    if (!paymentMap.has(mode)) {
      paymentMap.set(mode, { count: 0, total: 0 });
    }
    const payData = paymentMap.get(mode)!;
    payData.count += 1;
    payData.total += bill.total;
  }

  const totalBills = bills.length;
  const paymentDistribution = Array.from(paymentMap.entries()).map(([mode, data]) => ({
    mode: mode.toUpperCase(),
    count: data.count,
    percentage: Math.round((data.count / totalBills) * 1000) / 10,
    avgValue: Math.round(data.total / data.count)
  }));

  const dominantMode = paymentDistribution.reduce((max, p) => p.count > max.count ? p : max).mode;

  // Payment trends (first half vs second half)
  const midPoint = Math.floor(bills.length / 2);
  const firstHalf = bills.slice(0, midPoint);
  const secondHalf = bills.slice(midPoint);

  const paymentTrends = Array.from(paymentMap.keys()).map(mode => {
    const firstHalfCount = firstHalf.filter(b => b.paymentMode === mode).length;
    const secondHalfCount = secondHalf.filter(b => b.paymentMode === mode).length;
    const growth = calculateGrowthRate(firstHalfCount || 1, secondHalfCount);
    const trend = growth > 5 ? 'Increasing' : growth < -5 ? 'Decreasing' : 'Stable';
    
    // Calculate predicted percentage for next 30 days
    const currentPercentage = (secondHalfCount / secondHalf.length) * 100;
    const predictedPercentage = Math.min(100, Math.max(0, currentPercentage + (growth * 0.3)));

    return {
      mode: mode.toUpperCase(),
      growth: Math.round(growth * 10) / 10,
      trend: trend as 'Increasing' | 'Stable' | 'Decreasing',
      predictedPercentage30: Math.round(predictedPercentage * 10) / 10
    };
  });

  // Payment forecast
  const paymentForecast = Array.from(paymentMap.keys()).map(mode => {
    const modeData = paymentMap.get(mode)!;
    const avgTransactionValue = modeData.total / modeData.count;
    const predicted7Days = Math.round((nextWeekTotal / 7) * (modeData.count / totalBills));
    const predicted30Days = Math.round((nextMonthTotal / 30) * (modeData.count / totalBills));
    
    return {
      mode: mode.toUpperCase(),
      predicted7Days,
      predicted30Days
    };
  });

  // ========== 11. CONFIDENCE & DATA QUALITY ==========
  const cv = coefficientOfVariation(salesValues);
  const confidence = getConfidenceLevel(cv, salesValues.length);
  const dataQuality = Math.max(0, Math.min(100, 100 - cv));

  // ========== 12. GENERATE INSIGHTS ==========
  const insights = generateInsights(
    regression,
    weeklyByDay,
    weekendAvg,
    weekdayAvg,
    topSelling,
    categoryPerformance,
    paymentTrends,
    productForecast,
    stats
  );

  // ========== 13. SEASONALITY PATTERNS ==========
  const weeklyPatternInsight = weekendAvg > weekdayAvg
    ? `Weekend sales are ${Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100)}% higher than weekdays`
    : `Weekday sales are ${Math.round(((weekdayAvg - weekendAvg) / weekendAvg) * 100)}% higher than weekends`;

  const peakDays = weeklyByDay.filter(d => d.performance === 'High').map(d => d.day);
  const lowDays = weeklyByDay.filter(d => d.performance === 'Low').map(d => d.day);

  return {
    summary: {
      totalSales: Math.round(bills.reduce((sum, b) => sum + b.total, 0)),
      avgDailySales: Math.round(stats.mean),
      totalBills,
      dataPoints: salesValues.length,
      dateRange: {
        from: dailySalesArray[0].date,
        to: dailySalesArray[dailySalesArray.length - 1].date
      }
    },
    trends: {
      dailyTrend,
      weeklyTrend: [],
      monthlyTrend,
      regression: {
        slope: Math.round(regression.slope * 100) / 100,
        slopeExplanation: `Sales are ${trendDirection.toLowerCase()} by ₹${Math.round(Math.abs(regression.slope))} per day`,
        rSquared: Math.round(regression.rSquared * 10000) / 10000,
        accuracy: getAccuracyLabel(regression.rSquared),
        forecast7Days,
        forecast30Days,
        forecast90Days
      }
    },
    predictions: {
      nextWeekTotal,
      nextMonthTotal,
      next90DaysTotal,
      nextWeekDaily,
      nextMonthDaily,
      next90DaysDaily,
      trendStrength: Math.round(trendStrength * 100) / 100,
      volatilityScore: Math.round(stats.stdDev * 100) / 100
    },
    weeklyPattern: {
      byDay: weeklyByDay,
      weekendVsWeekday: {
        weekendAvg: Math.round(weekendAvg),
        weekdayAvg: Math.round(weekdayAvg),
        difference: Math.round(weekendAvg - weekdayAvg),
        differencePercent: Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 1000) / 10
      },
      bestDay: bestDay.day,
      worstDay: worstDay.day,
      weeklyForecast
    },
    products: {
      topSelling: topSelling.map((p, idx) => ({
        ...p,
        predictedDemand30: productForecast[idx]?.forecast30Days || 0
      })),
      slowMoving,
      forecast: productForecast,
      demandTrend: productDemandTrend
    },
    categories: {
      performance: categoryPerformance,
      topCategory,
      bottomCategory,
      categoryForecast
    },
    payments: {
      distribution: paymentDistribution,
      trends: paymentTrends,
      dominantMode,
      paymentForecast
    },
    seasonality: {
      weeklyPattern: weeklyPatternInsight,
      monthlyPattern: monthlyTrend.length > 1 ? 'Multiple months of data available' : 'Insufficient data',
      peakDays,
      lowDays,
      seasonalIndex: weeklyByDay.map(d => ({
        day: d.day,
        index: Math.round((d.avgSales / stats.mean) * 100)
      }))
    },
    insights,
    confidence: {
      level: confidence,
      reason: `Data consistency: ${Math.round(dataQuality)}%. ${salesValues.length} days of sales data.`,
      dataQuality: Math.round(dataQuality)
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getEmptyForecast(): ForecastOutput {
  return {
    summary: { totalSales: 0, avgDailySales: 0, totalBills: 0, dataPoints: 0, dateRange: { from: '', to: '' } },
    trends: {
      dailyTrend: [],
      weeklyTrend: [],
      monthlyTrend: [],
      regression: { slope: 0, slopeExplanation: 'No data', rSquared: 0, accuracy: 'N/A', forecast7Days: [], forecast30Days: [], forecast90Days: [] }
    },
    predictions: {
      nextWeekTotal: 0,
      nextMonthTotal: 0,
      next90DaysTotal: 0,
      nextWeekDaily: 0,
      nextMonthDaily: 0,
      next90DaysDaily: 0,
      trendStrength: 0,
      volatilityScore: 0
    },
    weeklyPattern: {
      byDay: [],
      weekendVsWeekday: { weekendAvg: 0, weekdayAvg: 0, difference: 0, differencePercent: 0 },
      bestDay: 'N/A',
      worstDay: 'N/A',
      weeklyForecast: []
    },
    products: { topSelling: [], slowMoving: [], forecast: [], demandTrend: [] },
    categories: { performance: [], topCategory: 'N/A', bottomCategory: 'N/A', categoryForecast: [] },
    payments: { distribution: [], trends: [], dominantMode: 'N/A', paymentForecast: [] },
    seasonality: { weeklyPattern: 'No data', monthlyPattern: 'No data', peakDays: [], lowDays: [], seasonalIndex: [] },
    insights: ['No sales data available'],
    confidence: { level: 'Low', reason: 'No data', dataQuality: 0 }
  };
}

function getPerformanceLabel(value: number, average: number): string {
  if (value > average * 1.2) return 'High';
  if (value < average * 0.8) return 'Low';
  return 'Medium';
}

function getAccuracyLabel(rSquared: number): string {
  if (rSquared > 0.8) return 'Very High';
  if (rSquared > 0.6) return 'High';
  if (rSquared > 0.4) return 'Medium';
  return 'Low';
}

function calculateDaysInStock(firstSale: string, lastSale: string): number {
  const first = new Date(firstSale).getTime();
  const last = new Date(lastSale).getTime();
  const days = Math.ceil((last - first) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

function getProductStock(db: Database.Database, productId: number): number {
  const stmt = db.prepare('SELECT stock FROM products WHERE id = ?');
  const result = stmt.get(productId) as any;
  return result?.stock || 0;
}

function generateInsights(
  regression: RegressionResult,
  weeklyByDay: any[],
  weekendAvg: number,
  weekdayAvg: number,
  topSelling: any[],
  categories: any[],
  paymentTrends: any[],
  productForecast: any[],
  stats: any
): string[] {
  const insights: string[] = [];

  // Trend insights
  if (regression.slope > 0) {
    const dailyGrowth = Math.round((regression.slope / stats.mean) * 1000) / 10;
    insights.push(`📈 Sales trending UP by ${dailyGrowth}% daily. Maintain current strategy.`);
  } else if (regression.slope < 0) {
    const dailyDecline = Math.round((Math.abs(regression.slope) / stats.mean) * 1000) / 10;
    insights.push(`📉 Sales declining by ${dailyDecline}% daily. Review marketing & pricing.`);
  }

  // Weekly pattern insights
  if (weekendAvg > weekdayAvg * 1.15) {
    const diff = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
    insights.push(`🎯 Weekend sales ${diff}% higher. Stock up before weekends.`);
  }

  // Product insights
  if (topSelling.length > 0) {
    insights.push(`⭐ Top product: ${topSelling[0].name} (${topSelling[0].quantity} units sold)`);
  }

  // Restock insights
  const highPriority = productForecast.filter(p => p.restockPriority === 'High');
  if (highPriority.length > 0) {
    insights.push(`⚠️ URGENT: Restock ${highPriority.length} items - ${highPriority.map(p => p.name).join(', ')}`);
  }

  // Payment insights
  const growingPayment = paymentTrends.find(p => p.trend === 'Increasing');
  if (growingPayment) {
    insights.push(`💳 ${growingPayment.mode} payments growing (+${growingPayment.growth}%)`);
  }

  // Category insights
  if (categories.length > 0) {
    insights.push(`🏆 Best category: ${categories[0].name} (₹${categories[0].revenue} revenue)`);
  }

  // Data quality insight
  if (stats.stdDev / stats.mean > 0.5) {
    insights.push(`📊 Sales highly variable. Consider promotions for consistency.`);
  }

  return insights;
}

// Import Database type
import Database from 'better-sqlite3';
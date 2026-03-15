import { getDatabase } from './connection';

export interface ForecastData {
  historicalDaily: Array<{ date: string; sales: number }>;
  forecast30Days: Array<{ date: string; predicted: number; lower: number; upper: number }>;
  forecast90Days: Array<{ date: string; predicted: number }>;
  categoryTrends: Array<{ category: string; trend: number; forecast: number }>;
  seasonalPattern: Array<{ month: string; avgSales: number }>;
  summary: {
    avgDailySales: number;
    trend: number;
    volatility: number;
    forecast30DaysTotal: number;
    forecast90DaysTotal: number;
  };
  insights: string[];
}

// Simple moving average
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

// Linear regression for trend
function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

// Calculate standard deviation
function stdDev(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

export function getForecast(): ForecastData {
  const db = getDatabase();

  // Get all historical daily sales
  const historicalStmt = db.prepare(`
    SELECT 
      date(createdAt) as date,
      COALESCE(SUM(total), 0) as sales
    FROM bills
    GROUP BY date(createdAt)
    ORDER BY date(createdAt) ASC
  `);
  const historicalRaw = historicalStmt.all() as any[];
  
  const historicalDaily = historicalRaw.map(d => ({
    date: d.date,
    sales: d.sales
  }));

  // Extract sales values for analysis
  const salesData = historicalDaily.map(d => d.sales);
  
  if (salesData.length === 0) {
    return {
      historicalDaily: [],
      forecast30Days: [],
      forecast90Days: [],
      categoryTrends: [],
      seasonalPattern: [],
      summary: {
        avgDailySales: 0,
        trend: 0,
        volatility: 0,
        forecast30DaysTotal: 0,
        forecast90DaysTotal: 0
      },
      insights: ['No historical data available for forecasting']
    };
  }

  // Calculate statistics
  const avgDailySales = salesData.reduce((a, b) => a + b, 0) / salesData.length;
  const volatility = (stdDev(salesData) / avgDailySales) * 100;

  // Linear regression for trend
  const { slope, intercept } = linearRegression(salesData);
  const trend = (slope / avgDailySales) * 100; // Trend as percentage

  // Generate 30-day forecast with confidence intervals
  const forecast30Days = [];
  const ma7 = movingAverage(salesData, 7);
  const lastMA = ma7[ma7.length - 1];
  const std = stdDev(salesData);
  
  for (let i = 1; i <= 30; i++) {
    const predicted = Math.max(0, lastMA + (slope * i));
    const lower = Math.max(0, predicted - (1.96 * std)); // 95% confidence
    const upper = predicted + (1.96 * std);
    
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + i);
    
    forecast30Days.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: Math.round(predicted),
      lower: Math.round(lower),
      upper: Math.round(upper)
    });
  }

  // Generate 90-day forecast (simpler, no confidence intervals)
  const forecast90Days = [];
  for (let i = 1; i <= 90; i++) {
    const predicted = Math.max(0, lastMA + (slope * i));
    
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + i);
    
    forecast90Days.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted: Math.round(predicted)
    });
  }

  // Category trends
  const categoryStmt = db.prepare(`
    SELECT 
      COALESCE(p.category, 'Unknown') as category,
      COALESCE(SUM(bi.totalPrice), 0) as total,
      COUNT(DISTINCT date(b.createdAt)) as days
    FROM bill_items bi
    JOIN bills b ON bi.billId = b.id
    LEFT JOIN products p ON bi.productId = p.id
    GROUP BY p.category
    ORDER BY total DESC
    LIMIT 10
  `);
  const categoryData = categoryStmt.all() as any[];
  
  const categoryTrends = categoryData.map(cat => {
    const avgDaily = cat.total / Math.max(cat.days, 1);
    const forecast = Math.max(0, avgDaily + (slope * 30)); // 30-day average
    return {
      category: cat.category,
      trend: Math.round(avgDaily),
      forecast: Math.round(forecast)
    };
  });

  // Seasonal pattern (by month)
  const seasonalStmt = db.prepare(`
    SELECT 
      strftime('%m', createdAt) as month,
      COALESCE(AVG(total), 0) as avgSales
    FROM bills
    GROUP BY strftime('%m', createdAt)
    ORDER BY month
  `);
  const seasonalRaw = seasonalStmt.all() as any[];
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const seasonalPattern = seasonalRaw.map(s => ({
    month: monthNames[parseInt(s.month) - 1],
    avgSales: Math.round(s.avgSales)
  }));

  // Calculate totals
  const forecast30DaysTotal = forecast30Days.reduce((sum, d) => sum + d.predicted, 0);
  const forecast90DaysTotal = forecast90Days.reduce((sum, d) => sum + d.predicted, 0);

  // Generate insights
  const insights: string[] = [];
  
  if (trend > 5) {
    insights.push(`📈 Strong upward trend detected (+${trend.toFixed(1)}%). Sales are expected to grow significantly.`);
  } else if (trend > 0) {
    insights.push(`📈 Slight upward trend (+${trend.toFixed(1)}%). Sales are gradually improving.`);
  } else if (trend < -5) {
    insights.push(`📉 Strong downward trend (${trend.toFixed(1)}%). Consider reviewing pricing or marketing strategies.`);
  } else if (trend < 0) {
    insights.push(`📉 Slight downward trend (${trend.toFixed(1)}%). Monitor sales closely.`);
  }

  if (volatility > 40) {
    insights.push(`⚠️ High volatility (${volatility.toFixed(1)}%). Sales are unpredictable. Consider stabilizing factors.`);
  } else if (volatility < 15) {
    insights.push(`✅ Low volatility (${volatility.toFixed(1)}%). Sales are stable and predictable.`);
  }

  const topCategory = categoryTrends[0];
  if (topCategory) {
    const categoryGrowth = ((topCategory.forecast - topCategory.trend) / topCategory.trend) * 100;
    if (categoryGrowth > 10) {
      insights.push(`🎯 ${topCategory.category} category showing strong growth potential (+${categoryGrowth.toFixed(1)}%).`);
    }
  }

  const forecast30Avg = forecast30DaysTotal / 30;
  const growth30 = ((forecast30Avg - avgDailySales) / avgDailySales) * 100;
  if (growth30 > 0) {
    insights.push(`💰 30-day forecast shows +${growth30.toFixed(1)}% growth compared to historical average.`);
  }

  if (historicalDaily.length < 30) {
    insights.push(`ℹ️ Limited historical data (${historicalDaily.length} days). Forecast accuracy will improve with more data.`);
  }

  return {
    historicalDaily,
    forecast30Days,
    forecast90Days,
    categoryTrends,
    seasonalPattern,
    summary: {
      avgDailySales: Math.round(avgDailySales),
      trend: Math.round(trend * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      forecast30DaysTotal,
      forecast90DaysTotal
    },
    insights
  };
}

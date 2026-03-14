import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Package,
  Calendar,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  dailyStats: Array<{ date: string; sales: number; profit: number; cost: number; bills: number }>;
  categoryBreakdown: Array<{ category: string; value: number; profit: number }>;
  paymentModeStats: Array<{ mode: string; value: number; percentage: number }>;
  hourlyStats: Array<{ hour: string; sales: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number; profit: number }>;
  summary: {
    totalRevenue: number;
    totalProfit: number;
    totalCost: number;
    totalBills: number;
    avgBillValue: number;
    profitMargin: number;
  };
  salesGrowth: {
    currentRevenue: number;
    previousRevenue: number;
    growthPercentage: number;
    currentPeriodData: Array<{ date: string; sales: number }>;
    previousPeriodData: Array<{ date: string; sales: number }>;
  };
  customerRetention: {
    repeatCustomers: number;
    newCustomers: number;
    repeatPercentage: number;
  };
  profitableProducts: Array<{ name: string; revenue: number; cost: number; profit: number; profitMargin: number }>;
  lowPerformingProducts: Array<{ name: string; quantitySold: number; revenue: number; daysSinceLastSale: number }>;
  peakSalesDay: Array<{ weekday: string; revenue: number; bills: number }>;
  productBundles: Array<{ productA: string; productB: string; timesBoughtTogether: number }>;
  inventoryRisk: Array<{ product: string; stock: number; avgDailySales: number; daysLeft: number }>;
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

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('week');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productSort, setProductSort] = useState<SortConfig>({ key: '', direction: null });
  const [dailySort, setDailySort] = useState<SortConfig>({ key: '', direction: null });

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const today = new Date();
      let from = new Date();
      
      switch (dateRange) {
        case 'today':
          from = today;
          break;
        case 'week':
          from.setDate(today.getDate() - 7);
          break;
        case 'month':
          from.setMonth(today.getMonth() - 1);
          break;
        case 'year':
          from.setFullYear(today.getFullYear() - 1);
          break;
      }

      const fromStr = dateFrom || from.toISOString().split('T')[0];
      const toStr = dateTo || today.toISOString().split('T')[0];

      console.log('Loading analytics for:', fromStr, 'to', toStr);
      const analyticsData = await (window.electronAPI as any).getAnalytics(fromStr, toStr);
      console.log('Analytics data received:', analyticsData);
      setData(analyticsData as AnalyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, dateFrom, dateTo]);

  const handleSort = (key: string, type: 'product' | 'daily') => {
    const sortConfig = type === 'product' ? productSort : dailySort;
    const setSortConfig = type === 'product' ? setProductSort : setDailySort;
    
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = <T extends Record<string, any>>(data: T[], sortConfig: SortConfig): T[] => {
    if (!sortConfig.direction) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" style={{ color: '#22c55e', margin: '0 auto 16px' }} size={32} />
          <p style={{ color: '#6b7280' }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;

  return (
    <div style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 style={{ color: '#22c55e' }} size={28} />
            Analytics & Insights
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Comprehensive business analytics and performance metrics
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#22c55e',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Date Range Selector */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: '#6b7280' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Period:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['today', 'week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRange(range);
                  setDateFrom('');
                  setDateTo('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: dateRange === range && !dateFrom ? '#22c55e' : '#f3f4f6',
                  color: dateRange === range && !dateFrom ? 'white' : '#374151',
                  transition: 'all 0.2s'
                }}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setDateRange('custom');
              }}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
            <span style={{ color: '#6b7280' }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setDateRange('custom');
              }}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <DollarSign size={24} />
            <TrendingUp size={20} style={{ opacity: 0.75 }} />
          </div>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Total Revenue</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>₹{summary.totalRevenue.toLocaleString()}</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <TrendingUp size={24} />
            <Activity size={20} style={{ opacity: 0.75 }} />
          </div>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Total Profit</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>₹{summary.totalProfit.toLocaleString()}</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <TrendingDown size={24} />
            <Package size={20} style={{ opacity: 0.75 }} />
          </div>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Total Cost</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>₹{summary.totalCost.toLocaleString()}</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <ShoppingBag size={24} />
            <BarChart3 size={20} style={{ opacity: 0.75 }} />
          </div>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Total Bills</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>{summary.totalBills}</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <DollarSign size={24} />
            <TrendingUp size={20} style={{ opacity: 0.75 }} />
          </div>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Avg Bill Value</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>₹{summary.avgBillValue.toLocaleString()}</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Activity size={24} />
            <TrendingUp size={20} style={{ opacity: 0.75 }} />
          </div>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Profit Margin</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>{summary.profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Sales & Profit Trend */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity style={{ color: '#22c55e' }} size={20} />
            Sales & Profit Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.dailyStats}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="sales" stroke="#22c55e" fillOpacity={1} fill="url(#colorSales)" name="Sales (₹)" />
              <Area type="monotone" dataKey="profit" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProfit)" name="Profit (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Mode Distribution */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChartIcon style={{ color: '#3b82f6' }} size={20} />
            Payment Mode Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.paymentModeStats}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry: any) => `${entry.mode}: ${entry.percentage.toFixed(1)}%`}
                outerRadius={100}
                dataKey="value"
              >
                {data.paymentModeStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: any) => `₹${Number(val).toLocaleString()}`} />
              <Legend formatter={(_: any, entry: any) => `${entry.payload.mode} (₹${entry.payload.value.toLocaleString()})`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Category Performance */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 style={{ color: '#8b5cf6' }} size={20} />
            Category Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.categoryBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="value" fill="#8b5cf6" name="Revenue (₹)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" fill="#22c55e" name="Profit (₹)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Sales Pattern */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity style={{ color: '#f59e0b' }} size={20} />
            Hourly Sales Pattern
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.hourlyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} name="Sales (₹)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package style={{ color: '#22c55e' }} size={20} />
          Top Performing Products
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th onClick={() => handleSort('name', 'product')} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Product {productSort.key === 'name' && (productSort.direction === 'asc' ? '↑' : productSort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('quantity', 'product')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Quantity {productSort.key === 'quantity' && (productSort.direction === 'asc' ? '↑' : productSort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('revenue', 'product')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Revenue {productSort.key === 'revenue' && (productSort.direction === 'asc' ? '↑' : productSort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('profit', 'product')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Profit {productSort.key === 'profit' && (productSort.direction === 'asc' ? '↑' : productSort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('margin', 'product')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Margin {productSort.key === 'margin' && (productSort.direction === 'asc' ? '↑' : productSort.direction === 'desc' ? '↓' : '')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedData(
                data.topProducts.map(p => ({ ...p, margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 })), 
                productSort
              ).map((product, index) => {
                const margin = product.margin;
                return (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>{product.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{product.quantity}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right', fontWeight: '500' }}>
                      ₹{product.revenue.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                      <span style={{ color: product.profit >= 0 ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
                        ₹{product.profit.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: margin >= 30 ? '#dcfce7' : margin >= 15 ? '#fef3c7' : '#fee2e2',
                        color: margin >= 30 ? '#166534' : margin >= 15 ? '#92400e' : '#991b1b'
                      }}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Performance Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar style={{ color: '#3b82f6' }} size={20} />
          Daily Performance
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th onClick={() => handleSort('date', 'daily')} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Date {dailySort.key === 'date' && (dailySort.direction === 'asc' ? '↑' : dailySort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('bills', 'daily')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Bills {dailySort.key === 'bills' && (dailySort.direction === 'asc' ? '↑' : dailySort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('sales', 'daily')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Sales {dailySort.key === 'sales' && (dailySort.direction === 'asc' ? '↑' : dailySort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('cost', 'daily')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Cost {dailySort.key === 'cost' && (dailySort.direction === 'asc' ? '↑' : dailySort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('profit', 'daily')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Profit {dailySort.key === 'profit' && (dailySort.direction === 'asc' ? '↑' : dailySort.direction === 'desc' ? '↓' : '')}
                </th>
                <th onClick={() => handleSort('margin', 'daily')} style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Margin {dailySort.key === 'margin' && (dailySort.direction === 'asc' ? '↑' : dailySort.direction === 'desc' ? '↓' : '')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedData(
                data.dailyStats.map(d => ({ ...d, margin: d.sales > 0 ? (d.profit / d.sales) * 100 : 0 })),
                dailySort
              ).map((day, index) => {
                const margin = day.margin;
                return (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>{day.date}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{day.bills}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right', fontWeight: '500' }}>
                      ₹{day.sales.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#f59e0b', textAlign: 'right' }}>
                      ₹{day.cost.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                      <span style={{ color: day.profit >= 0 ? '#22c55e' : '#ef4444', fontWeight: '500' }}>
                        ₹{day.profit.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: margin >= 30 ? '#dcfce7' : margin >= 15 ? '#fef3c7' : '#fee2e2',
                        color: margin >= 30 ? '#166534' : margin >= 15 ? '#92400e' : '#991b1b'
                      }}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW ANALYTICS FEATURES */}
      
      {/* 1. Sales Growth Trend */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp style={{ color: '#22c55e' }} size={20} />
            Sales Growth Comparison
          </h3>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: data.salesGrowth.growthPercentage >= 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {data.salesGrowth.growthPercentage >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {data.salesGrowth.growthPercentage.toFixed(1)}%
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>vs Previous Period</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.salesGrowth.currentPeriodData.map((curr, idx) => ({
            date: curr.date,
            current: curr.sales,
            previous: data.salesGrowth.previousPeriodData[idx]?.sales || 0
          }))}>
            <defs>
              <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b7280" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Legend />
            <Area type="monotone" dataKey="current" stroke="#22c55e" fillOpacity={1} fill="url(#colorCurrent)" name="Current Period (₹)" />
            <Area type="monotone" dataKey="previous" stroke="#6b7280" fillOpacity={1} fill="url(#colorPrevious)" name="Previous Period (₹)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row with 2 charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Customer Retention */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity style={{ color: '#ec4899' }} size={20} />
            Customer Retention Rate
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Repeat Customers', value: data.customerRetention.repeatCustomers },
                  { name: 'New Customers', value: data.customerRetention.newCustomers }
                ]}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry: any) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                dataKey="value"
              >
                <Cell fill="#22c55e" />
                <Cell fill="#3b82f6" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
            Repeat Rate: <span style={{ fontWeight: '600', color: '#22c55e' }}>{data.customerRetention.repeatPercentage.toFixed(1)}%</span>
          </p>
        </div>
          </p>
        </div>

        {/* 10. Sales Target Progress */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 style={{ color: '#14b8a6' }} size={20} />
            Monthly Sales Target
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Target: ₹{data.salesTarget.target.toLocaleString()}</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>₹{data.salesTarget.achieved.toLocaleString()}</span>
            </div>
            <div style={{ width: '100%', height: '24px', backgroundColor: '#f3f4f6', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${Math.min(data.salesTarget.percentage, 100)}%`, 
                height: '100%', 
                backgroundColor: data.salesTarget.percentage >= 100 ? '#22c55e' : data.salesTarget.percentage >= 75 ? '#3b82f6' : '#f59e0b',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ textAlign: 'center', fontSize: '24px', fontWeight: '700', color: '#111827', marginTop: '16px' }}>
              {data.salesTarget.percentage.toFixed(1)}%
            </p>
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
              {data.salesTarget.percentage >= 100 ? 'Target Achieved! 🎉' : `₹${(data.salesTarget.target - data.salesTarget.achieved).toLocaleString()} remaining`}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Peak Sales Day */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar style={{ color: '#f59e0b' }} size={20} />
          Best Performing Day of Week
        </h3>
        {data.peakSalesDay.length > 0 && (
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            Highest sales on: <span style={{ fontWeight: '600', color: '#f59e0b' }}>{data.peakSalesDay[0].weekday}</span>
          </p>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.peakSalesDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="weekday" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="revenue" fill="#f59e0b" name="Revenue (₹)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="bills" fill="#3b82f6" name="Bills" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Product Profitability & 9. Discount Effectiveness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* 4. Product Profitability */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign style={{ color: '#22c55e' }} size={20} />
            Most Profitable Products
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.profitableProducts.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="profit" fill="#22c55e" name="Profit (₹)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 9. Discount Effectiveness */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown style={{ color: '#ef4444' }} size={20} />
            Discount Impact on Sales
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { type: 'With Discount', revenue: data.discountEffectiveness.revenueWithDiscount, avgBill: data.discountEffectiveness.avgBillWithDiscount },
              { type: 'Without Discount', revenue: data.discountEffectiveness.revenueWithoutDiscount, avgBill: data.discountEffectiveness.avgBillWithoutDiscount }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="type" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Total Revenue (₹)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="avgBill" fill="#f59e0b" name="Avg Bill Value (₹)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* 5. Low Performing Products */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown style={{ color: '#ef4444' }} size={20} />
            Low Performing Products
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Product</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Qty Sold</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Revenue</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Days Since Sale</th>
                </tr>
              </thead>
              <tbody>
                {data.lowPerformingProducts.map((product, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>{product.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{product.quantitySold}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right' }}>₹{product.revenue.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                      <span style={{ 
                        color: product.daysSinceLastSale > 30 ? '#ef4444' : product.daysSinceLastSale > 14 ? '#f59e0b' : '#6b7280',
                        fontWeight: '500'
                      }}>
                        {product.daysSinceLastSale > 900 ? 'Never' : `${Math.floor(product.daysSinceLastSale)} days`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. Inventory Risk */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package style={{ color: '#ef4444' }} size={20} />
            Inventory Risk Alert
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Product</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Stock</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Avg Daily Sales</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {data.inventoryRisk.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>{item.product}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{item.stock}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{item.avgDailySales.toFixed(1)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: item.daysLeft < 7 ? '#fee2e2' : item.daysLeft < 14 ? '#fef3c7' : '#dcfce7',
                        color: item.daysLeft < 7 ? '#991b1b' : item.daysLeft < 14 ? '#92400e' : '#166534'
                      }}>
                        {item.daysLeft} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 7. Product Bundle Opportunities */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag style={{ color: '#8b5cf6' }} size={20} />
          Product Bundle Opportunities
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Products frequently bought together - create combo offers
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Product A</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Product B</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Times Bought Together</th>
              </tr>
            </thead>
            <tbody>
              {data.productBundles.map((bundle, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>{bundle.productA}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827' }}>{bundle.productB}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#8b5cf6', textAlign: 'right', fontWeight: '600' }}>{bundle.timesBoughtTogether}</td>
                </tr>
              ))}
              {data.productBundles.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                    No bundle opportunities found in this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

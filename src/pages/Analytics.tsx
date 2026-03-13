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

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
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

      const analyticsData = await window.electronAPI.getAnalytics(fromStr, toStr);
      setData(analyticsData as AnalyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-green-600 mx-auto mb-4" size={32} />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-green-600" size={28} />
            Analytics & Insights
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive business analytics and performance metrics
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Period:</span>
          </div>
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRange(range);
                  setDateFrom('');
                  setDateTo('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range && !dateFrom
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={24} />
            <TrendingUp size={20} className="opacity-75" />
          </div>
          <p className="text-sm opacity-90">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">₹{summary.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={24} />
            <Activity size={20} className="opacity-75" />
          </div>
          <p className="text-sm opacity-90">Total Profit</p>
          <p className="text-2xl font-bold mt-1">₹{summary.totalProfit.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown size={24} />
            <Package size={20} className="opacity-75" />
          </div>
          <p className="text-sm opacity-90">Total Cost</p>
          <p className="text-2xl font-bold mt-1">₹{summary.totalCost.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag size={24} />
            <BarChart3 size={20} className="opacity-75" />
          </div>
          <p className="text-sm opacity-90">Total Bills</p>
          <p className="text-2xl font-bold mt-1">{summary.totalBills}</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={24} />
            <TrendingUp size={20} className="opacity-75" />
          </div>
          <p className="text-sm opacity-90">Avg Bill Value</p>
          <p className="text-2xl font-bold mt-1">₹{summary.avgBillValue.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Activity size={24} />
            <TrendingUp size={20} className="opacity-75" />
          </div>
          <p className="text-sm opacity-90">Profit Margin</p>
          <p className="text-2xl font-bold mt-1">{summary.profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales & Profit Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="text-green-600" size={20} />
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
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorSales)"
                name="Sales"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorProfit)"
                name="Profit"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Mode Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="text-blue-600" size={20} />
            Payment Mode Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.paymentModeStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.paymentModeStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-purple-600" size={20} />
            Category Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.categoryBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="value" fill="#8b5cf6" name="Revenue" radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" fill="#22c55e" name="Profit" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Sales Pattern */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="text-orange-600" size={20} />
            Hourly Sales Pattern
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.hourlyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 4 }}
                name="Sales"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="text-green-600" size={20} />
          Top Performing Products
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Quantity Sold</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Profit</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((product, index) => {
                const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                return (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{product.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">{product.quantity}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      ₹{product.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={product.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        ₹{product.profit.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        margin >= 30 ? 'bg-green-100 text-green-700' :
                        margin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
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

      {/* Daily Stats Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="text-blue-600" size={20} />
          Daily Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Bills</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Sales</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Cost</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Profit</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyStats.map((day, index) => {
                const margin = day.sales > 0 ? (day.profit / day.sales) * 100 : 0;
                return (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{day.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">{day.bills}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      ₹{day.sales.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-orange-600 text-right">
                      ₹{day.cost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={day.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        ₹{day.profit.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        margin >= 30 ? 'bg-green-100 text-green-700' :
                        margin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
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
    </div>
  );
}

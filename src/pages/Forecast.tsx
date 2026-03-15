import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  BarChart3,
  Activity,
  AlertCircle,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

interface ForecastData {
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

const ACCENT = '#22c55e';

export function Forecast() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'30' | '90'>('30');

  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const forecast = await (window.electronAPI as any).getForecast();
      setData(forecast as ForecastData);
    } catch (error) {
      console.error('Error loading forecast:', error);
      toast.error('Failed to load forecast data');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" style={{ color: ACCENT, margin: '0 auto 16px' }} size={32} />
          <p style={{ color: '#6b7280' }}>Analyzing historical data and generating forecast...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const forecastData = period === '30' ? data.forecast30Days : data.forecast90Days;
  const forecastTotal = period === '30' ? data.summary.forecast30DaysTotal : data.summary.forecast90DaysTotal;

  return (
    <div style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp style={{ color: ACCENT }} size={28} />
            Sales Forecast
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            AI-powered predictions based on historical data
          </p>
        </div>
        <button
          onClick={loadForecast}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: ACCENT,
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Avg Daily Sales</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>₹{data.summary.avgDailySales.toLocaleString()}</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Sales Trend</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {data.summary.trend >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <p style={{ fontSize: '24px', fontWeight: '700' }}>{data.summary.trend > 0 ? '+' : ''}{data.summary.trend.toFixed(1)}%</p>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Volatility</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>{data.summary.volatility.toFixed(1)}%</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>{period}-Day Forecast</p>
          <p style={{ fontSize: '24px', fontWeight: '700' }}>₹{forecastTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Period Selector */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Forecast Period:</span>
        {(['30', '90'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: period === p ? ACCENT : '#f3f4f6',
              color: period === p ? 'white' : '#374151',
              transition: 'all 0.2s'
            }}
          >
            {p} Days
          </button>
        ))}
      </div>

      {/* Main Forecast Chart */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity style={{ color: ACCENT }} size={20} />
          {period}-Day Sales Forecast
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
            />
            <Legend />
            <Area type="monotone" dataKey="predicted" stroke={ACCENT} fillOpacity={1} fill="url(#colorPredicted)" name="Predicted Sales" />
            {period === '30' && (
              <>
                <Area type="monotone" dataKey="upper" stroke="#d1d5db" strokeDasharray="5 5" fill="none" name="Upper Bound" />
                <Area type="monotone" dataKey="lower" stroke="#d1d5db" strokeDasharray="5 5" fill="none" name="Lower Bound" />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Historical vs Forecast Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Historical Data */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar style={{ color: '#3b82f6' }} size={20} />
            Historical Data (Last 90 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.historicalDaily.slice(-90)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={false} name="Daily Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Seasonal Pattern */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 style={{ color: '#f59e0b' }} size={20} />
            Seasonal Pattern
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.seasonalPattern}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="avgSales" fill="#f59e0b" name="Avg Monthly Sales" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Trends */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target style={{ color: '#8b5cf6' }} size={20} />
          Category Trends & Forecasts
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Current Trend</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Forecast</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {data.categoryTrends.map((cat, idx) => {
                const change = cat.forecast - cat.trend;
                const changePct = cat.trend !== 0 ? (change / cat.trend) * 100 : 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{cat.category}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>₹{cat.trend.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', textAlign: 'right', fontWeight: '600' }}>₹{cat.forecast.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: change >= 0 ? '#dcfce7' : '#fee2e2',
                        color: change >= 0 ? '#166534' : '#991b1b'
                      }}>
                        {change >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle style={{ color: '#f59e0b' }} size={20} />
            Key Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.insights.map((insight, idx) => (
              <div key={idx} style={{ padding: '12px 16px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', gap: '12px' }}>
                <div style={{ width: '4px', backgroundColor: '#f59e0b', borderRadius: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
  Package,
  DollarSign,
  Zap,
  LineChart as LineChartIcon,
  TrendingUpIcon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

const ACCENT = '#22c55e';
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function Forecast() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'predictions' | 'trends' | 'products' | 'categories' | 'payments'>('predictions');

  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching forecast...');
      const forecast = await (window.electronAPI as any).getForecast();
      console.log('Forecast received:', forecast);
      
      if (!forecast) {
        setError('No forecast data received');
        setData(null);
      } else {
        setData(forecast);
      }
    } catch (error: any) {
      console.error('Error loading forecast:', error);
      setError(error?.message || 'Failed to load forecast data');
      setData(null);
      toast.error('Failed to load forecast data: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" style={{ color: ACCENT, margin: '0 auto 16px' }} size={32} />
          <p style={{ color: '#6b7280' }}>Analyzing your store data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <AlertCircle style={{ color: '#ef4444', margin: '0 auto 16px' }} size={48} />
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Error Loading Forecast</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>{error}</p>
          <button
            onClick={loadForecast}
            style={{
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
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <AlertCircle style={{ color: '#f59e0b', margin: '0 auto 16px' }} size={48} />
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Data Available</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
            No forecast data available. Please ensure you have sales data in your system.
          </p>
          <button
            onClick={loadForecast}
            style={{
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
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap style={{ color: ACCENT }} size={28} />
            Sales Predictions & Forecasts
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Real predictions for next 7, 30 & 90 days • {data.confidence.level} confidence
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

      {/* KEY PREDICTIONS */}
      {data?.predictions && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <PredictionCard
            label="Next 7 Days"
            value={`₹${(data.predictions.nextWeekTotal || 0).toLocaleString()}`}
            subtext={`₹${data.predictions.nextWeekDaily || 0}/day`}
            icon={<Calendar size={20} />}
            color="#3b82f6"
          />
          <PredictionCard
            label="Next 30 Days"
            value={`₹${(data.predictions.nextMonthTotal || 0).toLocaleString()}`}
            subtext={`₹${data.predictions.nextMonthDaily || 0}/day`}
            icon={<BarChart3 size={20} />}
            color="#f59e0b"
          />
          <PredictionCard
            label="Next 90 Days"
            value={`₹${(data.predictions.next90DaysTotal || 0).toLocaleString()}`}
            subtext={`₹${data.predictions.next90DaysDaily || 0}/day`}
            icon={<LineChartIcon size={20} />}
            color="#8b5cf6"
          />
          <PredictionCard
            label="Trend Strength"
            value={`${(data.predictions.trendStrength || 0) > 0 ? '+' : ''}${((data.predictions.trendStrength || 0).toFixed(1))}`}
            subtext={`₹/day`}
            icon={(data.predictions.trendStrength || 0) > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            color={(data.predictions.trendStrength || 0) > 0 ? '#22c55e' : '#ef4444'}
          />
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
        {(['predictions', 'trends', 'products', 'categories', 'payments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              borderBottom: activeTab === tab ? `3px solid ${ACCENT}` : 'none',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? '600' : '500',
              color: activeTab === tab ? ACCENT : '#6b7280',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* PREDICTIONS TAB */}
      {activeTab === 'predictions' && data?.trends?.regression && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 7-Day Forecast */}
          {data.trends.regression.forecast7Days && data.trends.regression.forecast7Days.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>7-Day Sales Forecast</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.trends.regression.forecast7Days}>
                  <defs>
                    <linearGradient id="colorForecast7" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                  />
                  <Area type="monotone" dataKey="predicted" stroke="#3b82f6" fillOpacity={1} fill="url(#colorForecast7)" name="Predicted" />
                  <Area type="monotone" dataKey="upper" stroke="#d1d5db" strokeDasharray="5 5" fill="none" name="Upper Bound" />
                  <Area type="monotone" dataKey="lower" stroke="#d1d5db" strokeDasharray="5 5" fill="none" name="Lower Bound" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 30-Day Forecast */}
          {data.trends.regression.forecast30Days && data.trends.regression.forecast30Days.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>30-Day Sales Forecast</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.trends.regression.forecast30Days}>
                  <defs>
                    <linearGradient id="colorForecast30" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                  />
                  <Area type="monotone" dataKey="predicted" stroke={ACCENT} fillOpacity={1} fill="url(#colorForecast30)" name="Predicted" />
                  <Area type="monotone" dataKey="upper" stroke="#d1d5db" strokeDasharray="5 5" fill="none" name="Upper Bound" />
                  <Area type="monotone" dataKey="lower" stroke="#d1d5db" strokeDasharray="5 5" fill="none" name="Lower Bound" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 90-Day Forecast */}
          {data.trends.regression.forecast90Days && data.trends.regression.forecast90Days.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>90-Day Sales Forecast</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trends.regression.forecast90Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                  />
                  <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Predicted" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && data?.trends && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Daily Trend */}
          {data.trends.dailyTrend && data.trends.dailyTrend.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Daily Sales Trend (Last 60 Days)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.trends.dailyTrend.slice(-60)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={false} name="Daily Sales" />
                  <Line type="monotone" dataKey="ma7" stroke={ACCENT} strokeWidth={2} dot={false} name="7-Day Avg" />
                  <Line type="monotone" dataKey="ma30" stroke="#f59e0b" strokeWidth={2} dot={false} name="30-Day Avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Weekly Forecast */}
          {data.weeklyPattern?.weeklyForecast && data.weeklyPattern.weeklyForecast.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Next Week Forecast by Day</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.weeklyPattern.weeklyForecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                  />
                  <Bar dataKey="predicted" fill={ACCENT} radius={[8, 8, 0, 0]} name="Predicted Sales" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly Trend */}
          {data.trends.monthlyTrend.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Monthly Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.trends.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                  />
                  <Legend />
                  <Bar dataKey="sales" fill={ACCENT} radius={[8, 8, 0, 0]} name="Monthly Sales" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && data?.products && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Product Demand Forecast */}
          {data.products.forecast && data.products.forecast.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package style={{ color: '#8b5cf6' }} size={20} />
                Product Demand Forecast (30 Days)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Product</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Current</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>30-Day</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>90-Day</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.forecast.slice(0, 10).map((prod: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>{prod.name}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#374151', textAlign: 'right' }}>{prod.currentDemand}/day</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827', textAlign: 'right', fontWeight: '600' }}>{prod.forecast30Days}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827', textAlign: 'right', fontWeight: '600' }}>{prod.forecast90Days}</td>
                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor:
                                prod.restockPriority === 'High'
                                  ? '#fee2e2'
                                  : prod.restockPriority === 'Medium'
                                  ? '#fef3c7'
                                  : '#dcfce7',
                              color:
                                prod.restockPriority === 'High'
                                  ? '#991b1b'
                                  : prod.restockPriority === 'Medium'
                                  ? '#92400e'
                                  : '#166534'
                            }}
                          >
                            {prod.restockPriority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Product Demand Trends */}
          {data.products.demandTrend && data.products.demandTrend.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Product Demand Trends</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.products.demandTrend.slice(0, 8).map((prod: any, idx: number) => (
                  <div key={idx} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{prod.name}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>{prod.trend}</p>
                    </div>
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: prod.growthRate > 0 ? '#dcfce7' : prod.growthRate < 0 ? '#fee2e2' : '#fef3c7',
                        color: prod.growthRate > 0 ? '#166534' : prod.growthRate < 0 ? '#991b1b' : '#92400e'
                      }}
                    >
                      {prod.growthRate > 0 ? '+' : ''}{prod.growthRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && data?.categories && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Category Forecast */}
          {data.categories.categoryForecast && data.categories.categoryForecast.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Category Revenue Forecast</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Category</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Current</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>30-Day</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>90-Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.categoryForecast.map((cat: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>{cat.name}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#374151', textAlign: 'right' }}>₹{(cat.current || 0).toLocaleString()}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827', textAlign: 'right', fontWeight: '600' }}>₹{(cat.forecast30 || 0).toLocaleString()}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827', textAlign: 'right', fontWeight: '600' }}>₹{(cat.forecast90 || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && data?.payments && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Payment Forecast */}
          {data.payments.paymentForecast && data.payments.paymentForecast.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Payment Method Forecast</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Method</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>7-Day</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>30-Day</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.paymentForecast.map((payment: any, idx: number) => {
                      const trend = data.payments.trends?.find((t: any) => t.mode === payment.mode);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>{payment.mode}</td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#374151', textAlign: 'right' }}>₹{(payment.predicted7Days || 0).toLocaleString()}</td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#111827', textAlign: 'right', fontWeight: '600' }}>₹{(payment.predicted30Days || 0).toLocaleString()}</td>
                          <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>
                            <span
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                backgroundColor: trend?.trend === 'Increasing' ? '#dcfce7' : trend?.trend === 'Decreasing' ? '#fee2e2' : '#fef3c7',
                                color: trend?.trend === 'Increasing' ? '#166534' : trend?.trend === 'Decreasing' ? '#991b1b' : '#92400e'
                              }}
                            >
                              {trend?.trend || 'Stable'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PredictionCard({ label, value, subtext, icon, color }: any) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, borderRadius: '12px', padding: '20px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        {icon}
        <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{value}</p>
      <p style={{ fontSize: '11px', opacity: 0.8, margin: '8px 0 0 0' }}>{subtext}</p>
    </div>
  );
}

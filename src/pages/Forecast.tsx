import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle } from 'lucide-react';

// Simple data structure from backend
interface ForecastData {
  dailyRevenue: { date: string; revenue: number; bills: number }[];
  products: { name: string; category: string; size: string; stock: number; price: number; quantity: number; date: string }[];
  payments: { date: string; mode: string; total: number }[];
  discounts: { discountPercent: number; total: number }[];
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtS = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${Math.round(n)}`;

function TrendBadge({ trend, pct }: { trend: 'up'|'down'|'stable'; pct?: number }) {
  if (trend === 'up') return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, background:'#dcfce7', color:'#16a34a', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
      <TrendingUp size={11} /> {pct ? `+${Math.abs(pct)}%` : 'Up'}
    </span>
  );
  if (trend === 'down') return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, background:'#fee2e2', color:'#dc2626', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
      <TrendingDown size={11} /> {pct ? `-${Math.abs(pct)}%` : 'Down'}
    </span>
  );
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, background:'#f3f4f6', color:'#6b7280', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
      <Minus size={11} /> Stable
    </span>
  );
}

// Helper functions for calculations
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function wma(values: number[], window = 14): number {
  const s = values.slice(-window);
  if (!s.length) return 0;
  let ws = 0, tot = 0;
  s.forEach((v, i) => { const w = i + 1; tot += v * w; ws += w; });
  return tot / ws;
}

function linReg(values: number[]): { slope: number } {
  const n = values.length;
  if (n < 2) return { slope: 0 };
  const xm = (n - 1) / 2;
  const ym = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  values.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2; });
  return { slope: den ? num / den : 0 };
}

function fillGaps(data: { date: string; revenue: number; bills: number }[], startDate: string, endDate: string) {
  const map = new Map(data.map(d => [d.date, d]));
  const filled = [];
  let cur = startDate;
  while (cur <= endDate) {
    filled.push(map.get(cur) || { date: cur, revenue: 0, bills: 0 });
    cur = addDays(cur, 1);
  }
  return filled;
}

export function Forecast() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await window.electronAPI.getForecast();
      setData(result);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#6b7280', fontSize:14 }}>
      Loading forecast data...
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:8 }}>
      <AlertTriangle size={32} color="#ef4444" />
      <p style={{ color:'#ef4444', fontSize:14 }}>{error}</p>
      <button onClick={load} style={{ padding:'6px 16px', background:'#22c55e', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:13 }}>Retry</button>
    </div>
  );

  if (!data) return null;

  // Process data in frontend
  const today = todayLocal();
  const d60 = addDays(today, -60);
  
  // Fill gaps in daily revenue
  const dailyFilled = fillGaps(data.dailyRevenue, d60, today);
  const revenues = dailyFilled.map(d => d.revenue);
  const dataPoints = revenues.filter(v => v > 0).length;
  
  // Calculate averages
  const avgDaily = revenues.reduce((a,b) => a+b, 0) / (revenues.length || 1);
  
  // Trend calculation
  const last30 = revenues.slice(-30);
  const { slope } = linReg(last30);
  const trendPct = avgDaily > 0 ? (slope / avgDaily) * 100 : 0;
  const trend: 'up'|'down'|'stable' = trendPct > 2 ? 'up' : trendPct < -2 ? 'down' : 'stable';
  
  // Simple forecast - next 7 days
  const revWma = wma(revenues, 21);
  const next7 = Array.from({length: 7}, (_, i) => Math.max(0, Math.round(revWma + slope * (i+1)))).reduce((a,b) => a+b, 0);
  const next30 = Array.from({length: 30}, (_, i) => Math.max(0, Math.round(revWma + slope * (i+1)))).reduce((a,b) => a+b, 0);
  
  const confidenceScore = Math.min(100, Math.round((dataPoints / 60) * 100));

  // Product analysis
  const productMap = new Map<string, { total: number; stock: number; price: number; category: string; size: string }>();
  data.products.forEach(p => {
    const key = p.name;
    if (!productMap.has(key)) {
      productMap.set(key, { total: 0, stock: p.stock, price: p.price, category: p.category, size: p.size });
    }
    productMap.get(key)!.total += p.quantity;
  });
  
  const topProducts = Array.from(productMap.entries())
    .map(([name, info]) => ({ name, ...info, avgDaily: info.total / 60, daysLeft: info.total > 0 ? Math.floor(info.stock / (info.total / 60)) : 999 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Payment mode analysis
  const paymentTotals = { cash: 0, upi: 0, mixed: 0, total: 0 };
  data.payments.forEach(p => {
    paymentTotals[p.mode as keyof typeof paymentTotals] += p.total;
    paymentTotals.total += p.total;
  });
  
  const paymentPct = {
    cash: Math.round((paymentTotals.cash / paymentTotals.total) * 100) || 0,
    upi: Math.round((paymentTotals.upi / paymentTotals.total) * 100) || 0,
    mixed: Math.round((paymentTotals.mixed / paymentTotals.total) * 100) || 0,
  };

  // Discount analysis
  const noDiscount = data.discounts.filter(d => d.discountPercent === 0);
  const withDiscount = data.discounts.filter(d => d.discountPercent > 0);
  const avgNoDiscount = noDiscount.length ? noDiscount.reduce((s, d) => s + d.total, 0) / noDiscount.length : 0;
  const avgWithDiscount = withDiscount.length ? withDiscount.reduce((s, d) => s + d.total, 0) / withDiscount.length : 0;

  const card = (style?: React.CSSProperties) => ({
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', ...style,
  });

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#111827', margin:0 }}>Forecast Dashboard</h2>
          <p style={{ fontSize:12, color:'#6b7280', margin:'2px 0 0' }}>Revenue predictions and business insights</p>
        </div>
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer', fontSize:13, color:'#374151' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Next 7 Days', value: fmtS(next7), sub:'Projected revenue', color:'#22c55e' },
          { label:'Next 30 Days', value: fmtS(next30), sub:'Projected revenue', color:'#6366f1' },
          { label:'Avg Daily', value: fmtS(avgDaily), sub:`${dataPoints} data points`, color:'#f59e0b' },
          { label:'Confidence', value:`${confidenceScore}%`, sub:'Based on data density', color: confidenceScore >= 70 ? '#22c55e' : confidenceScore >= 40 ? '#f59e0b' : '#ef4444' },
        ].map(c => (
          <div key={c.label} style={card()}>
            <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{c.label}</p>
            <p style={{ fontSize:22, fontWeight:700, color:c.color, margin:'0 0 4px' }}>{c.value}</p>
            <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Trend */}
      <div style={card({ marginBottom:20, display:'flex', alignItems:'center', gap:16 })}>
        <div>
          <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 6px', textTransform:'uppercase' }}>Revenue Trend</p>
          <TrendBadge trend={trend} pct={Math.abs(trendPct)} />
        </div>
        <div style={{ width:1, height:36, background:'#e5e7eb' }} />
        <div>
          <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 4px' }}>Data Quality</p>
          <p style={{ fontSize:12, color:'#374151', margin:0 }}>
            Using <strong>{dataPoints}</strong> active sales days. 
            {confidenceScore < 50 ? ' Need more data for better accuracy.' : ' Good data coverage.'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:14, marginBottom:20 }}>
        {/* Revenue Chart */}
        <div style={card()}>
          <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:'0 0 14px' }}>Daily Revenue (Last 30 Days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyFilled.slice(-30)} margin={{ top:4, right:8, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize:9, fill:'#9ca3af' }} tickFormatter={d => d.slice(5)} interval={4} />
              <YAxis tickFormatter={fmtS} tick={{ fontSize:9, fill:'#9ca3af' }} width={50} />
              <Tooltip formatter={(v: any) => [fmt(v), 'Revenue']} contentStyle={{ fontSize:11, borderRadius:8 }} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div style={card()}>
          <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:'0 0 14px' }}>Top Products (60 days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts.slice(0, 6)} layout="vertical" margin={{ top:0, right:16, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:9, fill:'#9ca3af' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:9, fill:'#374151' }} width={80} />
              <Tooltip formatter={(v: any) => [v, 'Total Sold']} contentStyle={{ fontSize:11, borderRadius:8 }} />
              <Bar dataKey="total" fill="#6366f1" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment & Discount Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:14, marginBottom:20 }}>
        {/* Payment Modes */}
        <div style={card()}>
          <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:'0 0 14px' }}>Payment Mode Distribution</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
            {[
              { label:'Cash', val:`${paymentPct.cash}%`, color:'#22c55e' },
              { label:'UPI', val:`${paymentPct.upi}%`, color:'#6366f1' },
              { label:'Mixed', val:`${paymentPct.mixed}%`, color:'#f59e0b' },
            ].map(p => (
              <div key={p.label} style={{ textAlign:'center', padding:'12px 8px', border:'1px solid #e5e7eb', borderRadius:8 }}>
                <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 4px', textTransform:'uppercase' }}>{p.label}</p>
                <p style={{ fontSize:20, fontWeight:700, color:p.color, margin:0 }}>{p.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Discount Impact */}
        <div style={card()}>
          <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:'0 0 14px' }}>Discount Impact</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ padding:'12px', border:'1px solid #e5e7eb', borderRadius:8 }}>
              <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 4px', textTransform:'uppercase' }}>No Discount</p>
              <p style={{ fontSize:18, fontWeight:700, color:'#6b7280', margin:0 }}>{fmt(avgNoDiscount)}</p>
              <p style={{ fontSize:10, color:'#9ca3af', margin:'2px 0 0' }}>Avg bill value</p>
            </div>
            <div style={{ padding:'12px', border:'1px solid #e5e7eb', borderRadius:8 }}>
              <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 4px', textTransform:'uppercase' }}>With Discount</p>
              <p style={{ fontSize:18, fontWeight:700, color:'#22c55e', margin:0 }}>{fmt(avgWithDiscount)}</p>
              <p style={{ fontSize:10, color:'#9ca3af', margin:'2px 0 0' }}>Avg bill value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Alert */}
      <div style={card()}>
        <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:'0 0 14px' }}>Stock Alert - Products Running Low</p>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #e5e7eb' }}>
                {['Product','Category','Current Stock','Avg Daily Sales','Days Left'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, color:'#6b7280', fontWeight:600, textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.filter(p => p.daysLeft < 30).slice(0, 8).map((p, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f3f4f6', background: p.daysLeft <= 7 ? '#fff5f5' : p.daysLeft <= 14 ? '#fffbeb' : '#fff' }}>
                  <td style={{ padding:'9px 12px', color:'#111827', fontWeight:500 }}>{p.name}</td>
                  <td style={{ padding:'9px 12px', color:'#6b7280' }}>{p.category}</td>
                  <td style={{ padding:'9px 12px', color:'#374151', fontWeight:600 }}>{p.stock}</td>
                  <td style={{ padding:'9px 12px', color:'#374151' }}>{p.avgDaily.toFixed(1)}</td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{ 
                      background: p.daysLeft <= 7 ? '#fee2e2' : p.daysLeft <= 14 ? '#fef9c3' : '#dcfce7',
                      color: p.daysLeft <= 7 ? '#dc2626' : p.daysLeft <= 14 ? '#ca8a04' : '#16a34a',
                      borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600 
                    }}>
                      {p.daysLeft >= 999 ? '∞' : `${p.daysLeft}d`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
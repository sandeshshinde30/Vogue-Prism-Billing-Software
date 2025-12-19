import { useEffect, useState } from 'react';
import {
  IndianRupee,
  Receipt,
  Package,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Card, StatCard } from '../components/common';
import { useStore } from '../store/useStore';
import { DailySummary, Product, Bill } from '../types';
import { formatCurrency, formatTime } from '../utils/export';

interface TopSelling {
  productName: string;
  size: string;
  totalQty: number;
}

export function Dashboard() {
  const {
    dailySummary,
    setDailySummary,
    recentBills,
    setRecentBills,
    lowStockProducts,
    setLowStockProducts,
  } = useStore();

  const [topSelling, setTopSelling] = useState<TopSelling[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [summary, recent, lowStock, top] = await Promise.all([
        window.electronAPI.getDailySummary(),
        window.electronAPI.getRecentBills(5),
        window.electronAPI.getLowStockProducts(),
        window.electronAPI.getTopSelling(),
      ]);

      setDailySummary(summary as DailySummary);
      setRecentBills(recent as Bill[]);
      setLowStockProducts(lowStock as Product[]);
      setTopSelling(top as TopSelling[]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <RefreshCw className="animate-spin text-green-600" size={24} style={{ color: '#16a34a' }} />
      </div>
    );
  }

  return (
    <div 
      className="space-y-5"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div>
          <h1 
            className="text-xl font-semibold text-slate-800"
            style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b' }}
          >
            Dashboard
          </h1>
          <p 
            className="text-sm text-slate-500 mt-0.5"
            style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}
          >
            Today's overview
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="h-9 px-4 flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          style={{
            height: '36px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#475569',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div 
        className="grid grid-cols-4 gap-4"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px' 
        }}
      >
        <StatCard
          title="Today Sales"
          value={formatCurrency(dailySummary?.totalSales || 0)}
          icon={<IndianRupee size={20} />}
        />
        <StatCard
          title="Bills Today"
          value={dailySummary?.totalBills || 0}
          icon={<Receipt size={20} />}
          variant="info"
        />
        <StatCard
          title="Items Sold"
          value={dailySummary?.itemsSold || 0}
          icon={<Package size={20} />}
        />
        <StatCard
          title="Low Stock"
          value={lowStockProducts.length}
          icon={<AlertTriangle size={20} />}
          variant={lowStockProducts.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Content Grid */}
      <div 
        className="grid grid-cols-2 gap-5"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '20px' 
        }}
      >
        {/* Recent Bills */}
        <Card padding="none">
          <div 
            className="px-5 py-4 border-b border-slate-100"
            style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid #f1f5f9' 
            }}
          >
            <h2 
              className="text-sm font-semibold text-slate-800"
              style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}
            >
              Recent Bills
            </h2>
          </div>
          <div style={{ padding: '12px' }}>
            {recentBills.length === 0 ? (
              <div 
                className="py-10 text-center text-slate-400"
                style={{ 
                  padding: '40px 0', 
                  textAlign: 'center', 
                  color: '#94a3b8' 
                }}
              >
                <Receipt size={32} className="mx-auto mb-2 opacity-50" style={{ margin: '0 auto 8px', opacity: '0.5' }} />
                <p className="text-sm" style={{ fontSize: '14px' }}>No bills today</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <p 
                        className="text-sm font-medium text-slate-800"
                        style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}
                      >
                        {bill.billNumber}
                      </p>
                      <p 
                        className="text-xs text-slate-400"
                        style={{ fontSize: '12px', color: '#94a3b8' }}
                      >
                        {formatTime(bill.createdAt)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p 
                        className="text-sm font-semibold text-slate-800 font-mono"
                        style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#1e293b',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}
                      >
                        {formatCurrency(bill.total)}
                      </p>
                      <p 
                        className="text-xs text-slate-400 capitalize"
                        style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'capitalize' }}
                      >
                        {bill.paymentMode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Top Selling */}
        <Card padding="none">
          <div 
            className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"
            style={{ 
              padding: '16px 20px', 
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <TrendingUp size={16} className="text-green-500" style={{ color: '#22c55e' }} />
            <h2 
              className="text-sm font-semibold text-slate-800"
              style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}
            >
              Top Selling Today
            </h2>
          </div>
          <div style={{ padding: '12px' }}>
            {topSelling.length === 0 ? (
              <div 
                className="py-10 text-center text-slate-400"
                style={{ 
                  padding: '40px 0', 
                  textAlign: 'center', 
                  color: '#94a3b8' 
                }}
              >
                <TrendingUp size={32} className="mx-auto mb-2 opacity-50" style={{ margin: '0 auto 8px', opacity: '0.5' }} />
                <p className="text-sm" style={{ fontSize: '14px' }}>No sales today</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {topSelling.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px'
                    }}
                  >
                    <div 
                      className="flex items-center gap-3"
                      style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <span 
                        className={`w-6 h-6 rounded text-xs font-semibold flex items-center justify-center ${
                          index === 0 ? 'bg-amber-100 text-amber-700' :
                          index === 1 ? 'bg-slate-100 text-slate-600' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-50 text-slate-500'
                        }`}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: index === 0 ? '#fef3c7' : index === 1 ? '#f1f5f9' : index === 2 ? '#fed7aa' : '#f8fafc',
                          color: index === 0 ? '#b45309' : index === 1 ? '#475569' : index === 2 ? '#c2410c' : '#64748b'
                        }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p 
                          className="text-sm font-medium text-slate-800"
                          style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}
                        >
                          {item.productName}
                        </p>
                        {item.size && (
                          <p 
                            className="text-xs text-slate-400"
                            style={{ fontSize: '12px', color: '#94a3b8' }}
                          >
                            {item.size}
                          </p>
                        )}
                      </div>
                    </div>
                    <span 
                      className="text-sm font-medium text-green-600"
                      style={{ fontSize: '14px', fontWeight: '500', color: '#16a34a' }}
                    >
                      {item.totalQty} sold
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card 
          className="bg-amber-50 border-amber-200" 
          padding="lg"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fcd34d' }}
        >
          <div 
            className="flex items-center gap-2 mb-4"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
          >
            <AlertTriangle size={18} className="text-amber-600" style={{ color: '#d97706' }} />
            <h2 
              className="text-sm font-semibold text-amber-800"
              style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}
            >
              Low Stock Alerts
            </h2>
            <span 
              className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full"
              style={{ 
                fontSize: '12px', 
                color: '#d97706', 
                backgroundColor: '#fef3c7',
                padding: '2px 8px',
                borderRadius: '9999px'
              }}
            >
              {lowStockProducts.length} items
            </span>
          </div>
          <div 
            className="grid grid-cols-3 gap-3"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '12px' 
            }}
          >
            {lowStockProducts.slice(0, 6).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #fcd34d'
                }}
              >
                <div>
                  <p 
                    className="text-sm font-medium text-slate-800"
                    style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}
                  >
                    {product.name}
                  </p>
                  {product.size && (
                    <p 
                      className="text-xs text-slate-400"
                      style={{ fontSize: '12px', color: '#94a3b8' }}
                    >
                      {product.size}
                    </p>
                  )}
                </div>
                <span
                  className={`text-sm font-semibold ${
                    product.stock === 0 ? 'text-red-600' : 'text-amber-600'
                  }`}
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: product.stock === 0 ? '#dc2626' : '#d97706'
                  }}
                >
                  {product.stock}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
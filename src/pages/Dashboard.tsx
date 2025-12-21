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
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-green-600 mx-auto mb-4" size={32} />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6"
      style={{
        width: '100%',
        maxWidth: 'none',
        margin: '0',
        padding: '0'
      }}
    >
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          marginBottom: '24px'
        }}
      >
        <div>
          <h1 
            className="text-2xl font-bold text-gray-900"
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '4px'
            }}
          >
            Dashboard
          </h1>
          <p 
            className="text-sm text-gray-600"
            style={{
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            Today's business overview
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            style={{
              padding:'10px'
            }}
       >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        style={{
          marginBottom: '24px'
        }}
      >
        <StatCard
          title="Today Sales"
          value={formatCurrency(dailySummary?.totalSales || 0)}
          icon={<IndianRupee size={24} />}
        />
        <StatCard
          title="Bills Today"
          value={dailySummary?.totalBills || 0}
          icon={<Receipt size={24} />}
          variant="info"
        />
        <StatCard
          title="Items Sold"
          value={dailySummary?.itemsSold || 0}
          icon={<Package size={24} />}
        />
        <StatCard
          title="Low Stock"
          value={lowStockProducts.length}
          icon={<AlertTriangle size={24} />}
          variant={lowStockProducts.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Content Grid */}
      <div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        style={{
          marginBottom: '24px'
        }}
      >
        {/* Recent Bills */}
        <Card padding="none">
          <div 
            className="px-6 py-4 border-b border-gray-100"
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #f3f4f6'
            }}
          >
            <h2 
              className="text-lg font-semibold text-gray-900"
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}
            >
              Recent Bills
            </h2>
          </div>
          <div 
            className="p-4"
            style={{
              padding: '16px'
            }}
          >
            {recentBills.length === 0 ? (
              <div 
                className="py-12 text-center text-gray-400"
                style={{
                  padding: '48px 0',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}
              >
                <Receipt size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No bills today</p>
                <p className="text-sm">Bills will appear here once you start selling</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{bill.billNumber}</p>
                      <p className="text-sm text-gray-500">{formatTime(bill.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 font-mono">
                        {formatCurrency(bill.total)}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
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
            className="px-6 py-4 border-b border-gray-100 flex items-center gap-2"
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <TrendingUp size={20} className="text-green-500" />
            <h2 
              className="text-lg font-semibold text-gray-900"
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}
            >
              Top Selling Today
            </h2>
          </div>
          <div 
            className="p-4"
            style={{
              padding: '16px'
            }}
          >
            {topSelling.length === 0 ? (
              <div 
                className="py-12 text-center text-gray-400"
                style={{
                  padding: '48px 0',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}
              >
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No sales today</p>
                <p className="text-sm">Top selling items will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topSelling.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        {item.size && (
                          <p className="text-sm text-gray-500">{item.size}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-medium text-green-600">
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
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-yellow-900">Low Stock Alerts</h2>
              <p className="text-sm text-yellow-700">
                {lowStockProducts.length} items need restocking
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200"
              >
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  {product.size && (
                    <p className="text-sm text-gray-500">{product.size}</p>
                  )}
                </div>
                <span
                  className={`font-semibold ${
                    product.stock === 0 ? 'text-red-600' : 'text-yellow-600'
                  }`}
                >
                  {product.stock}
                </span>
              </div>
            ))}
          </div>
          {lowStockProducts.length > 6 && (
            <div className="mt-3 text-center">
              <p className="text-sm text-yellow-700">
                and {lowStockProducts.length - 6} more items...
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
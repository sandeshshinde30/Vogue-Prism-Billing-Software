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
        <RefreshCw className="animate-spin text-green-600" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Today's overview</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="h-9 px-4 flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
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
      <div className="grid grid-cols-2 gap-5">
        {/* Recent Bills */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Bills</h2>
          </div>
          <div className="p-3">
            {recentBills.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No bills today</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{bill.billNumber}</p>
                      <p className="text-xs text-slate-400">{formatTime(bill.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800 font-mono">
                        {formatCurrency(bill.total)}
                      </p>
                      <p className="text-xs text-slate-400 capitalize">{bill.paymentMode}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Top Selling */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-500" />
            <h2 className="text-sm font-semibold text-slate-800">Top Selling Today</h2>
          </div>
          <div className="p-3">
            {topSelling.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sales today</p>
              </div>
            ) : (
              <div className="space-y-1">
                {topSelling.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded text-xs font-semibold flex items-center justify-center ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-slate-100 text-slate-600' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.productName}</p>
                        {item.size && <p className="text-xs text-slate-400">{item.size}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-green-600">{item.totalQty} sold</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="bg-amber-50 border-amber-200" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">Low Stock Alerts</h2>
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {lowStockProducts.length} items
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{product.name}</p>
                  {product.size && <p className="text-xs text-slate-400">{product.size}</p>}
                </div>
                <span className={`text-sm font-semibold ${
                  product.stock === 0 ? 'text-red-600' : 'text-amber-600'
                }`}>
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

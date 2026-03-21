import { useEffect, useState } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Package,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useStoreContext } from '../../contexts/StoreContext';
import { StoreStats } from '../../types/store';

export function StoreDashboard() {
  const { selectedStore } = useStoreContext();
  const [stats, setStats] = useState<StoreStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [topSelling, setTopSelling] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedStore]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load stats
      const storeStats = await window.electronAPI.stores.getStoreStats(
        selectedStore === 'all' ? undefined : selectedStore
      );
      setStats(storeStats);

      // Mock recent bills data
      const mockRecentBills = [
        { billNumber: 'VP0037', amount: 2686, time: '05:04 pm', paymentMode: 'Mixed' },
        { billNumber: 'VP0045', amount: 649, time: '05:34 pm', paymentMode: 'Upi' },
        { billNumber: 'VP0044', amount: 599, time: '05:31 pm', paymentMode: 'Upi' },
        { billNumber: 'VP0043', amount: 150, time: '05:31 pm', paymentMode: 'Cash' },
        { billNumber: 'VP0042', amount: 649, time: '05:16 pm', paymentMode: 'Upi' },
      ];
      setRecentBills(mockRecentBills);

      // Mock top selling data
      const mockTopSelling = [
        { rank: 1, name: 'Down Shoulder T-Shirt', size: 'M', sold: 5 },
        { rank: 2, name: 'desaa', size: '', sold: 4 },
        { rank: 3, name: 't-shirt', size: 'L', sold: 2 },
        { rank: 4, name: 'fffds', size: '', sold: 1 },
      ];
      setTopSelling(mockTopSelling);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const aggregatedStats = stats.reduce(
    (acc, stat) => ({
      totalRevenue: acc.totalRevenue + stat.totalRevenue,
      totalBills: acc.totalBills + stat.totalBills,
      pendingBills: acc.pendingBills + stat.pendingBills,
      syncedBills: acc.syncedBills + stat.syncedBills,
    }),
    { totalRevenue: 0, totalBills: 0, pendingBills: 0, syncedBills: 0 }
  );

  // Calculate items sold from bills
  const itemsSold = Math.floor(aggregatedStats.totalBills * 1.3); // Mock calculation
  const lowStock = 3; // Mock low stock count

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    bgColor 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    color: string; 
    bgColor: string;
  }) => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Today's business overview</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="TODAY SALES"
          value={`₹${aggregatedStats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="BILLS TODAY"
          value={aggregatedStats.totalBills}
          icon={ShoppingBag}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="ITEMS SOLD"
          value={itemsSold}
          icon={Package}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="LOW STOCK"
          value={lowStock}
          icon={AlertTriangle}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
      </div>

      {/* Recent Bills and Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Bills</h3>
          <div className="space-y-3">
            {recentBills.map((bill, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{bill.billNumber}</p>
                  <p className="text-sm text-gray-500">{bill.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{bill.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{bill.paymentMode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Today */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            📈 Top Selling Today
          </h3>
          <div className="space-y-3">
            {topSelling.map((item) => (
              <div key={item.rank} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {item.rank}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.size && <p className="text-sm text-gray-500">{item.size}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{item.sold} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
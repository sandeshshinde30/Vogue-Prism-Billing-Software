import { useStoreContext } from '../../contexts/StoreContext';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';

export function StoreAnalytics() {
  const { selectedStore, stores } = useStoreContext();

  return (
    <div className="space-y-6">
      {/* Analytics Content */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Store Analytics
          {selectedStore !== 'all' && (
            <span className="text-sm font-normal text-gray-500">
              - {stores.find(s => s.id === selectedStore)?.name}
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart Placeholder */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Revenue Analytics</h4>
              <p className="text-gray-500">
                {selectedStore === 'all' 
                  ? 'Compare revenue across all stores'
                  : 'Detailed revenue analytics for selected store'
                }
              </p>
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Performance Metrics</h4>
              <p className="text-gray-500">
                Store performance comparison and insights
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Coming Soon:</strong> Advanced analytics with revenue comparisons, 
            performance rankings, trend analysis, and product performance across stores.
          </p>
        </div>
      </div>
    </div>
  );
}
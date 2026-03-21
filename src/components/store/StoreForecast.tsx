import { useStoreContext } from '../../contexts/StoreContext';
import { TrendingUp, Target, Calendar } from 'lucide-react';

export function StoreForecast() {
  const { selectedStore, stores } = useStoreContext();

  return (
    <div className="space-y-6">
      {/* Forecast Content */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Store Forecasting
          {selectedStore !== 'all' && (
            <span className="text-sm font-normal text-gray-500">
              - {stores.find(s => s.id === selectedStore)?.name}
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demand Forecast Placeholder */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Demand Forecasting</h4>
              <p className="text-gray-500">
                {selectedStore === 'all' 
                  ? 'Predict demand across all store locations'
                  : 'Sales forecasting for selected store'
                }
              </p>
            </div>
          </div>

          {/* Seasonal Analysis Placeholder */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Seasonal Analysis</h4>
              <p className="text-gray-500">
                Seasonal trends and patterns analysis
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Coming Soon:</strong> AI-powered forecasting with demand prediction, 
            inventory planning, seasonal analysis, and growth projections for store expansion.
          </p>
        </div>
      </div>
    </div>
  );
}
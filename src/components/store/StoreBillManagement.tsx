import { useStoreContext } from '../../contexts/StoreContext';
import { FileEdit, Search, Filter } from 'lucide-react';

export function StoreBillManagement() {
  const { selectedStore, stores } = useStoreContext();

  return (
    <div className="space-y-6">
      {/* Bill Management Content */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileEdit className="w-5 h-5 text-blue-600" />
          Store Bill Management
          {selectedStore !== 'all' && (
            <span className="text-sm font-normal text-gray-500">
              - {stores.find(s => s.id === selectedStore)?.name}
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cross-Store Search Placeholder */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Cross-Store Search</h4>
              <p className="text-gray-500">
                {selectedStore === 'all' 
                  ? 'Search bills across all store locations'
                  : 'Search bills in selected store'
                }
              </p>
            </div>
          </div>

          {/* Bulk Operations Placeholder */}
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Bulk Operations</h4>
              <p className="text-gray-500">
                Mass actions on bills from multiple stores
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-purple-800 text-sm">
            <strong>Coming Soon:</strong> Consolidated bill management with cross-store search, 
            bulk operations, store-wise filtering, and unified bill status tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
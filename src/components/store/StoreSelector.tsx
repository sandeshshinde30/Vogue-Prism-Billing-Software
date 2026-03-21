import { ChevronDown, Store, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { useStoreContext } from '../../contexts/StoreContext';

export function StoreSelector() {
  const { 
    selectedStore, 
    stores, 
    setSelectedStore, 
    pullStoreData, 
    isLoading, 
    lastPullTime 
  } = useStoreContext();

  const selectedStoreData = stores.find(store => store.id === selectedStore);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'syncing': return 'text-blue-600 bg-blue-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'never_synced': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const branchStores = stores.filter(store => store.type === 'branch');
  const hasPendingData = branchStores.some(store => !store.lastSyncTime || 
    new Date(store.lastSyncTime) < new Date(Date.now() - 3600000)); // 1 hour ago

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-600" />
          Store Selection & Data Control
        </h2>
        
        <div className="flex items-center gap-3">
          {lastPullTime && (
            <span className="text-xs text-gray-500">
              Last pull: {new Date(lastPullTime).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Store
          </label>
          <div className="relative">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All Stores (Combined View)</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.type === 'master' ? 'Master' : 'Branch'})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Data Status & Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Status & Actions
          </label>
          
          {selectedStore === 'all' ? (
            <div className="space-y-3">
              {/* All Stores Status */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-900">All Stores View</span>
                  {hasPendingData && (
                    <span className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="w-3 h-3" />
                      Pending data
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  {stores.length} store{stores.length !== 1 ? 's' : ''} • 
                  Active: {stores.filter(s => s.isActive).length} • 
                  Online: {stores.filter(s => s.syncStatus === 'online').length}
                </p>
                
                {/* Branch Store Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => pullStoreData('all')}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm font-medium"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isLoading ? 'Pulling All Data...' : 'Pull All Branch Data'}
                  </button>
                  
                  {branchStores.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {branchStores.map(store => (
                        <button
                          key={store.id}
                          onClick={() => pullStoreData(store.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Pull {store.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedStoreData ? (
            <div className="space-y-3">
              {/* Individual Store Status */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{selectedStoreData.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedStoreData.syncStatus)}`}>
                    {selectedStoreData.syncStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <div>Type: <span className="font-medium">{selectedStoreData.type === 'master' ? 'Master Store' : 'Branch Store'}</span></div>
                  <div>Status: <span className="font-medium">{selectedStoreData.isActive ? 'Active' : 'Inactive'}</span></div>
                  <div>Last Sync: <span className="font-medium">
                    {selectedStoreData.lastSyncTime 
                      ? new Date(selectedStoreData.lastSyncTime).toLocaleString()
                      : 'Never synced'
                    }
                  </span></div>
                </div>
                
                {selectedStoreData.type === 'branch' && (
                  <button
                    onClick={() => pullStoreData(selectedStoreData.id)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm font-medium"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isLoading ? 'Pulling Data...' : `Pull ${selectedStoreData.name} Data`}
                  </button>
                )}
                
                {selectedStoreData.type === 'master' && (
                  <div className="text-center py-2 text-sm text-gray-500">
                    Master store - data is local
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">No store selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { 
  Settings,
  Store,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StoreData {
  storeId: string;
  storeName: string;
  localBills: number;
  supabaseBills: number;
  pendingPull: number;
  lastSync: string | null;
  isOnline: boolean;
}

export function StoreSettings() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullingData, setPullingData] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>('all');

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get stores from Supabase first
      const supabaseStores = await window.electronAPI.stores.getSupabaseStores();
      
      if (!supabaseStores || supabaseStores.length === 0) {
        console.log('No stores found in Supabase');
        setStores([]);
        return;
      }

      // Get local data for each store
      const storeDataPromises = supabaseStores.map(async (store: any) => {
        const storeId = store.id || store.store_id;
        const storeName = store.name || store.store_name || `Store ${storeId}`;
        
        try {
          const localBills = await window.electronAPI.stores.getLocalBillCount(storeId);
          const supabaseBills = await window.electronAPI.stores.getSupabaseBillCount(storeId);
          const lastSync = await window.electronAPI.stores.getLastSyncTime(storeId);
          
          return {
            storeId,
            storeName,
            localBills,
            supabaseBills,
            pendingPull: Math.max(0, supabaseBills - localBills),
            lastSync,
            isOnline: true // You can implement real online status check if needed
          };
        } catch (storeError) {
          console.error(`Error loading data for store ${storeId}:`, storeError);
          return {
            storeId,
            storeName,
            localBills: 0,
            supabaseBills: 0,
            pendingPull: 0,
            lastSync: null,
            isOnline: false
          };
        }
      });

      const storeData = await Promise.all(storeDataPromises);
      setStores(storeData);
      
      console.log('Loaded store data:', storeData);
    } catch (error) {
      console.error('Error loading store data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load store data');
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePullData = async (storeId: string) => {
    setPullingData(storeId);
    try {
      const result = await window.electronAPI.stores.pullStoreData(storeId);
      toast.success(`✓ Pulled ${result.recordsPulled} records from ${storeId}`);
      await loadStoreData(); // Refresh data
    } catch (error) {
      console.error('Error pulling data:', error);
      toast.error(`Failed to pull data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPullingData(null);
    }
  };

  const handlePullAllData = async () => {
    setPullingData('all');
    try {
      const result = await window.electronAPI.stores.pullAllStoreData();
      toast.success(`✓ Pulled ${result.totalRecordsPulled} records from ${result.storesPulled.length} stores`);
      await loadStoreData(); // Refresh data
    } catch (error) {
      console.error('Error pulling all data:', error);
      toast.error(`Failed to pull data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPullingData(null);
    }
  };

  const getStatusIcon = (store: StoreData) => {
    if (store.pendingPull > 0) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = (store: StoreData) => {
    if (store.pendingPull > 0) {
      return `${store.pendingPull} bills pending`;
    }
    return 'Up to date';
  };

  const totalPendingPull = stores.reduce((sum, store) => sum + store.pendingPull, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading store settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Store Settings</h2>
            <p className="text-gray-600">Manage store selection and data synchronization</p>
          </div>
        </div>
        <button
          onClick={loadStoreData}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Store Selection */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5" />
          Store Selection & Data Control
        </h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Store
          </label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Stores (Combined View)</option>
            {stores.map((store) => (
              <option key={store.storeId} value={store.storeId}>
                {store.storeName}
              </option>
            ))}
          </select>
        </div>

        {/* Data Status Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Data Status & Actions</h4>
              <p className="text-sm text-blue-700 mt-1">
                {selectedStore === 'all' ? (
                  <>
                    <span className="font-medium">{stores.length} stores</span> • 
                    <span className="font-medium text-green-600"> Active: {stores.filter(s => s.isOnline).length}</span> • 
                    <span className="font-medium text-gray-600"> Offline: {stores.filter(s => !s.isOnline).length}</span>
                  </>
                ) : (
                  `Viewing ${stores.find(s => s.storeId === selectedStore)?.storeName || 'Selected Store'}`
                )}
              </p>
            </div>
            {totalPendingPull > 0 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Pending data</span>
              </div>
            )}
          </div>
          
          {selectedStore === 'all' && totalPendingPull > 0 && (
            <button
              onClick={handlePullAllData}
              disabled={pullingData === 'all'}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {pullingData === 'all' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Pulling All Branch Data...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Pull All Branch Data
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error Loading Store Data</span>
          </div>
          <p className="text-red-700 mt-1 text-sm">{error}</p>
          <button
            onClick={loadStoreData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Store Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores
          .filter(store => selectedStore === 'all' || store.storeId === selectedStore)
          .map((store) => (
            <div key={store.storeId} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              {/* Store Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${store.isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Store className={`w-5 h-5 ${store.isOnline ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{store.storeId}</h4>
                    <p className="text-sm text-gray-500">{store.storeName}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  store.isOnline 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {store.isOnline ? 'Online' : 'Offline'}
                </div>
              </div>

              {/* Data Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Local Bills</span>
                  <span className="font-medium text-gray-900">{store.localBills}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Supabase Bills</span>
                  <span className="font-medium text-gray-900">{store.supabaseBills}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(store)}
                    <span className="text-sm font-medium">{getStatusText(store)}</span>
                  </div>
                </div>
                {store.lastSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Sync</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date(store.lastSync).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {store.pendingPull > 0 ? (
                  <button
                    onClick={() => handlePullData(store.storeId)}
                    disabled={pullingData === store.storeId}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {pullingData === store.storeId ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Pulling Data...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Pull {store.pendingPull} Bills
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePullData(store.storeId)}
                    disabled={pullingData === store.storeId}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {stores.length === 0 && !loading && (
        <div className="text-center py-12">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Stores Found</h3>
          <p className="text-gray-600 mb-4">
            No stores are available in your Supabase database.
          </p>
          <p className="text-sm text-gray-500">
            Make sure you have stores configured in your Supabase 'stores' table.
          </p>
        </div>
      )}
    </div>
  );
}
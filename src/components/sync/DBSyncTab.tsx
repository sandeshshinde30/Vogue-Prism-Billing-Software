import { useEffect, useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Database,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Gauge,
  Activity,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: string;
  pendingCount: number;
  syncProgress: number;
  error?: string;
}

interface NetworkStatus {
  isOnline: boolean;
  speed: number;
  latency: number;
  lastChecked: string;
  connectionType: string;
}

interface SyncHistoryItem {
  timestamp: string;
  status: 'success' | 'failed';
  pendingCount: number;
  error?: string;
  duration?: number;
  itemsSynced?: number;
}

export function DBSyncTab() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    pendingCount: 0,
    syncProgress: 0,
  });

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: false,
    speed: 0,
    latency: 0,
    lastChecked: new Date().toISOString(),
    connectionType: 'unknown',
  });

  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [autoSync, setAutoSync] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);

  // Fetch sync status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await window.electronAPI.sync.getStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Error fetching sync status:', error);
      }
    };

    const interval = setInterval(fetchStatus, 2000);
    fetchStatus();

    return () => clearInterval(interval);
  }, []);

  // Fetch network status
  useEffect(() => {
    const fetchNetworkStatus = async () => {
      try {
        const status = await window.electronAPI.network.getStatus();
        setNetworkStatus(status);
      } catch (error) {
        console.error('Error fetching network status:', error);
      }
    };

    const interval = setInterval(fetchNetworkStatus, 5000);
    fetchNetworkStatus();

    return () => clearInterval(interval);
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (autoSync && networkStatus.isOnline && !syncStatus.isSyncing) {
      const timer = setTimeout(() => {
        handleSync();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [autoSync, networkStatus.isOnline, syncStatus.isSyncing]);

  const handleSync = async () => {
    try {
      setSyncStartTime(Date.now());
      const result = await window.electronAPI.sync.performSync();
      const duration = Date.now() - (syncStartTime || Date.now());
      setSyncStartTime(null);
      setSyncStatus(result);

      if (result.error) {
        toast.error(`Sync failed: ${result.error}`);
      } else {
        toast.success(
          `Sync completed! ${result.pendingCount} items pending.`
        );
      }

      // Add to history with more details
      setSyncHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          status: result.error ? 'failed' : 'success',
          pendingCount: result.pendingCount,
          error: result.error,
          duration: duration,
          itemsSynced: result.itemsSynced || 0,
        },
        ...prev.slice(0, 19),
      ]);
    } catch (error) {
      setSyncStartTime(null);
      const errorMsg = (error as Error).message;
      toast.error('Sync error: ' + errorMsg);
      
      setSyncHistory(prev => [
        {
          timestamp: new Date().toISOString(),
          status: 'failed',
          pendingCount: syncStatus.pendingCount,
          error: errorMsg,
          duration: Date.now() - (syncStartTime || Date.now()),
        },
        ...prev.slice(0, 19),
      ]);
    }
  };

  const handleForceFullSync = async () => {
    if (
      !window.confirm(
        'This will reset all sync metadata and perform a full sync. Continue?'
      )
    ) {
      return;
    }

    try {
      const result = await window.electronAPI.sync.forceFullSync();
      setSyncStatus(result);
      toast.success('Full sync initiated');
    } catch (error) {
      toast.error('Full sync error: ' + (error as Error).message);
    }
  };

  const getSpeedColor = (speed: number) => {
    if (speed >= 50) return 'text-green-600';
    if (speed >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSpeedBgColor = (speed: number) => {
    if (speed >= 50) return 'bg-green-50 border-green-200';
    if (speed >= 10) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getSpeedLabel = (speed: number) => {
    if (speed >= 50) return 'Excellent';
    if (speed >= 10) return 'Good';
    return 'Slow';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              Database Sync
            </h1>
            <p className="text-gray-600">
              Real-time multi-store data synchronization
            </p>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all border border-gray-300"
          >
            <Settings className="w-4 h-4" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Network Status Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Network Status
            </h2>
            {networkStatus.isOnline ? (
              <Wifi className="w-6 h-6 text-green-600" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-600" />
            )}
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${
              networkStatus.isOnline 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className="text-gray-600 text-sm font-medium mb-1">Connection Status</p>
              <p className="text-2xl font-bold">
                {networkStatus.isOnline ? (
                  <span className="text-green-600">🟢 Online</span>
                ) : (
                  <span className="text-red-600">🔴 Offline</span>
                )}
              </p>
            </div>

            {networkStatus.isOnline && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border-2 ${getSpeedBgColor(networkStatus.speed)}`}>
                    <p className="text-gray-600 text-xs font-medium mb-1 flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      Speed
                    </p>
                    <p className={`text-xl font-bold ${getSpeedColor(networkStatus.speed)}`}>
                      {networkStatus.speed} Mbps
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getSpeedLabel(networkStatus.speed)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border-2 bg-blue-50 border-blue-200">
                    <p className="text-gray-600 text-xs font-medium mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Latency
                    </p>
                    <p className="text-xl font-bold text-blue-600">
                      {networkStatus.latency}ms
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {networkStatus.connectionType}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 flex items-center gap-1 pt-2">
                  <Clock className="w-3 h-3" />
                  Last checked: {new Date(networkStatus.lastChecked).toLocaleTimeString()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sync Status Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Sync Status
            </h2>
            {syncStatus.isSyncing ? (
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            ) : syncStatus.error ? (
              <AlertCircle className="w-6 h-6 text-red-600" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${
              syncStatus.isSyncing 
                ? 'bg-blue-50 border-blue-200' 
                : syncStatus.error 
                ? 'bg-red-50 border-red-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <p className="text-gray-600 text-sm font-medium mb-1">Current Status</p>
              <p className="text-2xl font-bold">
                {syncStatus.isSyncing ? (
                  <span className="text-blue-600">⟳ Syncing...</span>
                ) : syncStatus.error ? (
                  <span className="text-red-600">⚠ Error</span>
                ) : (
                  <span className="text-green-600">✓ Ready</span>
                )}
              </p>
            </div>

            {syncStatus.isSyncing && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600 text-sm font-medium">Progress</p>
                  <p className="text-sm font-bold text-blue-600">{syncStatus.syncProgress}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncStatus.syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            {syncStatus.lastSyncTime && (
              <div className="text-xs text-gray-500 flex items-center gap-1 pt-2">
                <Clock className="w-3 h-3" />
                Last sync: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
              </div>
            )}

            {syncStatus.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-700 font-medium">Error Details:</p>
                <p className="text-xs text-red-600 mt-1 break-words">{syncStatus.error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Items Card */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Pending Sync Items
            </h2>
          </div>
          <div className={`px-4 py-1 rounded-full font-bold ${
            syncStatus.pendingCount > 0 
              ? 'bg-orange-100 text-orange-700 border border-orange-300' 
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {syncStatus.pendingCount}
          </div>
        </div>

        {syncStatus.pendingCount > 0 ? (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <p className="text-orange-800 font-medium">
              ⏳ {syncStatus.pendingCount} item{syncStatus.pendingCount !== 1 ? 's' : ''} waiting to sync
            </p>
            <p className="text-orange-600 text-sm mt-1">
              These will be synced automatically when online and connected to Supabase.
            </p>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">
              ✓ All data is synced
            </p>
            <p className="text-green-600 text-sm mt-1">
              Your local database is up to date with the master database.
            </p>
          </div>
        )}
      </div>

      {/* Sync Controls */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sync Controls</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={e => setAutoSync(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-blue-600"
              />
              <span className="text-gray-900 font-medium">
                Auto-sync when online
              </span>
            </label>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              autoSync 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-gray-200 text-gray-600 border border-gray-300'
            }`}>
              {autoSync ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleSync}
              disabled={!networkStatus.isOnline || syncStatus.isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <button
              onClick={handleForceFullSync}
              disabled={syncStatus.isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium"
            >
              <Zap className="w-4 h-4" />
              Force Full Sync
            </button>
          </div>

          {!networkStatus.isOnline && (
            <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">
                ⚠ You are offline. Sync will resume when connection is restored.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Sync History
          </h2>
          <span className="text-xs text-gray-500">Last 20 syncs</span>
        </div>

        {syncHistory.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {syncHistory.map((item, index) => (
              <div
                key={index}
                className={`rounded-lg border-2 transition-all ${
                  item.status === 'success'
                    ? 'bg-green-50 border-green-200 hover:border-green-300'
                    : 'bg-red-50 border-red-200 hover:border-red-300'
                }`}
              >
                <button
                  onClick={() => setExpandedHistory(expandedHistory === index ? null : index)}
                  className="w-full p-3 flex items-center justify-between hover:opacity-80 transition"
                >
                  <div className="flex items-center gap-2 flex-1 text-left">
                    {item.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        {item.status === 'success' ? '✓ Sync Successful' : '✗ Sync Failed'}
                      </p>
                      <p className={`text-xs ${item.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {new Date(item.timestamp).toLocaleTimeString()} • {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right mr-2">
                    <p className={`text-sm font-semibold ${item.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      {item.pendingCount} pending
                    </p>
                    {item.duration && (
                      <p className={`text-xs ${item.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatDuration(item.duration)}
                      </p>
                    )}
                  </div>
                  {expandedHistory === index ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {expandedHistory === index && (
                  <div className={`px-3 pb-3 border-t-2 ${item.status === 'success' ? 'border-green-200' : 'border-red-200'}`}>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div>
                        <p className="text-gray-600">Pending Items</p>
                        <p className="font-semibold text-gray-900">{item.pendingCount}</p>
                      </div>
                      {item.itemsSynced !== undefined && (
                        <div>
                          <p className="text-gray-600">Items Synced</p>
                          <p className="font-semibold text-gray-900">{item.itemsSynced}</p>
                        </div>
                      )}
                      {item.duration && (
                        <div>
                          <p className="text-gray-600">Duration</p>
                          <p className="font-semibold text-gray-900">{formatDuration(item.duration)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">Time</p>
                        <p className="font-semibold text-gray-900">{new Date(item.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    {item.error && (
                      <div className="mt-2 p-2 bg-red-100 rounded border border-red-200">
                        <p className="text-xs font-medium text-red-800">Error:</p>
                        <p className="text-xs text-red-700 mt-1 break-words">{item.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No sync history yet</p>
            <p className="text-xs text-gray-400 mt-1">Sync history will appear here</p>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="mt-6 bg-white rounded-xl p-6 border border-gray-200 shadow-sm border-l-4 border-l-yellow-500">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-yellow-600" />
            Advanced Settings
          </h2>

          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-900 font-medium mb-1">Supabase Configuration</p>
              <p className="text-xs text-yellow-700 mb-2">
                Check your Supabase project settings to verify credentials are correct.
              </p>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-700 hover:text-yellow-800 underline"
              >
                Open Supabase Dashboard →
              </a>
            </div>

            <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-1">Sync Queue</p>
              <p className="text-xs text-blue-700">
                Items in the sync queue will be processed automatically. Use "Force Full Sync" to reset and resync all data.
              </p>
            </div>

            <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <p className="text-sm text-purple-900 font-medium mb-1">Network Quality</p>
              <div className="text-xs text-purple-700 space-y-1 mt-1">
                <p>• <strong>Excellent:</strong> 50+ Mbps - Optimal sync performance</p>
                <p>• <strong>Good:</strong> 10-50 Mbps - Normal sync performance</p>
                <p>• <strong>Slow:</strong> &lt;10 Mbps - Sync may take longer</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  HardDrive,
  Signal,
  CheckCheck,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Pagination } from '../common';

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

interface DBStats {
  totalSize: number; // in MB
  usedSize: number; // in MB
  freeSize: number; // in MB
  bandwidthUsed: number; // in MB
  bandwidthLimit: number; // in MB (free tier)
}

interface UnsyncedBill {
  id: number;
  billNumber: string;
  total: number;
  createdAt: string;
  paymentMode: string;
  itemCount: number;
  queueId: string;
  operation: string;
  retryCount: number;
  errorMessage?: string;
}

export function EnhancedDBSyncTab() {
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

  const [dbStats, setDbStats] = useState<DBStats>({
    totalSize: 500,
    usedSize: 0,
    freeSize: 500,
    bandwidthUsed: 0,
    bandwidthLimit: 5000, // 5GB free tier
  });

  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [unsyncedBills, setUnsyncedBills] = useState<UnsyncedBill[]>([]);
  const [syncedBills, setSyncedBills] = useState<UnsyncedBill[]>([]);
  const [autoSync, setAutoSync] = useState(true);
  const [activeTab, setActiveTab] = useState<'unsynced' | 'synced'>('unsynced');
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const [syncingBills, setSyncingBills] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [pendingPage, setPendingPage] = useState(1);
  const [syncedPage, setSyncedPage] = useState(1);
  const BILLS_PAGE_SIZE = 5;

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

  // Fetch network status with real speed calculation
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

  // Fetch DB statistics
  useEffect(() => {
    const fetchDBStats = async () => {
      try {
        const stats = await window.electronAPI.sync.getDBStats();
        setDbStats(stats);
      } catch (error) {
        console.error('Error fetching DB stats:', error);
      }
    };

    const interval = setInterval(fetchDBStats, 10000);
    fetchDBStats();

    return () => clearInterval(interval);
  }, []);

  // Fetch unsynced and synced bills
  useEffect(() => {
    const fetchBills = async () => {
      try {
        const unsynced = await window.electronAPI.sync.getUnsyncedBills();
        const synced = await window.electronAPI.sync.getSyncedBills();
        setUnsyncedBills(unsynced);
        setSyncedBills(synced);
      } catch (error) {
        console.error('Error fetching bills:', error);
      }
    };

    const interval = setInterval(fetchBills, 3000);
    fetchBills();

    return () => clearInterval(interval);
  }, []);

  // Auto-sync when online (1 hour delay, only if there are unsynced bills)
  useEffect(() => {
    if (autoSync && networkStatus.isOnline && !syncStatus.isSyncing && unsyncedBills.length > 0) {
      const timer = setTimeout(() => {
        handleSync();
      }, 3600000); // 1 hour = 3600000ms

      return () => clearTimeout(timer);
    }
  }, [autoSync, networkStatus.isOnline, syncStatus.isSyncing, unsyncedBills.length]);

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
        toast.success(`Sync completed! ${result.pendingCount} items pending.`);
      }

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

  const handleSyncSingleBill = async (queueId: string, billNumber: string) => {
    if (!networkStatus.isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setSyncingBills(prev => new Set(prev).add(queueId));
    
    try {
      await window.electronAPI.sync.syncSingleBill(queueId);
      toast.success(`Bill ${billNumber} synced successfully`);
      
      // Refresh bills list
      const unsynced = await window.electronAPI.sync.getUnsyncedBills();
      const synced = await window.electronAPI.sync.getSyncedBills();
      setUnsyncedBills(unsynced);
      setSyncedBills(synced);
    } catch (error) {
      toast.error(`Failed to sync bill ${billNumber}: ${(error as Error).message}`);
    } finally {
      setSyncingBills(prev => {
        const newSet = new Set(prev);
        newSet.delete(queueId);
        return newSet;
      });
    }
  };

  const handleSyncAllBills = async () => {
    if (!networkStatus.isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    if (unsyncedBills.length === 0) {
      toast.success('No bills to sync');
      return;
    }

    const confirmed = window.confirm(`Sync all ${unsyncedBills.length} unsynced bills?`);
    if (!confirmed) return;

    await handleSync();
  };

  const handleForceFullSync = async () => {
    if (!window.confirm('This will reset all sync metadata and perform a full sync. Continue?')) {
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

  const formatSize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const getUsageColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageBgColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          Database Sync
        </h1>
        <p className="text-gray-600">
          Real-time multi-store data synchronization with Supabase
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-gray-50 rounded border">
                <p className="text-gray-600">Pending</p>
                <p className="font-bold text-orange-600">{syncStatus.pendingCount}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded border">
                <p className="text-gray-600">Synced</p>
                <p className="font-bold text-green-600">{syncedBills.length}</p>
              </div>
            </div>

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

        {/* DB Statistics Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-600" />
              DB Statistics
            </h2>
            <Signal className="w-6 h-6 text-indigo-600" />
          </div>

          <div className="space-y-4">
            {/* Storage Usage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-600 text-sm font-medium">Storage Used</p>
                <p className={`text-sm font-bold ${getUsageColor(dbStats.usedSize, dbStats.totalSize)}`}>
                  {formatSize(dbStats.usedSize)} / {formatSize(dbStats.totalSize)}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBgColor(dbStats.usedSize, dbStats.totalSize)}`}
                  style={{ width: `${(dbStats.usedSize / dbStats.totalSize) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatSize(dbStats.freeSize)} remaining
              </p>
            </div>

            {/* Bandwidth Usage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-600 text-sm font-medium">Bandwidth Used</p>
                <p className={`text-sm font-bold ${getUsageColor(dbStats.bandwidthUsed, dbStats.bandwidthLimit)}`}>
                  {formatSize(dbStats.bandwidthUsed)} / {formatSize(dbStats.bandwidthLimit)}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBgColor(dbStats.bandwidthUsed, dbStats.bandwidthLimit)}`}
                  style={{ width: `${(dbStats.bandwidthUsed / dbStats.bandwidthLimit) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Free tier: {formatSize(dbStats.bandwidthLimit)} monthly
              </p>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-xs text-indigo-900 font-medium">Supabase Free Tier</p>
              <p className="text-xs text-indigo-700 mt-1">
                500 MB storage • 5 GB bandwidth/month
              </p>
            </div>
          </div>
        </div>
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

      {/* Bills Sync Status */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Bills Sync Status</h2>
          {unsyncedBills.length > 0 && (
            <button
              onClick={handleSyncAllBills}
              disabled={!networkStatus.isOnline || syncStatus.isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Sync All ({unsyncedBills.length})
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('unsynced')}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'unsynced'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Unsynced Bills ({unsyncedBills.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('synced')}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'synced'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4" />
              Synced Bills ({syncedBills.length})
            </div>
          </button>
        </div>

        {/* Unsynced Bills Tab */}
        {activeTab === 'unsynced' && (
          <div className="space-y-2">
            {unsyncedBills.length > 0 ? (
              <>
                {unsyncedBills
                  .slice((pendingPage - 1) * BILLS_PAGE_SIZE, pendingPage * BILLS_PAGE_SIZE)
                  .map((bill) => (
                    <div
                      key={bill.queueId}
                      className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg hover:border-orange-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900">{bill.billNumber}</p>
                            <span className="text-xs px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full">
                              {bill.operation}
                            </span>
                            {bill.retryCount > 0 && (
                              <span className="text-xs px-2 py-0.5 bg-red-200 text-red-800 rounded-full">
                                Retry: {bill.retryCount}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Total:</span> ₹{bill.total.toFixed(2)}
                            </div>
                            <div>
                              <span className="font-medium">Items:</span> {bill.itemCount}
                            </div>
                            <div>
                              <span className="font-medium">Payment:</span> {bill.paymentMode}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Created: {new Date(bill.createdAt).toLocaleString()}
                          </p>
                          {bill.errorMessage && (
                            <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                              Error: {bill.errorMessage}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleSyncSingleBill(bill.queueId, bill.billNumber)}
                          disabled={!networkStatus.isOnline || syncingBills.has(bill.queueId)}
                          className="ml-4 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm font-medium"
                        >
                          {syncingBills.has(bill.queueId) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            'Sync'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                
                {/* Pagination for Pending Bills */}
                <Pagination
                  currentPage={pendingPage}
                  totalItems={unsyncedBills.length}
                  pageSize={BILLS_PAGE_SIZE}
                  onPageChange={setPendingPage}
                  theme="orange"
                />
              </>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">All bills are synced!</p>
                <p className="text-xs text-gray-400 mt-1">No pending bills to sync</p>
              </div>
            )}
          </div>
        )}

        {/* Synced Bills Tab */}
        {activeTab === 'synced' && (
          <div className="space-y-2">
            {syncedBills.length > 0 ? (
              <>
                {syncedBills
                  .slice((syncedPage - 1) * BILLS_PAGE_SIZE, syncedPage * BILLS_PAGE_SIZE)
                  .map((bill) => (
                    <div
                      key={bill.queueId}
                      className="p-4 bg-green-50 border-2 border-green-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="font-bold text-gray-900">{bill.billNumber}</p>
                            <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded-full">
                              Synced
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Total:</span> ₹{bill.total.toFixed(2)}
                            </div>
                            <div>
                              <span className="font-medium">Items:</span> {bill.itemCount}
                            </div>
                            <div>
                              <span className="font-medium">Payment:</span> {bill.paymentMode}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Created: {new Date(bill.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {/* Pagination for Synced Bills */}
                <Pagination
                  currentPage={syncedPage}
                  totalItems={syncedBills.length}
                  pageSize={BILLS_PAGE_SIZE}
                  onPageChange={setSyncedPage}
                  theme="green"
                />
              </>
            ) : (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No synced bills yet</p>
                <p className="text-xs text-gray-400 mt-1">Synced bills will appear here</p>
              </div>
            )}
          </div>
        )}
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
    </div>
  );
}

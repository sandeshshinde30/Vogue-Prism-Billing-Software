import { useEffect, useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Activity,
  HardDrive,
  Signal,
  CheckCheck,
  XCircle,
  Database,
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

  const [unsyncedBills, setUnsyncedBills] = useState<UnsyncedBill[]>([]);
  const [syncedBills, setSyncedBills] = useState<UnsyncedBill[]>([]);
  const [dbStats, setDbStats] = useState<DBStats>({
    totalSize: 500,
    usedSize: 0,
    freeSize: 500,
    bandwidthUsed: 0,
    bandwidthLimit: 5000, // 5GB free tier
  });
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

  const handleSync = async () => {
    try {
      const result = await window.electronAPI.sync.performSync();
      setSyncStatus(result);

      if (result.error) {
        toast.error(`Sync failed: ${result.error}`);
      } else {
        toast.success(`Sync completed! ${result.pendingCount} items pending.`);
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error('Sync error: ' + errorMsg);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              Database Sync
            </h1>
            <p className="text-gray-600">
              Real-time multi-store data synchronization with Supabase
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Network Status Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Network Status
            </h2>
            {networkStatus.isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
          </div>

          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${
              networkStatus.isOnline 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className="text-sm font-medium">
                {networkStatus.isOnline ? (
                  <span className="text-green-600">🟢 Online</span>
                ) : (
                  <span className="text-red-600">🔴 Offline</span>
                )}
              </p>
            </div>

            {networkStatus.isOnline && (
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded border ${getSpeedBgColor(networkStatus.speed)}`}>
                  <p className="text-xs text-gray-600 mb-1">Speed</p>
                  <p className={`text-lg font-bold ${getSpeedColor(networkStatus.speed)}`}>
                    {networkStatus.speed} Mbps
                  </p>
                  <p className="text-xs text-gray-500">{getSpeedLabel(networkStatus.speed)}</p>
                </div>

                <div className="p-2 rounded border bg-blue-50 border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Latency</p>
                  <p className="text-lg font-bold text-blue-600">{networkStatus.latency}ms</p>
                  <p className="text-xs text-gray-500">{networkStatus.connectionType}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              Last checked: {new Date(networkStatus.lastChecked).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Sync Status Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Sync Status
            </h2>
            {syncStatus.isSyncing ? (
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            ) : syncStatus.error ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>

          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${
              syncStatus.isSyncing 
                ? 'bg-blue-50 border border-blue-200' 
                : syncStatus.error 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <p className="text-sm font-medium">
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
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-600">Progress</p>
                  <p className="text-xs font-bold text-blue-600">{syncStatus.syncProgress}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${syncStatus.syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded border bg-orange-50 border-orange-200">
                <p className="text-xs text-gray-600">Pending Bills</p>
                <p className="text-lg font-bold text-orange-600">{unsyncedBills.length}</p>
              </div>
              <div className="p-2 rounded border bg-green-50 border-green-200">
                <p className="text-xs text-gray-600">Synced Bills</p>
                <p className="text-lg font-bold text-green-600">{syncedBills.length}</p>
              </div>
            </div>

            {syncStatus.lastSyncTime && (
              <p className="text-xs text-gray-500 text-center">
                Last sync: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
              </p>
            )}

            {syncStatus.error && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="text-xs text-red-700 font-medium">Error:</p>
                <p className="text-xs text-red-600 mt-1">{syncStatus.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* DB Statistics Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-600" />
              DB Statistics
            </h2>
            <Signal className="w-5 h-5 text-indigo-600" />
          </div>

          <div className="space-y-3">
            {/* Storage Usage */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-gray-700">Storage Used</p>
                <p className={`text-sm font-bold ${getUsageColor(dbStats.usedSize, dbStats.totalSize)}`}>
                  {((dbStats.usedSize / dbStats.totalSize) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBgColor(dbStats.usedSize, dbStats.totalSize)}`}
                  style={{ width: `${(dbStats.usedSize / dbStats.totalSize) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatSize(dbStats.usedSize)} / {formatSize(dbStats.totalSize)}
              </p>
              <p className="text-xs text-gray-400">
                {formatSize(dbStats.freeSize)} remaining
              </p>
            </div>

            {/* Bandwidth Usage */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-gray-700">Bandwidth Used</p>
                <p className={`text-sm font-bold ${getUsageColor(dbStats.bandwidthUsed, dbStats.bandwidthLimit)}`}>
                  {((dbStats.bandwidthUsed / dbStats.bandwidthLimit) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBgColor(dbStats.bandwidthUsed, dbStats.bandwidthLimit)}`}
                  style={{ width: `${(dbStats.bandwidthUsed / dbStats.bandwidthLimit) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatSize(dbStats.bandwidthUsed)} / {formatSize(dbStats.bandwidthLimit)}
              </p>
              <p className="text-xs text-gray-400">
                Free tier: {formatSize(dbStats.bandwidthLimit)} monthly
              </p>
            </div>

            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-center">
              <p className="text-xs text-indigo-900 font-medium">Supabase Free Tier</p>
              <p className="text-xs text-indigo-700">
                500 MB storage • 5 GB bandwidth/month
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bills Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pending Bills Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-600" />
              Pending Bills
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                {unsyncedBills.length}
              </span>
              {unsyncedBills.length > 0 && (
                <button
                  onClick={handleSyncAllBills}
                  disabled={!networkStatus.isOnline || syncStatus.isSyncing}
                  className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                  Sync All
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {unsyncedBills.length > 0 ? (
              <>
                {unsyncedBills
                  .slice((pendingPage - 1) * BILLS_PAGE_SIZE, pendingPage * BILLS_PAGE_SIZE)
                  .map((bill) => (
                    <div
                      key={bill.queueId}
                      className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900 text-sm">{bill.billNumber}</p>
                            {bill.retryCount > 0 && (
                              <span className="text-xs px-2 py-0.5 bg-red-200 text-red-800 rounded-full">
                                Retry: {bill.retryCount}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>₹{bill.total.toFixed(2)}</div>
                            <div>{bill.itemCount} items</div>
                            <div>{bill.paymentMode}</div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(bill.createdAt).toLocaleDateString()}
                          </p>
                          {bill.errorMessage && (
                            <div className="mt-1 p-1 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                              {bill.errorMessage}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleSyncSingleBill(bill.queueId, bill.billNumber)}
                          disabled={!networkStatus.isOnline || syncingBills.has(bill.queueId)}
                          className="ml-2 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-xs font-medium"
                        >
                          {syncingBills.has(bill.queueId) ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
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
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">All bills are synced!</p>
              </div>
            )}
          </div>
        </div>

        {/* Synced Bills Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-green-600" />
              Synced Bills
            </h2>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
              {syncedBills.length}
            </span>
          </div>

          <div className="space-y-2">
            {syncedBills.length > 0 ? (
              <>
                {syncedBills
                  .slice((syncedPage - 1) * BILLS_PAGE_SIZE, syncedPage * BILLS_PAGE_SIZE)
                  .map((bill) => (
                    <div
                      key={bill.queueId}
                      className="p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <p className="font-bold text-gray-900 text-sm">{bill.billNumber}</p>
                            <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded-full">
                              Synced
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>₹{bill.total.toFixed(2)}</div>
                            <div>{bill.itemCount} items</div>
                            <div>{bill.paymentMode}</div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(bill.createdAt).toLocaleDateString()}
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
              <div className="text-center py-8">
                <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No synced bills yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

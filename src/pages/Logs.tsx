import { useEffect, useState } from 'react';
import {
  Calendar,
  Filter,
  RefreshCw,
  Activity,
  Package,
  Receipt,
  Settings,
  Monitor,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, Button, Select } from '../components/common';
import { formatDateTime } from '../utils/export';
import toast from 'react-hot-toast';

interface ActivityLog {
  id: number;
  action: string;
  entityType: 'product' | 'bill' | 'setting' | 'system';
  entityId?: number;
  details: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  createdAt: string;
}

export function Logs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    entityType: '',
    dateFrom: '',
    dateTo: '',
  });

  const logsPerPage = 50;
  const totalPages = Math.ceil(totalCount / logsPerPage);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * logsPerPage;
      const [logsData, countData] = await Promise.all([
        window.electronAPI.getActivityLogs(
          logsPerPage,
          offset,
          filters.entityType || undefined,
          filters.dateFrom || undefined,
          filters.dateTo || undefined
        ),
        window.electronAPI.getLogsCount(
          filters.entityType || undefined,
          filters.dateFrom || undefined,
          filters.dateTo || undefined
        ),
      ]);

      setLogs(logsData as ActivityLog[]);
      setTotalCount(countData.count);
    } catch (error) {
      toast.error('Error loading activity logs');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [currentPage, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'product':
        return <Package size={16} className="text-blue-500" />;
      case 'bill':
        return <Receipt size={16} className="text-green-500" />;
      case 'setting':
        return <Settings size={16} className="text-purple-500" />;
      case 'system':
        return <Monitor size={16} className="text-gray-500" />;
      default:
        return <Activity size={16} className="text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'text-green-600 bg-green-50';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600 bg-blue-50';
    if (action.includes('delete') || action.includes('remove')) return 'text-red-600 bg-red-50';
    if (action.includes('deactivate')) return 'text-orange-600 bg-orange-50';
    if (action.includes('reactivate')) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '0' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
            Activity Logs
          </h1>
          <p className="text-sm text-gray-600" style={{ fontSize: '14px', color: '#6b7280' }}>
            Track all system activities and changes
          </p>
        </div>
        <Button onClick={loadLogs} disabled={loading}>
          <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <Select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'product', label: 'Products' },
                { value: 'bill', label: 'Bills' },
                { value: 'setting', label: 'Settings' },
                { value: 'system', label: 'System' },
              ]}
              className="w-full sm:w-40"
            />
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card padding="none" style={{ marginBottom: '24px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <div className="text-center">
              <RefreshCw size={48} className="mx-auto mb-4 opacity-50 animate-spin" />
              <p>Loading activity logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Activity size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No activity logs found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(log.entityType)}
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {log.entityType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={log.details}>
                        {log.details}
                      </div>
                      {log.entityId && (
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {log.entityId}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.userId || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, totalCount)} of {totalCount} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <span className="px-3 py-1 text-sm bg-gray-100 rounded">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
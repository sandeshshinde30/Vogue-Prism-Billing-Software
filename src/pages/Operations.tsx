import { useEffect, useState } from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  Zap,
  Send,
  RotateCcw,
  Trash2,
  Phone,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ACCENT = '#22c55e';

interface BillSendJob {
  id: number;
  billId: number;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
  billAmount?: number;
}

interface NetworkStatus {
  isOnline: boolean;
  speed: number;
  latency: number;
  lastChecked: string;
  connectionType: string;
}

export function Operations() {
  const [jobs, setJobs] = useState<BillSendJob[]>([]);
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0, total: 0 });
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'sent' | 'failed' | 'all'>('pending');
  const [retrying, setRetrying] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [jobsData, statsData, networkData] = await Promise.all([
        (window.electronAPI as any).billSend.getAllJobs(),
        (window.electronAPI as any).billSend.getStats(),
        (window.electronAPI as any).network.getStatus(),
      ]);

      setJobs(jobsData || []);
      setStats(statsData || { pending: 0, sent: 0, failed: 0, total: 0 });
      setNetworkStatus(networkData || null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading operations data:', error);
      setLoading(false);
    }
  };

  const handleRetry = async (jobId: number) => {
    setRetrying(jobId);
    try {
      await (window.electronAPI as any).billSend.manualRetry(jobId);
      toast.success('Retry initiated');
      await loadData();
    } catch (error) {
      toast.error('Failed to retry: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setRetrying(null);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    setDeleting(jobId);
    try {
      await (window.electronAPI as any).billSend.deleteJob(jobId);
      toast.success('Job deleted');
      await loadData();
    } catch (error) {
      toast.error('Failed to delete: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  const getFilteredJobs = () => {
    if (activeTab === 'all') return jobs;
    return jobs.filter(job => job.status === activeTab);
  };

  const filteredJobs = getFilteredJobs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return '#22c55e';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={16} />;
      case 'failed':
        return <AlertCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
      default:
        return null;
    }
  };

  const getNetworkQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return '#22c55e';
      case 'good':
        return '#3b82f6';
      case 'fair':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      case 'offline':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" style={{ color: ACCENT, margin: '0 auto 16px' }} size={32} />
          <p style={{ color: '#6b7280' }}>Loading operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send style={{ color: ACCENT }} size={28} />
            Bill Send Operations
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Manage bill sending queue and network status
          </p>
        </div>
        <button
          onClick={loadData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: ACCENT,
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* NETWORK STATUS */}
      {networkStatus && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {networkStatus.isOnline ? (
              <Wifi style={{ color: '#22c55e' }} size={20} />
            ) : (
              <WifiOff style={{ color: '#ef4444' }} size={20} />
            )}
            Network Status
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>Status</p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: networkStatus.isOnline ? '#22c55e' : '#ef4444', margin: 0 }}>
                {networkStatus.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>Speed</p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {networkStatus.speed} Mbps
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>Latency</p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {networkStatus.latency} ms
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>Type</p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {networkStatus.connectionType}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total" value={stats.total} color="#6b7280" />
        <StatCard label="Pending" value={stats.pending} color="#f59e0b" />
        <StatCard label="Sent" value={stats.sent} color="#22c55e" />
        <StatCard label="Failed" value={stats.failed} color="#ef4444" />
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
        {(['pending', 'sent', 'failed', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              borderBottom: activeTab === tab ? `3px solid ${ACCENT}` : 'none',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? '600' : '500',
              color: activeTab === tab ? ACCENT : '#6b7280',
              textTransform: 'capitalize'
            }}
          >
            {tab} ({activeTab === tab ? filteredJobs.length : stats[tab as keyof typeof stats] || 0})
          </button>
        ))}
      </div>

      {/* JOBS LIST */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {filteredJobs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <FileText style={{ color: '#d1d5db', margin: '0 auto 16px' }} size={48} />
            <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
              No {activeTab === 'all' ? 'jobs' : activeTab + ' jobs'} found
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Bill</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Phone</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Attempts</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Created</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>
                      {job.billNumber}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                      {job.customerName}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} />
                      {job.customerPhone}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: getStatusColor(job.status) + '20',
                          color: getStatusColor(job.status),
                        }}
                      >
                        {getStatusIcon(job.status)}
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                      {job.attempts}/2
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                      {new Date(job.createdAt).toLocaleDateString()} {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(job.id)}
                            disabled={retrying === job.id}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: retrying === job.id ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              opacity: retrying === job.id ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <RotateCcw size={12} />
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(job.id)}
                          disabled={deleting === job.id}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: deleting === job.id ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            opacity: deleting === job.id ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ERROR MESSAGES */}
      {filteredJobs.some(job => job.lastError) && (
        <div style={{ marginTop: '24px', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2', padding: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            Error Details
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredJobs
              .filter(job => job.lastError)
              .map((job, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#7f1d1d', padding: '8px', backgroundColor: '#fff7ed', borderRadius: '6px', borderLeft: '3px solid #dc2626' }}>
                  <strong>{job.billNumber}:</strong> {job.lastError}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '16px', textAlign: 'center' }}>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: '700', color: color, margin: 0 }}>{value}</p>
    </div>
  );
}

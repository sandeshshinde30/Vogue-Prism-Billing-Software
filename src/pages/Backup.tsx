import { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Database,
  HardDrive,
  Shield,
  Clock,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Backup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadStats = async () => {
    try {
      const data = await window.electronAPI.getDatabaseStats();
      console.log('Database stats:', data);
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await window.electronAPI.exportBackup();
      if (result.success) {
        toast.success('Backup exported successfully!');
      } else if (!result.cancelled) {
        toast.error(result.error || 'Export failed');
      }
    } catch (error) {
      toast.error('Error exporting backup');
    }
    setExporting(false);
  };

  const handleImport = async () => {
    if (!confirm('Warning: Importing will REPLACE all current data. Are you sure you want to continue?')) {
      return;
    }
    setImporting(true);
    try {
      const result = await window.electronAPI.importBackup();
      if (result.success) {
        toast.success('Backup imported! Please restart the application.');
      } else if (!result.cancelled) {
        toast.error(result.error || 'Import failed');
      }
    } catch (error) {
      toast.error('Error importing backup');
    }
    setImporting(false);
  };

  return (
    <>
      <style>{`
        .backup-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px;
        }
        .backup-header {
          margin-bottom: 32px;
        }
        .backup-title {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .backup-title-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.25);
        }
        .backup-title-icon svg {
          color: #fff;
          width: 24px;
          height: 24px;
        }
        .backup-subtitle {
          font-size: 15px;
          color: #6b7280;
          margin-left: 60px;
        }
        .backup-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }
        @media (max-width: 900px) {
          .backup-grid { grid-template-columns: 1fr; }
        }
        .backup-card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
        }
        .backup-card:hover {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }
        .card-header {
          padding: 24px 28px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .card-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-icon-export {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
        }
        .card-icon-import {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);
        }
        .card-icon svg {
          color: #fff;
          width: 26px;
          height: 26px;
        }
        .card-title {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }
        .card-desc {
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        }
        .card-body {
          padding: 24px 28px;
        }
        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f0fdf4;
          border-radius: 10px;
          border: 1px solid #bbf7d0;
        }
        .feature-item svg {
          color: #059669;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .feature-item span {
          font-size: 14px;
          color: #166534;
          font-weight: 500;
        }
        .warning-box {
          display: flex;
          gap: 14px;
          padding: 16px;
          background: #fffbeb;
          border-radius: 12px;
          border: 1px solid #fde68a;
          margin-bottom: 24px;
        }
        .warning-box svg {
          color: #d97706;
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .warning-title {
          font-size: 14px;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 4px;
        }
        .warning-text {
          font-size: 13px;
          color: #a16207;
          line-height: 1.5;
        }
        .action-btn {
          width: 100%;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s ease;
          border: none;
        }
        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-export {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: #fff;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
        }
        .btn-export:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45);
        }
        .btn-import {
          background: #f8fafc;
          color: #374151;
          border: 2px solid #e5e7eb;
        }
        .btn-import:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #d1d5db;
        }
        .tips-card {
          background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);
          border-radius: 20px;
          padding: 32px;
          color: #fff;
        }
        .tips-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        .tips-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tips-icon svg {
          color: #60a5fa;
          width: 24px;
          height: 24px;
        }
        .tips-title {
          font-size: 20px;
          font-weight: 600;
        }
        .tips-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 4px;
        }
        .tips-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (max-width: 700px) {
          .tips-grid { grid-template-columns: 1fr; }
        }
        .tip-item {
          display: flex;
          gap: 14px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .tip-item-icon {
          width: 40px;
          height: 40px;
          background: rgba(96, 165, 250, 0.15);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tip-item-icon svg {
          color: #60a5fa;
          width: 20px;
          height: 20px;
        }
        .tip-item-title {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }
        .tip-item-desc {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.4;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="backup-container">
        {/* Header */}
        <div className="backup-header">
          <div className="backup-title">
            <div className="backup-title-icon">
              <Shield />
            </div>
            Backup & Restore
          </div>
          <p className="backup-subtitle">
            Protect your business data with secure backups and easy restoration
          </p>
        </div>

        {/* Export & Import Cards */}
        <div className="backup-grid">
          {/* Export Card */}
          <div className="backup-card">
            <div className="card-header">
              <div className="card-icon card-icon-export">
                <Download />
              </div>
              <div>
                <div className="card-title">Export Backup</div>
                <div className="card-desc">Create a complete backup of your data</div>
              </div>
            </div>
            <div className="card-body">
              <div className="feature-list">
                <div className="feature-item">
                  <CheckCircle />
                  <span>All products and inventory data</span>
                </div>
                <div className="feature-item">
                  <CheckCircle />
                  <span>Complete billing history</span>
                </div>
                <div className="feature-item">
                  <CheckCircle />
                  <span>Store settings & configurations</span>
                </div>
                <div className="feature-item">
                  <CheckCircle />
                  <span>Full database structure</span>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="action-btn btn-export"
              >
                {exporting ? (
                  <>
                    <div className="spinner" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>Export Database Backup</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Card */}
          <div className="backup-card">
            <div className="card-header">
              <div className="card-icon card-icon-import">
                <Upload />
              </div>
              <div>
                <div className="card-title">Import / Restore</div>
                <div className="card-desc">Restore from a previous backup</div>
              </div>
            </div>
            <div className="card-body">
              <div className="warning-box">
                <AlertTriangle />
                <div>
                  <div className="warning-title">Important Warning</div>
                  <div className="warning-text">
                    Importing will completely REPLACE all current data including products, 
                    bills, and settings. Export a backup first to preserve current data.
                  </div>
                </div>
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="action-btn btn-import"
              >
                {importing ? (
                  <>
                    <div className="spinner" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    <span>Import Database Backup</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Best Practices Card */}
        <div className="tips-card">
          <div className="tips-header">
            <div className="tips-icon">
              <Database />
            </div>
            <div>
              <div className="tips-title">Backup Best Practices</div>
              <div className="tips-subtitle">Follow these tips to keep your data safe</div>
            </div>
          </div>
          <div className="tips-grid">
            <div className="tip-item">
              <div className="tip-item-icon">
                <Clock />
              </div>
              <div>
                <div className="tip-item-title">Regular Backups</div>
                <div className="tip-item-desc">Export backups weekly to prevent data loss</div>
              </div>
            </div>
            <div className="tip-item">
              <div className="tip-item-icon">
                <FolderOpen />
              </div>
              <div>
                <div className="tip-item-title">External Storage</div>
                <div className="tip-item-desc">Store backups on external drives or cloud</div>
              </div>
            </div>
            <div className="tip-item">
              <div className="tip-item-icon">
                <HardDrive />
              </div>
              <div>
                <div className="tip-item-title">Version Control</div>
                <div className="tip-item-desc">Keep multiple backup versions with dates</div>
              </div>
            </div>
            <div className="tip-item">
              <div className="tip-item-icon">
                <RefreshCw />
              </div>
              <div>
                <div className="tip-item-title">After Import</div>
                <div className="tip-item-desc">Restart the app to load imported data</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

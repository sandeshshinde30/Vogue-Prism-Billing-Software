import { useState } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Database,
  HardDrive,
} from 'lucide-react';
import { Card, Button } from '../components/common';
import toast from 'react-hot-toast';

export function Backup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

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
    if (
      !confirm(
        'Warning: Importing will REPLACE all current data. Are you sure you want to continue?'
      )
    ) {
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
    <div 
      className="main-content space-y-6"
      style={{
        width: '100%',
        maxWidth: 'none',
        margin: '0',
        padding: '0'
      }}
    >
      {/* Header */}
      <div 
        className="page-header"
        style={{
          marginBottom: '24px'
        }}
      >
        <h1 
          className="page-title"
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '4px'
          }}
        >
          Backup & Restore
        </h1>
        <p 
          className="page-subtitle"
          style={{
            fontSize: '14px',
            color: '#6b7280'
          }}
        >
          Protect your data with regular backups
        </p>
      </div>

      {/* Export Section */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex flex-col lg:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
              <Download className="text-green-600" size={32} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Export Backup
            </h2>
            <p className="text-gray-600 mb-4">
              Create a complete backup of your database including all your business data.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-green-900 mb-2">What's included:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                  All products and stock data
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                  All bills and transactions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                  Settings and configurations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                  Complete database structure
                </li>
              </ul>
            </div>
            <Button onClick={handleExport} disabled={exporting} size="lg">
              <Download size={20} className="mr-2" />
              {exporting ? 'Exporting...' : 'Export Database Backup'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Import Section */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex flex-col lg:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Upload className="text-yellow-600" size={32} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Import / Restore
            </h2>
            <p className="text-gray-600 mb-4">
              Restore your data from a previously exported backup file.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-medium text-yellow-900 mb-1">Important Warning</h3>
                  <p className="text-yellow-800 text-sm">
                    Importing will completely REPLACE all current data including products, 
                    bills, and settings. Make sure to export a backup first if you want 
                    to preserve your current data.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleImport}
              disabled={importing}
              size="lg"
            >
              <Upload size={20} className="mr-2" />
              {importing ? 'Importing...' : 'Import Database'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Section */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex flex-col lg:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
              <Database className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Backup Best Practices
            </h2>
            <p className="text-gray-600 mb-4">
              Follow these recommendations to keep your data safe and secure.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <HardDrive size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Regular Backups</h4>
                    <p className="text-gray-600 text-sm">Export backups weekly to prevent data loss</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <HardDrive size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">External Storage</h4>
                    <p className="text-gray-600 text-sm">Store backups on external drives or cloud storage</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <HardDrive size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Version Control</h4>
                    <p className="text-gray-600 text-sm">Keep multiple backup versions with dates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <HardDrive size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">After Import</h4>
                    <p className="text-gray-600 text-sm">Restart the application to load new data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

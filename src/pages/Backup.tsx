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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>

      {/* Export Section */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <Download className="text-green-600" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Export Backup
            </h2>
            <p className="text-gray-600 mb-4">
              Create a complete backup of your database including:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                All products and stock data
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                All bills and transactions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                Settings and configurations
              </li>
            </ul>
            <Button onClick={handleExport} disabled={exporting}>
              <Download size={18} className="mr-2" />
              {exporting ? 'Exporting...' : 'Export Database Backup'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Import Section */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Upload className="text-yellow-600" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Import / Restore
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-yellow-800 font-medium">Warning</p>
                  <p className="text-yellow-700 text-sm">
                    Importing will REPLACE all current data. Make sure to export
                    a backup first.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleImport}
              disabled={importing}
            >
              <Upload size={18} className="mr-2" />
              {importing ? 'Importing...' : 'Import Database'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Section */}
      <Card className="p-6 bg-gray-50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gray-200 rounded-lg">
            <Database className="text-gray-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Backup Tips
            </h2>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <HardDrive size={16} className="text-gray-400 mt-0.5" />
                <span>
                  Export backups regularly (recommended: weekly) to prevent data
                  loss
                </span>
              </li>
              <li className="flex items-start gap-2">
                <HardDrive size={16} className="text-gray-400 mt-0.5" />
                <span>
                  Store backups on an external drive or cloud storage for safety
                </span>
              </li>
              <li className="flex items-start gap-2">
                <HardDrive size={16} className="text-gray-400 mt-0.5" />
                <span>
                  Keep multiple backup versions with dates in the filename
                </span>
              </li>
              <li className="flex items-start gap-2">
                <HardDrive size={16} className="text-gray-400 mt-0.5" />
                <span>
                  After importing, restart the application to load the new data
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

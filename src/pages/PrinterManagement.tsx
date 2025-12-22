import { useEffect, useState } from 'react';
import { 
  Printer, 
  RefreshCw, 
  TestTube, 
  Settings as SettingsIcon, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wifi,
  Usb,
  Monitor
} from 'lucide-react';
import { Card, Button, Select } from '../components/common';
import type { PrinterInfo, PrinterSettings } from '../types';
import toast from 'react-hot-toast';

export function PrinterManagement() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    selectedPrinter: '',
    paperWidth: '80mm',
    autoPrint: false,
    printDensity: 'medium',
    cutPaper: true,
    printSpeed: 'medium',
    encoding: 'utf8'
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'printers' | 'settings'>('printers');

  useEffect(() => {
    loadPrinters();
    loadPrinterSettings();
  }, []);

  const loadPrinters = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getPrinters();
      setPrinters(data);
    } catch (error) {
      toast.error('Error loading printers');
      console.error('Error loading printers:', error);
    }
    setLoading(false);
  };

  const loadPrinterSettings = async () => {
    try {
      const settings = await window.electronAPI.getPrinterSettings();
      setPrinterSettings(settings);
    } catch (error) {
      console.error('Error loading printer settings:', error);
    }
  };

  const refreshPrinters = async () => {
    setRefreshing(true);
    try {
      const data = await window.electronAPI.refreshPrinters();
      setPrinters(data);
      toast.success('Printer list refreshed');
    } catch (error) {
      toast.error('Error refreshing printers');
    }
    setRefreshing(false);
  };

  const testPrint = async (printerName: string) => {
    setTestingPrinter(printerName);
    try {
      // Use the thermal printer utility for better formatting
      const { printTestReceipt } = await import('../utils/thermalPrinter');
      const result = await printTestReceipt(printerName);
      
      if (result.success) {
        toast.success(`Test print sent to ${printerName}`);
      } else {
        toast.error(result.error || 'Test print failed');
      }
    } catch (error) {
      toast.error('Error sending test print');
    }
    setTestingPrinter(null);
  };

  const savePrinterSettings = async () => {
    try {
      const result = await window.electronAPI.setPrinterSettings(printerSettings);
      if (result.success) {
        toast.success('Printer settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Error saving printer settings');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'printing':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'offline':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getLocationIcon = (location: string, isNetworkPrinter: boolean) => {
    if (isNetworkPrinter) return <Wifi className="w-4 h-4 text-blue-500" />;
    if (location === 'USB') return <Usb className="w-4 h-4 text-green-500" />;
    return <Monitor className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'text-green-600 bg-green-50';
      case 'printing': return 'text-yellow-600 bg-yellow-50';
      case 'offline':
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="main-content space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Printer Management</h1>
          <p className="text-gray-600 mt-1">Configure and manage your thermal printers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {printers.length} printer{printers.length !== 1 ? 's' : ''} detected
          </div>
          <Button
            onClick={refreshPrinters}
            disabled={refreshing}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Printers'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('printers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'printers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Available Printers
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Printer Settings
            </div>
          </button>
        </nav>
      </div>

      {/* Printers Tab */}
      {activeTab === 'printers' && (
        <div className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading printers...</p>
            </Card>
          ) : printers.length === 0 ? (
            <Card className="p-8 text-center">
              <Printer className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Printers Found</h3>
              <p className="text-gray-600 mb-4">
                No printers are currently available. Make sure your printer is connected and drivers are installed.
              </p>
              <Button onClick={refreshPrinters} className="flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" />
                Refresh Printers
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {printers.map((printer) => (
                <Card key={printer.name} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getLocationIcon(printer.location, printer.isNetworkPrinter)}
                          <h3 className="text-lg font-semibold text-gray-900">
                            {printer.displayName}
                          </h3>
                        </div>
                        {printer.isDefault && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Default
                          </span>
                        )}
                        <div className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(printer.status)}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(printer.status)}
                            {printer.status.charAt(0).toUpperCase() + printer.status.slice(1)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Name:</span>
                          <p>{printer.name}</p>
                        </div>
                        <div>
                          <span className="font-medium">Location:</span>
                          <p>{printer.location}</p>
                        </div>
                        <div>
                          <span className="font-medium">Paper Size:</span>
                          <p>{printer.paperSize}</p>
                        </div>
                        <div>
                          <span className="font-medium">Type:</span>
                          <p>{printer.isNetworkPrinter ? 'Network' : 'Local'}</p>
                        </div>
                      </div>
                      
                      {printer.description && (
                        <p className="text-sm text-gray-600 mt-2">{printer.description}</p>
                      )}
                      
                      {printer.makeModel && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Model:</span> {printer.makeModel}
                        </p>
                      )}
                      
                      {printer.deviceUri && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Device URI:</span> {printer.deviceUri}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => testPrint(printer.name)}
                        disabled={testingPrinter === printer.name}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <TestTube className="w-4 h-4" />
                        {testingPrinter === printer.name ? 'Testing...' : 'Test Print'}
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setPrinterSettings(prev => ({ ...prev, selectedPrinter: printer.name }));
                          setActiveTab('settings');
                        }}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <SettingsIcon className="w-4 h-4" />
                        Configure
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Printer Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Printer
                </label>
                <Select
                  value={printerSettings.selectedPrinter}
                  onChange={(e) => setPrinterSettings(prev => ({ ...prev, selectedPrinter: e.target.value }))}
                  options={[
                    { value: '', label: 'Select a printer...' },
                    ...printers.map(printer => ({
                      value: printer.name,
                      label: `${printer.displayName} ${printer.isDefault ? '(Default)' : ''}`
                    }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paper Width
                </label>
                <Select
                  value={printerSettings.paperWidth}
                  onChange={(e) => setPrinterSettings(prev => ({ ...prev, paperWidth: e.target.value as '58mm' | '80mm' }))}
                  options={[
                    { value: '58mm', label: '58mm (Small Thermal)' },
                    { value: '80mm', label: '80mm (Standard Thermal)' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Print Density
                </label>
                <Select
                  value={printerSettings.printDensity}
                  onChange={(e) => setPrinterSettings(prev => ({ ...prev, printDensity: e.target.value as 'light' | 'medium' | 'dark' }))}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'dark', label: 'Dark' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Print Speed
                </label>
                <Select
                  value={printerSettings.printSpeed}
                  onChange={(e) => setPrinterSettings(prev => ({ ...prev, printSpeed: e.target.value as 'slow' | 'medium' | 'fast' }))}
                  options={[
                    { value: 'slow', label: 'Slow (High Quality)' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'fast', label: 'Fast' }
                  ]}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Character Encoding
                </label>
                <Select
                  value={printerSettings.encoding}
                  onChange={(e) => setPrinterSettings(prev => ({ ...prev, encoding: e.target.value as 'utf8' | 'gb18030' | 'big5' }))}
                  options={[
                    { value: 'utf8', label: 'UTF-8 (Unicode)' },
                    { value: 'gb18030', label: 'GB18030 (Chinese)' },
                    { value: 'big5', label: 'Big5 (Traditional Chinese)' }
                  ]}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoPrint"
                    checked={printerSettings.autoPrint}
                    onChange={(e) => setPrinterSettings(prev => ({ ...prev, autoPrint: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoPrint" className="ml-2 block text-sm text-gray-900">
                    Auto-print receipts after bill creation
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="cutPaper"
                    checked={printerSettings.cutPaper}
                    onChange={(e) => setPrinterSettings(prev => ({ ...prev, cutPaper: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="cutPaper" className="ml-2 block text-sm text-gray-900">
                    Auto-cut paper after printing
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Button
                  onClick={savePrinterSettings}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Save Printer Settings
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
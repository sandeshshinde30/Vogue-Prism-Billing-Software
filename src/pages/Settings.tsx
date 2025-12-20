import { useEffect, useState } from 'react';
import { Save, Printer, TestTube, Package, Receipt } from 'lucide-react';
import { Card, Button, Input, Select } from '../components/common';
import { useStore } from '../store/useStore';
import type { Settings as SettingsType } from '../types';
import toast from 'react-hot-toast';

export function Settings() {
  const { setSettings } = useStore();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [printers, setPrinters] = useState<{ name: string; isDefault: boolean }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadPrinters();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await window.electronAPI.getSettings();
      setFormData(data);
      setSettings(data as unknown as SettingsType);
    } catch (error) {
      toast.error('Error loading settings');
    }
  };

  const loadPrinters = async () => {
    try {
      const data = await window.electronAPI.getPrinters();
      setPrinters(data);
    } catch (error) {
      console.error('Error loading printers:', error);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await window.electronAPI.updateAllSettings(formData);
      setSettings(formData as unknown as SettingsType);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Error saving settings');
    }
    setSaving(false);
  };

  const handleTestPrint = async () => {
    try {
      const testContent = `
        <html>
        <body style="font-family: monospace; text-align: center; padding: 20px;">
          <h2>${formData.storeName || 'Vogue Prism'}</h2>
          <p>Test Print</p>
          <p>${new Date().toLocaleString()}</p>
          <p>If you can read this, your printer is working!</p>
        </body>
        </html>
      `;
      await window.electronAPI.print(testContent, formData.printerName);
      toast.success('Test print sent');
    } catch (error) {
      toast.error('Error sending test print');
    }
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
        className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          marginBottom: '24px'
        }}
      >
        <div>
          <h1 
            className="page-title"
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '4px'
            }}
          >
            Settings
          </h1>
          <p 
            className="page-subtitle"
            style={{
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            Configure your store and application preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save size={20} className="mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Store Information */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Store Information</h2>
            <p className="text-sm text-gray-600">Basic details about your business</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Store Name"
              value={formData.storeName || ''}
              onChange={(e) => handleChange('storeName', e.target.value)}
              placeholder="Enter your store name"
            />
            <Input
              label="Address Line 1"
              value={formData.addressLine1 || ''}
              onChange={(e) => handleChange('addressLine1', e.target.value)}
              placeholder="Street address"
            />
            <Input
              label="Address Line 2"
              value={formData.addressLine2 || ''}
              onChange={(e) => handleChange('addressLine2', e.target.value)}
              placeholder="City, State, PIN"
            />
          </div>
          <div className="space-y-4">
            <Input
              label="Phone Number"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Contact number"
            />
            <Input
              label="GST Number"
              value={formData.gstNumber || ''}
              onChange={(e) => handleChange('gstNumber', e.target.value)}
              placeholder="GST registration number"
            />
          </div>
        </div>
      </Card>

      {/* Billing Settings */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Receipt size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Billing Settings</h2>
            <p className="text-sm text-gray-600">Configure billing and invoice preferences</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Bill Number Prefix"
              value={formData.billPrefix || ''}
              onChange={(e) => handleChange('billPrefix', e.target.value)}
              placeholder="e.g., VP, INV"
            />
            <Input
              label="Starting Bill Number"
              type="number"
              value={formData.startingBillNumber || ''}
              onChange={(e) => handleChange('startingBillNumber', e.target.value)}
              placeholder="1"
              min="1"
            />
          </div>
          <div className="space-y-4">
            <Input
              label="Max Discount Allowed (%)"
              type="number"
              value={formData.maxDiscountPercent || ''}
              onChange={(e) => handleChange('maxDiscountPercent', e.target.value)}
              placeholder="10"
              min="0"
              max="100"
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              value={formData.lowStockThreshold || ''}
              onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
              placeholder="5"
              min="0"
            />
          </div>
        </div>
      </Card>

      {/* Printer Settings */}
      <Card style={{ marginBottom: '24px' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Printer size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Printer Settings</h2>
              <p className="text-sm text-gray-600">Configure receipt printing options</p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleTestPrint}>
            <TestTube size={18} className="mr-2" />
            Test Print
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Select
              label="Printer"
              value={formData.printerName || ''}
              onChange={(e) => handleChange('printerName', e.target.value)}
              options={[
                { value: '', label: 'Default Printer' },
                ...printers.map((p) => ({
                  value: p.name,
                  label: p.name + (p.isDefault ? ' (Default)' : ''),
                })),
              ]}
            />
            <Select
              label="Paper Width"
              value={formData.paperWidth || '58mm'}
              onChange={(e) => handleChange('paperWidth', e.target.value)}
              options={[
                { value: '58mm', label: '58mm (Thermal)' },
                { value: '80mm', label: '80mm (Thermal)' },
              ]}
            />
          </div>
          <div className="flex items-center justify-center">
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Printer size={24} className="text-gray-500" />
              </div>
              <label className="flex items-center justify-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoPrint === 'true'}
                  onChange={(e) =>
                    handleChange('autoPrint', e.target.checked ? 'true' : 'false')
                  }
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Auto-print receipt on bill save
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Automatically print receipts when bills are saved
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

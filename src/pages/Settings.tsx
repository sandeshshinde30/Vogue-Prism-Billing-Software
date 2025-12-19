import { useEffect, useState } from 'react';
import { Save, Printer, TestTube } from 'lucide-react';
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Store Information */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Store Information
        </h2>
        <div className="space-y-4">
          <Input
            label="Store Name"
            value={formData.storeName || ''}
            onChange={(e) => handleChange('storeName', e.target.value)}
          />
          <Input
            label="Address Line 1"
            value={formData.addressLine1 || ''}
            onChange={(e) => handleChange('addressLine1', e.target.value)}
          />
          <Input
            label="Address Line 2"
            value={formData.addressLine2 || ''}
            onChange={(e) => handleChange('addressLine2', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
            <Input
              label="GST Number"
              value={formData.gstNumber || ''}
              onChange={(e) => handleChange('gstNumber', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Billing Settings */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Billing Settings
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bill Number Prefix"
              value={formData.billPrefix || ''}
              onChange={(e) => handleChange('billPrefix', e.target.value)}
            />
            <Input
              label="Starting Bill Number"
              type="number"
              value={formData.startingBillNumber || ''}
              onChange={(e) => handleChange('startingBillNumber', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Discount Allowed (%)"
              type="number"
              value={formData.maxDiscountPercent || ''}
              onChange={(e) => handleChange('maxDiscountPercent', e.target.value)}
              min="0"
              max="100"
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              value={formData.lowStockThreshold || ''}
              onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
              min="0"
            />
          </div>
        </div>
      </Card>

      {/* Printer Settings */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Printer size={20} />
          Printer Settings
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoPrint === 'true'}
                onChange={(e) =>
                  handleChange('autoPrint', e.target.checked ? 'true' : 'false')
                }
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                Auto-print receipt on bill save
              </span>
            </label>
            <Button variant="secondary" onClick={handleTestPrint}>
              <TestTube size={18} className="mr-2" />
              Test Print
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

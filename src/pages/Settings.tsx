import { useEffect, useState } from 'react';
import { Save, Printer, Package, Receipt } from 'lucide-react';
import { Card, Button, Input } from '../components/common';
import { useStore } from '../store/useStore';
import type { Settings as SettingsType } from '../types';
import toast from 'react-hot-toast';

export function Settings() {
  const { setSettings } = useStore();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
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
              <p className="text-sm text-gray-600">Manage and configure your printers</p>
            </div>
          </div>
        </div>
        <div className="text-center py-8">
          <Printer className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Printer Management</h3>
          <p className="text-gray-600 mb-6">
            Configure printers, test printing, and manage print settings in the dedicated Printer Management section.
          </p>
          <Button 
            onClick={() => window.location.hash = '#/printer-management'}
            className="flex items-center gap-2 mx-auto"
          >
            <Printer className="w-4 h-4" />
            Open Printer Management
          </Button>
        </div>
      </Card>
    </div>
  );
}

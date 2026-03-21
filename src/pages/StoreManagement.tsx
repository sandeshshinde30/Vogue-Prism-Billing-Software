import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Store as StoreIcon
} from 'lucide-react';
import { StoreProvider } from '../contexts/StoreContext';
import { StoreDashboard } from '../components/store/StoreDashboard';
import { StoreAnalytics } from '../components/store/StoreAnalytics';
import { StoreForecast } from '../components/store/StoreForecast';
import { StoreBillManagement } from '../components/store/StoreBillManagement';
import { StoreReports } from '../components/store/StoreReports';
import { StoreSettings } from '../components/store/StoreSettings';

type StoreTab = 'dashboard' | 'analytics' | 'forecast' | 'bills' | 'reports' | 'settings';

export function StoreManagement() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<StoreTab>('dashboard');

  // Determine active tab from URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/store-management' || path === '/store-management/') {
      setActiveTab('dashboard');
    } else if (path.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (path.includes('/forecast')) {
      setActiveTab('forecast');
    } else if (path.includes('/bills')) {
      setActiveTab('bills');
    } else if (path.includes('/reports')) {
      setActiveTab('reports');
    } else if (path.includes('/settings')) {
      setActiveTab('settings');
    }
  }, [location.pathname]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <StoreDashboard />;
      case 'analytics':
        return <StoreAnalytics />;
      case 'forecast':
        return <StoreForecast />;
      case 'bills':
        return <StoreBillManagement />;
      case 'reports':
        return <StoreReports />;
      case 'settings':
        return <StoreSettings />;
      default:
        return <StoreDashboard />;
    }
  };

  return (
    <StoreProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <StoreIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
              <p className="text-gray-600">Manage and analyze data across all stores</p>
            </div>
          </div>
        </div>

        {/* Store Selector - Only show in settings tab */}
        {activeTab === 'settings' && (
          <div className="p-6 pb-0">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-sm">
                <strong>Store Selection & Data Control:</strong> Configure store selection and manage data synchronization from this settings page.
              </p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 pt-6">
          {renderTabContent()}
        </div>
      </div>
    </StoreProvider>
  );
}
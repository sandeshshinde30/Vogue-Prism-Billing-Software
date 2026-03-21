import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  FileBarChart,
  Activity,
  Database,
  Settings,
  FileEdit,
  Printer,
  Trash2,
  BarChart3,
  Layers,
  TrendingUp,
  Wifi,
  Store,
  ChevronDown,
  ChevronRight,
  Banknote,
} from 'lucide-react';
import { getLogoPath } from '../../utils/assetPath';

export function Sidebar() {
  const [config, setConfig] = useState<any>(null);
  const [storeManagementExpanded, setStoreManagementExpanded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.electronAPI.config.getAppConfig().then(setConfig);
  }, []);

  // Auto-expand store management if we're on any store management route
  useEffect(() => {
    if (location.pathname.startsWith('/store-management')) {
      setStoreManagementExpanded(true);
    }
  }, [location.pathname]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { to: '/billing', icon: ShoppingCart, label: 'Billing', show: true },
    { to: '/combos', icon: Layers, label: 'Combos', show: config?.ui?.showCombosTab ?? true },
    { to: '/products', icon: Package, label: 'Products', show: true },
    { to: '/stock', icon: Boxes, label: 'Stock', show: true },
    { to: '/bill-management', icon: FileEdit, label: 'Bill Management', show: true },
    { to: '/cash-upi-tracking', icon: Banknote, label: 'Cash/UPI Tracking', show: config?.ui?.showCashUpiTrackingTab ?? true },
    { to: '/reports', icon: FileBarChart, label: 'Reports', show: true },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', show: config?.ui?.showAnalyticsTab ?? true },
    { to: '/forecast', icon: TrendingUp, label: 'Forecast', show: config?.ui?.showForecastTab ?? true },
    { to: '/deleted-bills', icon: Trash2, label: 'Deleted Bills', show: config?.ui?.showDeletedBillsTab ?? true },
    { to: '/logs', icon: Activity, label: 'Logs', show: true },
    { to: '/db-sync', icon: Wifi, label: 'DB Sync', show: config?.ui?.showDBSyncTab ?? true },
    { to: '/printer-management', icon: Printer, label: 'Printer', show: true },
    { to: '/backup', icon: Database, label: 'Backup', show: true },
    { to: '/settings', icon: Settings, label: 'Settings', show: true },
  ];

  const storeManagementSubItems = [
    { to: '/store-management', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/store-management/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/store-management/forecast', icon: TrendingUp, label: 'Forecast' },
    { to: '/store-management/bills', icon: FileEdit, label: 'Bill Management' },
    { to: '/store-management/reports', icon: FileBarChart, label: 'Reports' },
    { to: '/store-management/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-60 bg-gray-900 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b border-gray-800"
      style={
        {
          padding : '25px'
        }
      }>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden bg-white">
            <img 
              src={getLogoPath()} 
              alt="Vogue Prism Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm">
              {config?.storeName || 'Vogue Prism'}
            </h1>
            <p className="text-xs text-gray-500">
              Billing Software
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-1"
        style={{
          padding : '5px'
        }}
        >
          {navItems.filter(item => item.show).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
              style={{
                padding : '12px 8px',
                margin : '2px'
              }}
            >
              <item.icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Store Management Collapsible Section */}
          {(config?.ui?.showStoreManagementTab ?? true) && (
            <div className="mt-2">
              <button
                onClick={() => setStoreManagementExpanded(!storeManagementExpanded)}
                className={`w-full flex items-center justify-between gap-2 h-10 px-2 rounded-lg text-sm font-medium transition-colors ${
                  // Only highlight parent when collapsed and on exact store management route
                  !storeManagementExpanded && location.pathname === '/store-management'
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
                style={{
                  padding: '12px 8px',
                  margin: '2px'
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Store size={18} strokeWidth={1.8} className="flex-shrink-0" />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">Store Management</span>
                </div>
                {storeManagementExpanded ? (
                  <ChevronDown size={16} className="flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="flex-shrink-0" />
                )}
              </button>

              {/* Store Management Sub-items */}
              {storeManagementExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {storeManagementSubItems.map((subItem) => (
                    <NavLink
                      key={subItem.to}
                      to={subItem.to}
                      end={subItem.to === '/store-management'}
                      className={({ isActive }) =>
                        `flex items-center gap-2 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-green-500/15 text-green-400'
                            : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                        }`
                      }
                      style={{
                        padding: '10px 6px',
                        margin: '2px'
                      }}
                    >
                      <subItem.icon size={16} strokeWidth={1.8} />
                      <span>{subItem.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="h-12 px-5 flex items-center border-t border-gray-800">
        <span className="text-xs text-gray-600">v1.0.0</span>
      </div>
    </aside>
  );
}
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { getLogoPath } from '../../utils/assetPath';

export function Sidebar() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    window.electronAPI.config.getAppConfig().then(setConfig);
  }, []);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { to: '/billing', icon: ShoppingCart, label: 'Billing', show: true },
    { to: '/combos', icon: Layers, label: 'Combos', show: config?.ui?.showCombosTab ?? true },
    { to: '/products', icon: Package, label: 'Products', show: true },
    { to: '/stock', icon: Boxes, label: 'Stock', show: true },
    { to: '/bill-management', icon: FileEdit, label: 'Bill Management', show: true },
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
      <nav className="flex-1 py-4 px-3">
        <div className="space-y-1"
        style={{
          padding : '10px'
        }}
        >
          {navItems.filter(item => item.show).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
              style={{
                padding : '16px',
                margin : '5px'
              }}
            >
              <item.icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="h-12 px-5 flex items-center border-t border-gray-800">
        <span className="text-xs text-gray-600">v1.0.0</span>
      </div>
    </aside>
  );
}
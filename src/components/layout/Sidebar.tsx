import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { getLogoPath } from '../../utils/assetPath';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/billing', icon: ShoppingCart, label: 'Billing' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/stock', icon: Boxes, label: 'Stock' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/logs', icon: Activity, label: 'Logs' },
  { to: '/bill-management', icon: FileEdit, label: 'Bill Management' },
  { to: '/printer-management', icon: Printer, label: 'Printer Management' },
  { to: '/backup', icon: Database, label: 'Backup' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
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
              Vogue Prism
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
          {navItems.map((item) => (
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
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  FileBarChart,
  Database,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/billing', icon: ShoppingCart, label: 'Billing' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/stock', icon: Boxes, label: 'Stock' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/backup', icon: Database, label: 'Backup' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">VP</span>
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm">Vogue Prism</h1>
            <p className="text-[11px] text-slate-500">Billing Software</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-3 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <item.icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="h-12 px-5 flex items-center border-t border-slate-800">
        <span className="text-[11px] text-slate-600">v1.0.0</span>
      </div>
    </aside>
  );
}

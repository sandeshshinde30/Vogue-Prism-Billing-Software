import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'info';
}

export function StatCard({ title, value, icon, variant = 'default' }: StatCardProps) {
  const styles = {
    default: { bg: 'bg-green-50', text: 'text-green-600' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600' },
    danger: { bg: 'bg-red-50', text: 'text-red-600' },
    info: { bg: 'bg-blue-50', text: 'text-blue-600' },
  };

  const style = styles[variant];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
        </div>
        <div className={`w-10 h-10 ${style.bg} ${style.text} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

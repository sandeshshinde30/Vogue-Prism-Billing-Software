import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'info';
}

export function StatCard({ title, value, icon, variant = 'default' }: StatCardProps) {
  const styles = {
    default: { bg: '#f0fdf4', text: '#16a34a' },
    warning: { bg: '#fffbeb', text: '#d97706' },
    danger: { bg: '#fef2f2', text: '#dc2626' },
    info: { bg: '#eff6ff', text: '#2563eb' },
  };

  const style = styles[variant];

  return (
    <div 
      className="bg-white border border-slate-200 rounded-xl p-5"
      style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease'
      }}
    >
      <div 
        className="flex items-start justify-between"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <div>
          <p 
            className="text-xs font-medium text-slate-500 uppercase tracking-wide"
            style={{ 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#64748b', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}
          >
            {title}
          </p>
          <p 
            className="mt-2 text-2xl font-semibold text-slate-800"
            style={{ 
              marginTop: '8px', 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#1e293b',
              lineHeight: '1.2'
            }}
          >
            {value}
          </p>
        </div>
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: style.bg,
            color: style.text,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', style, ...props }: SelectProps) {
  return (
    <div className="w-full" style={{ width: '100%' }}>
      {label && (
        <label 
          className="block text-xs font-medium text-slate-600 mb-1.5"
          style={{ 
            display: 'block',
            fontSize: '12px', 
            fontWeight: '500', 
            color: '#475569', 
            marginBottom: '6px' 
          }}
        >
          {label}
        </label>
      )}
      <select
        className={`w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        style={{
          width: '100%',
          height: '40px',
          padding: '0 12px',
          fontSize: '14px',
          backgroundColor: props.disabled ? '#f8fafc' : 'white',
          border: `1px solid ${error ? '#f87171' : '#e2e8f0'}`,
          borderRadius: '8px',
          color: props.disabled ? '#94a3b8' : '#1e293b',
          outline: 'none',
          transition: 'all 0.2s ease',
          ...style
        }}
        onFocus={(e) => {
          if (!props.disabled) {
            e.target.style.borderColor = error ? '#ef4444' : '#22c55e';
            e.target.style.boxShadow = `0 0 0 1px ${error ? '#ef4444' : '#22c55e'}`;
          }
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#f87171' : '#e2e8f0';
          e.target.style.boxShadow = 'none';
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && (
        <p 
          className="mt-1 text-xs text-red-500"
          style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
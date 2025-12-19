import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, className = '', style, ...props },
  ref
) {
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
      <div className="relative" style={{ position: 'relative' }}>
        {icon && (
          <div 
            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
            style={{
              position: 'absolute',
              top: '0',
              bottom: '0',
              left: '0',
              paddingLeft: '12px',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: '#94a3b8'
            }}
          >
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:bg-slate-50 disabled:text-slate-400 ${icon ? 'pl-10' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
          style={{
            width: '100%',
            height: '40px',
            padding: icon ? '0 12px 0 40px' : '0 12px',
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
        />
      </div>
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
});
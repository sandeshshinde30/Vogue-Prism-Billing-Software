import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg
            placeholder:text-slate-400
            focus:border-green-500 focus:ring-1 focus:ring-green-500
            disabled:bg-slate-50 disabled:text-slate-400
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

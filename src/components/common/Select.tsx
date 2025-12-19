import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      )}
      <select
        className={`
          w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg
          focus:border-green-500 focus:ring-1 focus:ring-green-500
          disabled:bg-slate-50 disabled:text-slate-400
          ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

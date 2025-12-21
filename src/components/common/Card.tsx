import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Card({ children, className = '', padding = 'md', style }: CardProps) {
  const paddingStyles = {
    none: { padding: '0' },
    sm: { padding: '16px' },
    md: { padding: '20px' },
    lg: { padding: '24px' },
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div 
      className={`bg-white border border-slate-200 rounded-xl ${paddingClasses[padding]} ${className}`}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        ...paddingStyles[padding],
        ...style
      }}
    >
      {children}
    </div>
  );
}
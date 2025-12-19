import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const variants = {
    primary: { bg: '#22c55e', hoverBg: '#16a34a', color: 'white' },
    secondary: { bg: '#f1f5f9', hoverBg: '#e2e8f0', color: '#475569' },
    danger: { bg: '#ef4444', hoverBg: '#dc2626', color: 'white' },
    ghost: { bg: 'transparent', hoverBg: '#f1f5f9', color: '#475569' },
  };

  const sizes = {
    sm: { height: '32px', padding: '0 12px', fontSize: '12px' },
    md: { height: '36px', padding: '0 16px', fontSize: '14px' },
    lg: { height: '40px', padding: '0 20px', fontSize: '14px' },
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '500',
        borderRadius: '8px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled ? '0.5' : '1',
        backgroundColor: variantStyle.bg,
        color: variantStyle.color,
        ...sizeStyle,
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.bg;
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
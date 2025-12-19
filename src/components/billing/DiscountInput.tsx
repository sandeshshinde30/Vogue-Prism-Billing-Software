import React from 'react';
import { Percent, IndianRupee } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function DiscountInput() {
  const {
    discountPercent,
    discountAmount,
    setDiscountPercent,
    setDiscountAmount,
    getSubtotal,
    settings,
  } = useStore();

  const subtotal = getSubtotal();
  const maxDiscount = settings?.maxDiscountPercent || 30;

  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(0, parseFloat(e.target.value) || 0), maxDiscount);
    setDiscountPercent(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(0, parseFloat(e.target.value) || 0), subtotal);
    setDiscountAmount(value);
  };

  return (
    <div>
      <p 
        className="text-xs font-medium text-slate-500 mb-2"
        style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}
      >
        Discount (max {maxDiscount}%)
      </p>
      <div 
        className="flex items-center gap-2"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <div 
          className="flex-1 relative"
          style={{ flex: '1', position: 'relative' }}
        >
          <Percent 
            size={14} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none'
            }}
          />
          <input
            type="number"
            value={discountPercent || ''}
            onChange={handlePercentChange}
            placeholder="0"
            min="0"
            max={maxDiscount}
            step="0.5"
            className="w-full h-9 pl-8 pr-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
            style={{
              width: '100%',
              height: '36px',
              paddingLeft: '32px',
              paddingRight: '12px',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono, monospace',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#22c55e';
              e.target.style.boxShadow = '0 0 0 1px #22c55e';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <span 
          className="text-xs text-slate-400"
          style={{ fontSize: '12px', color: '#94a3b8' }}
        >
          or
        </span>
        <div 
          className="flex-1 relative"
          style={{ flex: '1', position: 'relative' }}
        >
          <IndianRupee 
            size={14} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none'
            }}
          />
          <input
            type="number"
            value={discountAmount || ''}
            onChange={handleAmountChange}
            placeholder="0"
            min="0"
            max={subtotal}
            step="1"
            className="w-full h-9 pl-8 pr-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
            style={{
              width: '100%',
              height: '36px',
              paddingLeft: '32px',
              paddingRight: '12px',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono, monospace',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#22c55e';
              e.target.style.boxShadow = '0 0 0 1px #22c55e';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
}
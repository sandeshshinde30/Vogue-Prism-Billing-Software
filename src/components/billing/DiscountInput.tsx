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
      <p className="text-xs font-medium text-slate-500 mb-2">Discount (max {maxDiscount}%)</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="number"
            value={discountPercent || ''}
            onChange={handlePercentChange}
            placeholder="0"
            min="0"
            max={maxDiscount}
            step="0.5"
            className="w-full h-9 pl-8 pr-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
          />
        </div>
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 relative">
          <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="number"
            value={discountAmount || ''}
            onChange={handleAmountChange}
            placeholder="0"
            min="0"
            max={subtotal}
            step="1"
            className="w-full h-9 pl-8 pr-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

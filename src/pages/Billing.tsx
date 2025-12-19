import { useEffect } from 'react';
import { Card } from '../components/common';
import {
  BarcodeInput,
  CategoryButtons,
  ProductSearch,
  Cart,
  PaymentPanel,
} from '../components/billing';
import { useStore } from '../store/useStore';
import { ShoppingCart, Keyboard } from 'lucide-react';

export function Billing() {
  const { clearCart, setSearchQuery, setSelectedCategory } = useStore();

  useEffect(() => {
    setSearchQuery('');
    setSelectedCategory(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearCart();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearCart]);

  return (
    <div className="h-full flex gap-5">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col" padding="none">
          {/* Header */}
          <div className="h-14 px-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <ShoppingCart size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">New Bill</h2>
                <p className="text-xs text-slate-400">Add products to cart</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Keyboard size={14} />
              <span>F2: Search</span>
              <span className="text-slate-300">•</span>
              <span>F8: Payment</span>
              <span className="text-slate-300">•</span>
              <span>F12: Pay</span>
              <span className="text-slate-300">•</span>
              <span>Esc: Cancel</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            <BarcodeInput />
            <CategoryButtons />
            <div className="flex-1 overflow-hidden mt-4">
              <ProductSearch />
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[400px] flex flex-col">
        <Card className="flex-1 flex flex-col" padding="none">
          {/* Header */}
          <div className="h-14 px-5 flex items-center border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Cart</h2>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-hidden p-4">
            <Cart />
          </div>

          {/* Payment */}
          <div className="border-t border-slate-100 p-4">
            <PaymentPanel />
          </div>
        </Card>
      </div>
    </div>
  );
}

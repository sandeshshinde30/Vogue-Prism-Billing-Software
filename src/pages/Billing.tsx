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
  }, [setSearchQuery, setSelectedCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearCart();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearCart]);

  return (
    <div className="h-full flex gap-6" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Left Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card padding="none" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="h-14 px-6 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <ShoppingCart size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">New Bill</h2>
                <p className="text-xs text-gray-500">Add products to cart</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Keyboard size={14} />
              <span>F2: Search</span>
              <span className="text-gray-300">•</span>
              <span>F8: Payment</span>
              <span className="text-gray-300">•</span>
              <span>F12: Pay</span>
              <span className="text-gray-300">•</span>
              <span>Esc: Cancel</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
            <BarcodeInput />
            <CategoryButtons />
            <div className="flex-1 overflow-hidden mt-4 min-h-0">
              <ProductSearch />
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[400px] flex flex-col">
        <Card padding="none" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="h-14 px-6 flex items-center border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <ShoppingCart size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Cart</h2>
                <p className="text-xs text-gray-500">Review & checkout</p>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-hidden p-4 min-h-0">
            <Cart />
          </div>

          {/* Payment */}
          <div className="border-t border-gray-200 p-4 flex-shrink-0">
            <PaymentPanel />
          </div>
        </Card>
      </div>
    </div>
  );
}
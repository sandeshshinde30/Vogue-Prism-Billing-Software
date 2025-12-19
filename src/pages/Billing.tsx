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
    <div 
      className="h-full flex gap-5"
      style={{ 
        height: '100%', 
        display: 'flex', 
        gap: '20px' 
      }}
    >
      {/* Left Panel */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{ 
          flex: '1', 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: '0' 
        }}
      >
        <Card padding="none">
          {/* Header */}
          <div 
            className="h-14 px-5 flex items-center justify-between border-b border-slate-100"
            style={{
              height: '56px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <div 
              className="flex items-center gap-3"
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div 
                className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#22c55e',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShoppingCart size={16} className="text-white" style={{ color: 'white' }} />
              </div>
              <div>
                <h2 
                  className="text-sm font-semibold text-slate-800"
                  style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}
                >
                  New Bill
                </h2>
                <p 
                  className="text-xs text-slate-400"
                  style={{ fontSize: '12px', color: '#94a3b8' }}
                >
                  Add products to cart
                </p>
              </div>
            </div>
            <div 
              className="flex items-center gap-1.5 text-xs text-slate-400"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '11px', 
                color: '#94a3b8' 
              }}
            >
              <Keyboard size={14} />
              <span>F2: Search</span>
              <span className="text-slate-300" style={{ color: '#cbd5e1' }}>•</span>
              <span>F8: Payment</span>
              <span className="text-slate-300" style={{ color: '#cbd5e1' }}>•</span>
              <span>F12: Pay</span>
              <span className="text-slate-300" style={{ color: '#cbd5e1' }}>•</span>
              <span>Esc: Cancel</span>
            </div>
          </div>

          {/* Content */}
          <div 
            className="flex-1 flex flex-col p-5 overflow-hidden"
            style={{
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              overflow: 'hidden'
            }}
          >
            <BarcodeInput />
            <CategoryButtons />
            <div 
              className="flex-1 overflow-hidden mt-4"
              style={{ flex: '1', overflow: 'hidden', marginTop: '16px' }}
            >
              <ProductSearch />
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Cart */}
      <div 
        className="w-[400px] flex flex-col"
        style={{ width: '400px', display: 'flex', flexDirection: 'column' }}
      >
        <Card padding="none">
          {/* Header */}
          <div 
            className="h-14 px-5 flex items-center border-b border-slate-100"
            style={{
              height: '56px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <div 
              className="flex items-center gap-3"
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div 
                className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#a855f7',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShoppingCart size={16} className="text-white" style={{ color: 'white' }} />
              </div>
              <div>
                <h2 
                  className="text-sm font-semibold text-slate-800"
                  style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}
                >
                  Cart
                </h2>
                <p 
                  className="text-xs text-slate-400"
                  style={{ fontSize: '12px', color: '#94a3b8' }}
                >
                  Review & checkout
                </p>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div 
            className="flex-1 overflow-hidden p-4"
            style={{ flex: '1', overflow: 'hidden', padding: '16px' }}
          >
            <Cart />
          </div>

          {/* Payment */}
          <div 
            className="border-t border-slate-100 p-4"
            style={{ borderTop: '1px solid #f1f5f9', padding: '16px' }}
          >
            <PaymentPanel />
          </div>
        </Card>
      </div>
    </div>
  );
}
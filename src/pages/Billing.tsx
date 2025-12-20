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
      className="h-full flex gap-6"
      style={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        gap: '24px',
        padding: '0',
        margin: '0'
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
            className="h-14 px-6 flex items-center justify-between border-b border-gray-100"
            style={{
              height: '56px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f3f4f6'
            }}
          >
            <div 
              className="flex items-center gap-3"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
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
                <ShoppingCart size={16} className="text-white" />
              </div>
              <div>
                <h2 
                  className="text-sm font-semibold text-gray-800"
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}
                >
                  New Bill
                </h2>
                <p 
                  className="text-xs text-gray-500"
                  style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}
                >
                  Add products to cart
                </p>
              </div>
            </div>
            <div 
              className="flex items-center gap-2 text-xs text-gray-500"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#6b7280'
              }}
            >
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
          <div 
            className="flex-1 flex flex-col p-6 overflow-hidden"
            style={{
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              overflow: 'hidden'
            }}
          >
            <BarcodeInput />
            <CategoryButtons />
            <div 
              className="flex-1 overflow-hidden mt-4"
              style={{
                flex: '1',
                overflow: 'hidden',
                marginTop: '16px'
              }}
            >
              <ProductSearch />
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Cart */}
      <div 
        className="w-[400px] flex flex-col"
        style={{
          width: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Card padding="none">
          {/* Header */}
          <div 
            className="h-14 px-6 flex items-center border-b border-gray-100"
            style={{
              height: '56px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #f3f4f6'
            }}
          >
            <div 
              className="flex items-center gap-3"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
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
                <ShoppingCart size={16} className="text-white" />
              </div>
              <div>
                <h2 
                  className="text-sm font-semibold text-gray-800"
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}
                >
                  Cart
                </h2>
                <p 
                  className="text-xs text-gray-500"
                  style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}
                >
                  Review & checkout
                </p>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div 
            className="flex-1 overflow-hidden p-4"
            style={{
              flex: '1',
              overflow: 'hidden',
              padding: '16px'
            }}
          >
            <Cart />
          </div>

          {/* Payment */}
          <div 
            className="border-t border-gray-100 p-4"
            style={{
              borderTop: '1px solid #f3f4f6',
              padding: '16px'
            }}
          >
            <PaymentPanel />
          </div>
        </Card>
      </div>
    </div>
  );
}
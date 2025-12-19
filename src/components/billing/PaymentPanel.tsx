import React from 'react';
import { Banknote, Smartphone, CreditCard } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DiscountInput } from './DiscountInput';
import { generateReceiptHTML } from '../../utils/printer';
import toast from 'react-hot-toast';

export function PaymentPanel() {
  const {
    cart,
    paymentMode,
    setPaymentMode,
    getSubtotal,
    getTotal,
    discountPercent,
    discountAmount,
    clearCart,
    settings,
  } = useStore();

  const subtotal = getSubtotal();
  const total = getTotal();

  const handlePayAndPrint = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const billData = {
        items: cart,
        subtotal,
        discountPercent,
        discountAmount,
        total,
        paymentMode,
      };

      const bill = await window.electronAPI.createBill(billData);

      if (settings?.autoPrint !== false) {
        const receiptHTML = generateReceiptHTML(
          bill as { billNumber: string; createdAt: string },
          cart,
          subtotal,
          discountPercent,
          discountAmount,
          total,
          paymentMode,
          settings
        );
        await window.electronAPI.print(receiptHTML, settings?.printerName);
      }

      toast.success(`Bill ${(bill as { billNumber: string }).billNumber} saved!`);
      clearCart();
    } catch (error) {
      toast.error('Error creating bill');
      console.error(error);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        handlePayAndPrint();
      }
      if (e.key === 'F8') {
        e.preventDefault();
        setPaymentMode(paymentMode === 'cash' ? 'upi' : 'cash');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMode, subtotal, total, discountPercent, discountAmount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Subtotal */}
      <div 
        className="flex items-center justify-between text-sm"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}
      >
        <span className="text-slate-500" style={{ color: '#64748b' }}>Subtotal</span>
        <span 
          className="font-mono font-medium text-slate-700"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: '500', color: '#374151' }}
        >
          ₹{subtotal.toLocaleString()}
        </span>
      </div>

      {/* Discount */}
      <DiscountInput />

      {/* Total */}
      <div 
        className="flex items-center justify-between py-3 border-t border-slate-200"
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingTop: '12px',
          paddingBottom: '12px',
          borderTop: '1px solid #e2e8f0'
        }}
      >
        <span 
          className="text-base font-semibold text-slate-800"
          style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}
        >
          Total
        </span>
        <span 
          className="text-xl font-bold text-slate-800 font-mono"
          style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            color: '#1e293b',
            fontFamily: 'JetBrains Mono, monospace'
          }}
        >
          ₹{total.toLocaleString()}
        </span>
      </div>

      {/* Payment Mode */}
      <div>
        <p 
          className="text-xs font-medium text-slate-500 mb-2"
          style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}
        >
          Payment Mode (F8)
        </p>
        <div 
          className="grid grid-cols-2 gap-2"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}
        >
          <button
            onClick={() => setPaymentMode('cash')}
            className="h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: paymentMode === 'cash' ? '#22c55e' : '#f1f5f9',
              color: paymentMode === 'cash' ? 'white' : '#475569'
            }}
            onMouseEnter={(e) => {
              if (paymentMode !== 'cash') {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (paymentMode !== 'cash') {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }
            }}
          >
            <Banknote size={16} />
            Cash
          </button>
          <button
            onClick={() => setPaymentMode('upi')}
            className="h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: paymentMode === 'upi' ? '#22c55e' : '#f1f5f9',
              color: paymentMode === 'upi' ? 'white' : '#475569'
            }}
            onMouseEnter={(e) => {
              if (paymentMode !== 'upi') {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (paymentMode !== 'upi') {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }
            }}
          >
            <Smartphone size={16} />
            UPI
          </button>
        </div>
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePayAndPrint}
        disabled={cart.length === 0}
        className="w-full h-14 flex items-center justify-center gap-3 bg-green-500 text-white rounded-xl font-semibold text-base hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
        style={{
          width: '100%',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          backgroundColor: cart.length === 0 ? '#e2e8f0' : '#22c55e',
          color: cart.length === 0 ? '#94a3b8' : 'white',
          borderRadius: '12px',
          border: 'none',
          fontSize: '16px',
          fontWeight: '600',
          cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: cart.length === 0 ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.3)'
        }}
        onMouseEnter={(e) => {
          if (cart.length > 0) {
            e.currentTarget.style.backgroundColor = '#16a34a';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (cart.length > 0) {
            e.currentTarget.style.backgroundColor = '#22c55e';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        <CreditCard size={20} />
        <span>Pay & Print (F12)</span>
      </button>
    </div>
  );
}
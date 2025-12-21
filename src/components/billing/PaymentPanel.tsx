import React from 'react';
import { Banknote, Smartphone, CreditCard, Edit2, Check, X } from 'lucide-react';
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
    manualTotal,
    setManualTotal,
    clearCart,
    settings,
  } = useStore();

  const subtotal = getSubtotal();
  const total = getTotal();
  const [isEditingTotal, setIsEditingTotal] = React.useState(false);
  const [editedTotal, setEditedTotal] = React.useState('');

  const handleEditTotal = () => {
    setEditedTotal(total.toString());
    setIsEditingTotal(true);
  };

  const handleSaveTotal = () => {
    const newTotal = parseFloat(editedTotal);
    if (!isNaN(newTotal) && newTotal >= 0) {
      setManualTotal(newTotal);
    }
    setIsEditingTotal(false);
  };

  const handleCancelEdit = () => {
    setIsEditingTotal(false);
    setEditedTotal('');
  };

  const handleResetTotal = () => {
    setManualTotal(null);
    setIsEditingTotal(false);
  };

  const handlePayAndPrint = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      console.log('Creating bill with cart:', cart);
      console.log('Payment details:', { subtotal, discountPercent, discountAmount, total, paymentMode });
      
      const billData = {
        items: cart,
        subtotal,
        discountPercent,
        discountAmount,
        total,
        paymentMode,
      };

      const bill = await window.electronAPI.createBill(billData);
      console.log('Bill created successfully:', bill);

      // Only try to print if settings are available and autoPrint is enabled
      if (settings && settings.autoPrint !== false) {
        try {
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
        } catch (printError) {
          console.error('Print error (non-critical):', printError);
          // Don't fail the whole operation if printing fails
        }
      }

      toast.success(`Bill ${(bill as { billNumber: string }).billNumber} saved!`);
      clearCart();
    } catch (error) {
      console.error('Bill creation error:', error);
      toast.error(`Error creating bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        <div className="flex items-center gap-2">
          {isEditingTotal ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editedTotal}
                onChange={(e) => setEditedTotal(e.target.value)}
                className="w-24 px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                style={{
                  width: '96px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTotal();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button
                onClick={handleSaveTotal}
                className="p-1 text-green-600 hover:text-green-700"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 text-red-600 hover:text-red-700"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
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
              <button
                onClick={handleEditTotal}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Edit total"
              >
                <Edit2 size={16} />
              </button>
              {manualTotal !== null && (
                <button
                  onClick={handleResetTotal}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-300 rounded"
                  title="Reset to calculated total"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
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
        <span>Save & Print (F12)</span>
      </button>
    </div>
  );
}
import React from 'react';
import { Banknote, Smartphone, CreditCard, Edit2, Check, X, Printer, Save } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DiscountInput } from './DiscountInput';
import { BillPreview } from './BillPreview';
import toast from 'react-hot-toast';

export function PaymentPanel() {
  const {
    cart,
    paymentMode,
    setPaymentMode,
    cashAmount,
    upiAmount,
    setCashAmount,
    setUpiAmount,
    getSubtotal,
    getTotal,
    discountPercent,
    discountAmount,
    setDiscountPercent,
    setDiscountAmount,
    manualTotal,
    setManualTotal,
    clearCart,
    settings,
  } = useStore();

  const subtotal = getSubtotal();
  const total = getTotal();
  const maxDiscount = settings?.maxDiscountPercent || 30;
  
  const [isEditingTotal, setIsEditingTotal] = React.useState(false);
  const [editedTotal, setEditedTotal] = React.useState('');
  const [mixedPaymentError, setMixedPaymentError] = React.useState('');
  const [showPrintConfirm, setShowPrintConfirm] = React.useState(false);
  const [savedBillData, setSavedBillData] = React.useState<any>(null);
  const [showBillPreview, setShowBillPreview] = React.useState(false);

  const handleEditTotal = () => {
    setEditedTotal(total.toString());
    setIsEditingTotal(true);
  };

  const handleSaveTotal = () => {
    const newTotal = parseFloat(editedTotal);
    if (!isNaN(newTotal) && newTotal >= 0) {
      // Calculate what discount this would be
      const newDiscountAmount = Math.max(0, subtotal - newTotal);
      const newDiscountPercent = subtotal > 0 ? (newDiscountAmount / subtotal) * 100 : 0;
      
      // Validate against max discount
      if (newDiscountPercent > maxDiscount) {
        toast.error(`Discount cannot exceed ${maxDiscount}%. Maximum discount: ₹${((subtotal * maxDiscount) / 100).toFixed(2)}`);
        return;
      }
      
      setManualTotal(newTotal);
      setDiscountAmount(newDiscountAmount);
      setDiscountPercent(Math.round(newDiscountPercent * 100) / 100);
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

  const handleMixedPaymentChange = () => {
    const totalAmount = cashAmount + upiAmount;
    if (Math.abs(totalAmount - total) > 0.01) {
      setMixedPaymentError(`Total must equal ₹${total.toLocaleString()}. Current: ₹${totalAmount.toLocaleString()}`);
    } else {
      setMixedPaymentError('');
    }
  };

  React.useEffect(() => {
    if (paymentMode === 'mixed') {
      handleMixedPaymentChange();
    }
  }, [cashAmount, upiAmount, total, paymentMode]);

  const createBillData = () => {
    return {
      items: cart,
      subtotal,
      discountPercent,
      discountAmount,
      total,
      paymentMode,
      cashAmount: paymentMode === 'mixed' ? cashAmount : (paymentMode === 'cash' ? total : 0),
      upiAmount: paymentMode === 'mixed' ? upiAmount : (paymentMode === 'upi' ? total : 0),
    };
  };

  const handleSaveBill = async (shouldPrint: boolean) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Validate mixed payment
    if (paymentMode === 'mixed') {
      const totalAmount = cashAmount + upiAmount;
      if (Math.abs(totalAmount - total) > 0.01) {
        toast.error(`Payment amounts don't match total. Cash + UPI should equal ₹${total.toLocaleString()}`);
        return;
      }
    }

    try {
      const billData = createBillData();
      const bill = await window.electronAPI.createBill(billData);
      
      // Prepare thermal bill data
      const thermalBillData = {
        billNumber: (bill as { billNumber: string }).billNumber,
        date: new Date((bill as { createdAt: string }).createdAt).toLocaleString(),
        storeName: settings?.storeName || 'VOGUE PRISM SHIRALA',
        storeAddress: `${settings?.addressLine1 || ''}\n${settings?.addressLine2 || ''}`.trim(),
        phone: settings?.phone || '',
        gstNumber: settings?.gstNumber || '',
        items: cart.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        subtotal,
        discountPercent,
        discountAmount,
        total,
        paymentMode,
        cashAmount: paymentMode === 'mixed' ? cashAmount : (paymentMode === 'cash' ? total : undefined),
        upiAmount: paymentMode === 'mixed' ? upiAmount : (paymentMode === 'upi' ? total : undefined),
        changeAmount: paymentMode === 'cash' && cashAmount > total ? cashAmount - total : undefined
      };

      if (shouldPrint) {
        // Show print preview
        setSavedBillData(thermalBillData);
        setShowBillPreview(true);
        setShowPrintConfirm(false);
      } else {
        toast.success(`Bill ${(bill as { billNumber: string }).billNumber} saved!`);
        clearCart();
      }
    } catch (error) {
      console.error('Bill creation error:', error);
      toast.error(`Error creating bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePayAndPrint = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Validate mixed payment
    if (paymentMode === 'mixed') {
      const totalAmount = cashAmount + upiAmount;
      if (Math.abs(totalAmount - total) > 0.01) {
        toast.error(`Payment amounts don't match total`);
        return;
      }
    }

    // Show print confirmation popup
    setShowPrintConfirm(true);
  };

  const handleCloseBillPreview = () => {
    setShowBillPreview(false);
    setSavedBillData(null);
    clearCart();
    toast.success('Bill saved successfully!');
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
    <>
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
            className="grid grid-cols-3 gap-2"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}
          >
            <button
              onClick={() => {
                setPaymentMode('cash');
                setCashAmount(total);
                setUpiAmount(0);
              }}
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
            >
              <Banknote size={16} />
              Cash
            </button>
            <button
              onClick={() => {
                setPaymentMode('upi');
                setCashAmount(0);
                setUpiAmount(total);
              }}
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
            >
              <Smartphone size={16} />
              UPI
            </button>
            <button
              onClick={() => {
                setPaymentMode('mixed');
                setCashAmount(Math.round(total / 2));
                setUpiAmount(total - Math.round(total / 2));
              }}
              className="h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: '500',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: paymentMode === 'mixed' ? '#22c55e' : '#f1f5f9',
                color: paymentMode === 'mixed' ? 'white' : '#475569'
              }}
            >
              <CreditCard size={16} />
              Mixed
            </button>
          </div>
          
          {/* Mixed Payment Fields */}
          {paymentMode === 'mixed' && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Cash Amount</label>
                  <input
                    type="number"
                    value={cashAmount || ''}
                    onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0"
                    min="0"
                    max={total}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">UPI Amount</label>
                  <input
                    type="number"
                    value={upiAmount || ''}
                    onChange={(e) => setUpiAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0"
                    min="0"
                    max={total}
                  />
                </div>
              </div>
              {mixedPaymentError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {mixedPaymentError}
                </div>
              )}
              <div className="text-xs text-slate-500 text-center">
                Total: ₹{(cashAmount + upiAmount).toLocaleString()} / ₹{total.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayAndPrint}
          disabled={cart.length === 0 || (paymentMode === 'mixed' && mixedPaymentError !== '')}
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
        >
          <CreditCard size={20} />
          <span>Complete Sale (F12)</span>
        </button>
      </div>

      {/* Print Confirmation Popup */}
      {showPrintConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Complete Sale</h3>
              <p className="text-sm text-gray-400">Bill Total: ₹{total.toLocaleString()}</p>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 mb-6">How would you like to proceed?</p>
              
              <div className="space-y-3">
                {/* Save & Print */}
                <button
                  onClick={() => handleSaveBill(true)}
                  className="w-full py-4 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-colors"
                >
                  <Printer size={20} />
                  Save & Print Receipt
                </button>
                
                {/* Save Only */}
                <button
                  onClick={() => handleSaveBill(false)}
                  className="w-full py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-3 transition-colors"
                >
                  <Save size={20} />
                  Save Only (No Print)
                </button>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setShowPrintConfirm(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {showBillPreview && savedBillData && (
        <BillPreview
          billData={savedBillData}
          onClose={handleCloseBillPreview}
        />
      )}
    </>
  );
}

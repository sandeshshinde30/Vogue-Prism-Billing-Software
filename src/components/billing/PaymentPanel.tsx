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
        <>
          <style>{`
            .save-dialog-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.6);
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 50;
              animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .save-dialog-card {
              width: 420px;
              background: #fff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
              animation: slideUp 0.3s ease;
            }
            .save-dialog-header {
              background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
              padding: 28px;
              text-align: center;
            }
            .save-dialog-icon {
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, #059669 0%, #10b981 100%);
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
            }
            .save-dialog-icon svg {
              color: #fff;
              width: 28px;
              height: 28px;
            }
            .save-dialog-title {
              font-size: 20px;
              font-weight: 600;
              color: #fff;
              margin-bottom: 6px;
            }
            .save-dialog-total {
              font-size: 32px;
              font-weight: 700;
              color: #10b981;
              font-family: 'JetBrains Mono', monospace;
            }
            .save-dialog-body {
              padding: 28px;
            }
            .save-dialog-label {
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6b7280;
              margin-bottom: 16px;
            }
            .save-dialog-options {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .save-option-btn {
              width: 100%;
              padding: 18px 20px;
              border-radius: 14px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 14px;
              transition: all 0.2s ease;
              border: 2px solid transparent;
            }
            .save-option-primary {
              background: linear-gradient(135deg, #059669 0%, #10b981 100%);
              color: #fff;
              box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
            }
            .save-option-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45);
            }
            .save-option-secondary {
              background: #f8fafc;
              color: #374151;
              border-color: #e5e7eb;
            }
            .save-option-secondary:hover {
              background: #f1f5f9;
              border-color: #d1d5db;
            }
            .save-option-icon {
              width: 44px;
              height: 44px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .save-option-primary .save-option-icon {
              background: rgba(255, 255, 255, 0.2);
            }
            .save-option-secondary .save-option-icon {
              background: #e5e7eb;
            }
            .save-option-text {
              flex: 1;
              text-align: left;
            }
            .save-option-title {
              font-size: 15px;
              font-weight: 600;
              margin-bottom: 2px;
            }
            .save-option-desc {
              font-size: 12px;
              opacity: 0.7;
              font-weight: 400;
            }
            .save-dialog-footer {
              padding: 0 28px 28px;
            }
            .save-cancel-btn {
              width: 100%;
              padding: 14px;
              background: transparent;
              border: none;
              color: #6b7280;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              border-radius: 10px;
              transition: all 0.2s ease;
            }
            .save-cancel-btn:hover {
              background: #f3f4f6;
              color: #374151;
            }
          `}</style>
          <div className="save-dialog-overlay">
            <div className="save-dialog-card">
              <div className="save-dialog-header">
                <div className="save-dialog-icon">
                  <CreditCard />
                </div>
                <div className="save-dialog-title">Complete Sale</div>
                <div className="save-dialog-total">₹{total.toLocaleString()}</div>
              </div>
              
              <div className="save-dialog-body">
                <div className="save-dialog-label">Choose an option</div>
                <div className="save-dialog-options">
                  <button
                    onClick={() => handleSaveBill(true)}
                    className="save-option-btn save-option-primary"
                  >
                    <div className="save-option-icon">
                      <Printer size={22} />
                    </div>
                    <div className="save-option-text">
                      <div className="save-option-title">Save & Print Receipt</div>
                      <div className="save-option-desc">Print thermal receipt after saving</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleSaveBill(false)}
                    className="save-option-btn save-option-secondary"
                  >
                    <div className="save-option-icon">
                      <Save size={22} />
                    </div>
                    <div className="save-option-text">
                      <div className="save-option-title">Save Only</div>
                      <div className="save-option-desc">Save bill without printing</div>
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="save-dialog-footer">
                <button
                  onClick={() => setShowPrintConfirm(false)}
                  className="save-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
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

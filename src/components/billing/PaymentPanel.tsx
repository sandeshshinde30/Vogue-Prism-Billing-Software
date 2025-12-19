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
    <div className="space-y-4">
      {/* Subtotal */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Subtotal</span>
        <span className="font-mono font-medium text-slate-700">₹{subtotal.toLocaleString()}</span>
      </div>

      {/* Discount */}
      <DiscountInput />

      {/* Total */}
      <div className="flex items-center justify-between py-3 border-t border-slate-200">
        <span className="text-base font-semibold text-slate-800">Total</span>
        <span className="text-xl font-bold text-slate-800 font-mono">₹{total.toLocaleString()}</span>
      </div>

      {/* Payment Mode */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Payment Mode (F8)</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMode('cash')}
            className={`h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors ${
              paymentMode === 'cash'
                ? 'bg-green-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Banknote size={16} />
            Cash
          </button>
          <button
            onClick={() => setPaymentMode('upi')}
            className={`h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors ${
              paymentMode === 'upi'
                ? 'bg-green-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
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
      >
        <CreditCard size={20} />
        <span>Pay & Print (F12)</span>
      </button>
    </div>
  );
}

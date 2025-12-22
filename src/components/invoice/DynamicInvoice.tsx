import React from "react";
import { BillData } from "../../utils/thermalPrinter";

interface DynamicInvoiceProps {
  billData: BillData;
  storeSettings?: {
    storeName?: string;
    addressLine1?: string;
    addressLine2?: string;
    phone?: string;
    gstNumber?: string;
  };
}

export const DynamicInvoice: React.FC<DynamicInvoiceProps> = ({ 
  billData, 
  storeSettings 
}) => {
  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white py-8" id="invoice-content">
      {/* A4 container */}
      <div className="mx-auto bg-white p-8 w-[210mm] min-h-[297mm] print:w-full print:min-h-0 print:p-0 print:shadow-none shadow-lg">

        {/* Header */}
        <div className="flex justify-between text-center items-center mb-6">
          <div className="flex flex-col justify-center items-center">
            <img
              src="/logo-gold.png"
              alt="Company Logo"
              className="w-24 mb-2"
              style={{ padding: '10px' }}
            />
            <h1
              className="font-extrabold text-xl tracking-wide"
              style={{ padding: "5px" }}
            >
              {storeSettings?.storeName || 'VOGUE PRISM'}
            </h1>
          </div>

          <div className="text-right text-sm">
            <p className="font-semibold text-gray-900">
              {storeSettings?.storeName || 'Vogue Vision Ventures PVT LMT.'}
            </p>
            <p className="text-gray-600">
              {storeSettings?.addressLine1 || 'info@voguevisionventures.com'}
            </p>
            <p className="text-gray-600">
              {storeSettings?.phone || '+91 8412065353'}
            </p>
            <p className="text-gray-600">
              GST IN: {storeSettings?.gstNumber || '564651515151'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-6 border-gray-300" />

        {/* Bill Info */}
        <div className="flex text-sm" style={{ marginTop: '10px', paddingLeft: '5px' }}>
          <div className="text-gray-700">
            <p>
              Bill No: <span className="text-gray-600 font-medium">{billData.billNumber}</span>
            </p>
            <p>
              Bill Date: <span className="text-gray-600">{formatDate(billData.date)}</span>
            </p>
            <p>
              Payment: <span className="text-gray-600 uppercase font-medium">{billData.paymentMode}</span>
            </p>
            {billData.paymentMode === 'mixed' && (
              <>
                {billData.cashAmount && billData.cashAmount > 0 && (
                  <p className="ml-4 text-xs">
                    Cash: <span className="text-gray-600">{formatCurrency(billData.cashAmount)}</span>
                  </p>
                )}
                {billData.upiAmount && billData.upiAmount > 0 && (
                  <p className="ml-4 text-xs">
                    UPI: <span className="text-gray-600">{formatCurrency(billData.upiAmount)}</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-8" style={{ marginTop: '20px', padding: '10px' }}>
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left border-b border-gray-300">Item</th>
                <th className="p-3 text-center border-b border-gray-300">Qty</th>
                <th className="p-3 text-right border-b border-gray-300">Price</th>
                <th className="p-3 text-right border-b border-gray-300">Amount</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {billData.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="p-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-6" style={{ paddingRight: '10px', paddingTop: '15px', paddingBottom: '10px' }}>
          <div className="w-72 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(billData.subtotal)}</span>
            </div>
            
            {billData.discountPercent > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">
                  Discount ({billData.discountPercent}%)
                </span>
                <span className="text-red-600">-{formatCurrency(billData.discountAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 font-semibold border-t mt-2 text-lg">
              <span>Total</span>
              <span>{formatCurrency(billData.total)}</span>
            </div>

            {billData.paymentMode === 'cash' && billData.changeAmount && billData.changeAmount > 0 && (
              <div className="flex justify-between py-1 text-green-600">
                <span>Change</span>
                <span>{formatCurrency(billData.changeAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t mt-10 pt-4 text-xs text-gray-500 text-center" style={{ paddingTop: '20px' }}>
          <p className="mb-2">Thank You for Your Business!</p>
          <p>Visit Again...</p>
        </div>
      </div>
    </div>
  );
};

export default DynamicInvoice;
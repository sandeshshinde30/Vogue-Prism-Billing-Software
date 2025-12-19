import { CartItem, Settings } from '../types';
import { format } from 'date-fns';

export function generateReceiptHTML(
  bill: { billNumber: string; createdAt: string },
  items: CartItem[],
  subtotal: number,
  discountPercent: number,
  discountAmount: number,
  total: number,
  paymentMode: 'cash' | 'upi',
  settings: Settings | null
): string {
  const storeName = settings?.storeName || 'Vogue Prism';
  const address1 = settings?.addressLine1 || '';
  const address2 = settings?.addressLine2 || '';
  const phone = settings?.phone || '';
  const paperWidth = settings?.paperWidth || '58mm';

  const width = paperWidth === '80mm' ? '80mm' : '58mm';
  const fontSize = paperWidth === '80mm' ? '12px' : '10px';

  const itemsHTML = items
    .map(
      (item) => `
      <tr>
        <td colspan="3" style="padding: 2px 0; font-size: ${fontSize};">
          ${item.product.name}${item.product.size ? ` (${item.product.size})` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding: 0 0 4px 8px; font-size: ${fontSize};">@${item.product.price.toLocaleString()} × ${item.quantity}</td>
        <td></td>
        <td style="text-align: right; padding: 0 0 4px 0; font-size: ${fontSize};">₹${(item.product.price * item.quantity).toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: ${width} auto;
          margin: 0;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: ${fontSize};
          width: ${width};
          margin: 0;
          padding: 4mm;
          box-sizing: border-box;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .total-row {
          font-weight: bold;
          font-size: ${paperWidth === '80mm' ? '14px' : '12px'};
        }
      </style>
    </head>
    <body>
      <div class="center bold" style="font-size: ${paperWidth === '80mm' ? '16px' : '14px'};">
        ${storeName}
      </div>
      ${address1 ? `<div class="center">${address1}</div>` : ''}
      ${address2 ? `<div class="center">${address2}</div>` : ''}
      ${phone ? `<div class="center">Ph: ${phone}</div>` : ''}
      
      <div class="divider"></div>
      
      <div>Bill No: ${bill.billNumber}</div>
      <div>Date: ${format(new Date(bill.createdAt), 'dd/MM/yyyy')}  Time: ${format(new Date(bill.createdAt), 'HH:mm')}</div>
      
      <div class="divider"></div>
      
      <table>
        ${itemsHTML}
      </table>
      
      <div class="divider"></div>
      
      <table>
        <tr>
          <td>Subtotal:</td>
          <td style="text-align: right;">₹${subtotal.toLocaleString()}</td>
        </tr>
        ${
          discountAmount > 0
            ? `
        <tr>
          <td>Discount (${discountPercent.toFixed(1)}%):</td>
          <td style="text-align: right;">-₹${discountAmount.toLocaleString()}</td>
        </tr>
        `
            : ''
        }
      </table>
      
      <div class="divider"></div>
      
      <table>
        <tr class="total-row">
          <td>TOTAL:</td>
          <td style="text-align: right;">₹${total.toLocaleString()}</td>
        </tr>
      </table>
      
      <div class="divider"></div>
      
      <div>Payment: ${paymentMode.toUpperCase()}</div>
      
      <div class="divider"></div>
      
      <div class="center" style="margin-top: 8px;">
        Thank you for shopping!
      </div>
      <div class="center">
        Visit again soon
      </div>
    </body>
    </html>
  `;
}

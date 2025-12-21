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

  // Thermal printer specific settings
  const isSmallPaper = paperWidth === '58mm';
  const width = isSmallPaper ? '58mm' : '80mm';
  const fontSize = isSmallPaper ? '10px' : '12px';
  const lineHeight = isSmallPaper ? '12px' : '14px';
  const padding = isSmallPaper ? '2px' : '4px';

  const itemsHTML = items
    .map(
      (item) => {
        const itemName = item.product.name + (item.product.size ? ` (${item.product.size})` : '');
        const unitPrice = `@${item.product.price.toLocaleString()}`;
        const qty = `x${item.quantity}`;
        const amount = `₹${(item.product.price * item.quantity).toLocaleString()}`;
        
        return `
        <tr>
          <td colspan="3" style="padding: ${padding} 0; font-size: ${fontSize}; line-height: ${lineHeight}; word-wrap: break-word;">
            ${itemName}
          </td>
        </tr>
        <tr>
          <td style="padding: 0 0 ${padding} 4px; font-size: ${fontSize}; width: 60%;">${unitPrice} ${qty}</td>
          <td></td>
          <td style="text-align: right; padding: 0 0 ${padding} 0; font-size: ${fontSize}; width: 30%;">${amount}</td>
        </tr>
      `;
      }
    )
    .join('');

  return `<!DOCTYPE html>
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
      line-height: ${lineHeight};
      margin: 0;
      padding: 4px;
      width: ${width};
      box-sizing: border-box;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .left { text-align: left; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .small { font-size: ${isSmallPaper ? '8px' : '10px'}; }
    .line { 
      border-top: 1px dashed #000; 
      margin: 2px 0; 
      height: 1px; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 0;
    }
    td { 
      padding: 1px 0; 
      vertical-align: top;
      word-wrap: break-word;
    }
    .header {
      margin-bottom: 4px;
    }
    .footer {
      margin-top: 4px;
    }
    .total-section {
      margin-top: 4px;
      padding-top: 2px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="center bold" style="font-size: ${isSmallPaper ? '12px' : '14px'};">${storeName}</div>
    ${address1 ? `<div class="center small">${address1}</div>` : ''}
    ${address2 ? `<div class="center small">${address2}</div>` : ''}
    ${phone ? `<div class="center small">Ph: ${phone}</div>` : ''}
    <div class="line"></div>
  </div>

  <div class="center">
    <div class="bold">BILL: ${bill.billNumber}</div>
    <div class="small">${format(new Date(bill.createdAt), 'dd/MM/yyyy HH:mm')}</div>
  </div>
  
  <div class="line"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left; font-size: ${fontSize}; padding: 2px 0;">ITEM</th>
        <th></th>
        <th style="text-align: right; font-size: ${fontSize}; padding: 2px 0;">AMT</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="line"></div>

  <div class="total-section">
    <table>
      <tr>
        <td class="left">Subtotal:</td>
        <td class="right">₹${subtotal.toLocaleString()}</td>
      </tr>
      ${discountAmount > 0 ? `
      <tr>
        <td class="left">Discount (${discountPercent}%):</td>
        <td class="right">-₹${discountAmount.toLocaleString()}</td>
      </tr>
      ` : ''}
      <tr style="border-top: 1px solid #000;">
        <td class="left bold">TOTAL:</td>
        <td class="right bold">₹${total.toLocaleString()}</td>
      </tr>
      <tr>
        <td class="left">Payment:</td>
        <td class="right">${paymentMode.toUpperCase()}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <div class="line"></div>
    <div class="center small">Thank you for shopping!</div>
    <div class="center small">Visit again</div>
    <div class="line"></div>
    <div class="center small">${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
  </div>
</body>
</html>`;
}
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BillData } from './thermalPrinter';

export interface PDFExportOptions {
  filename?: string;
  quality?: number;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export class PDFExporter {
  static async exportBillToPDF(
    billData: BillData,
    storeSettings: any,
    options: PDFExportOptions = {}
  ): Promise<{ success: boolean; error?: string; filename?: string }> {
    try {
      const {
        filename = `bill-${billData.billNumber}-${new Date().toISOString().split('T')[0]}.pdf`,
        quality = 2.0,
        format = 'a4',
        orientation = 'portrait'
      } = options;

      // Create a temporary container for the invoice
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm';
      tempContainer.style.backgroundColor = '#ffffff';
      document.body.appendChild(tempContainer);

      // Create invoice HTML with inline styles (no Tailwind)
      const invoiceHTML = `
        <div style="background: white; padding: 40px; width: 210mm; min-height: 297mm; font-family: Arial, sans-serif;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <div style="display: flex; align-items: center;">
              <img src="/logo-gold.png" alt="Logo" style="width: 80px; height: 80px; margin-right: 20px;" />
              <div>
                <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #111827;">${storeSettings?.storeName || 'VOGUE PRISM'}</h1>
                <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">Professional Invoice</p>
              </div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #374151;">
              <p style="margin: 2px 0; font-weight: 600;">${storeSettings?.storeName || 'Vogue Vision Ventures PVT LMT.'}</p>
              <p style="margin: 2px 0; color: #6b7280;">${storeSettings?.addressLine1 || 'info@voguevisionventures.com'}</p>
              <p style="margin: 2px 0; color: #6b7280;">${storeSettings?.phone || '+91 8412065353'}</p>
              <p style="margin: 2px 0; color: #6b7280;">GST IN: ${storeSettings?.gstNumber || '564651515151'}</p>
            </div>
          </div>

          <!-- Divider -->
          <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;" />

          <!-- Bill Info -->
          <div style="margin-bottom: 30px; font-size: 13px; color: #374151;">
            <p style="margin: 5px 0;"><strong>Bill No:</strong> <span style="color: #6b7280;">${billData.billNumber}</span></p>
            <p style="margin: 5px 0;"><strong>Bill Date:</strong> <span style="color: #6b7280;">${billData.date}</span></p>
            <p style="margin: 5px 0;"><strong>Payment:</strong> <span style="color: #6b7280; text-transform: uppercase; font-weight: 500;">${billData.paymentMode}</span></p>
            ${billData.paymentMode === 'mixed' ? `
              ${billData.cashAmount && billData.cashAmount > 0 ? `<p style="margin: 5px 0 5px 20px; font-size: 11px;"><strong>Cash:</strong> <span style="color: #6b7280;">₹${billData.cashAmount.toFixed(2)}</span></p>` : ''}
              ${billData.upiAmount && billData.upiAmount > 0 ? `<p style="margin: 5px 0 5px 20px; font-size: 11px;"><strong>UPI:</strong> <span style="color: #6b7280;">₹${billData.upiAmount.toFixed(2)}</span></p>` : ''}
            ` : ''}
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Item</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Qty</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Price</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${billData.items.map(item => `
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-weight: 500; color: #111827;">${item.name}</p>
                    ${item.quantity > 1 ? `<p style="margin: 3px 0 0 0; font-size: 11px; color: #6b7280;">${item.quantity} × ₹${item.unitPrice.toFixed(2)}</p>` : ''}
                  </td>
                  <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; color: #374151;">${item.quantity}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; color: #374151;">₹${item.unitPrice.toFixed(2)}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 500; color: #111827;">₹${item.totalPrice.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
            <div style="width: 300px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #374151;">
                <span>Subtotal</span>
                <span>₹${billData.subtotal.toFixed(2)}</span>
              </div>
              ${billData.discountAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #dc2626;">
                  <span>Discount</span>
                  <span>-₹${billData.discountAmount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #d1d5db; margin-top: 8px; font-size: 16px; font-weight: 600; color: #111827;">
                <span>Total</span>
                <span>₹${billData.total.toFixed(2)}</span>
              </div>
              ${billData.paymentMode === 'cash' && billData.changeAmount && billData.changeAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #059669;">
                  <span>Change</span>
                  <span>₹${billData.changeAmount.toFixed(2)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #d1d5db; padding-top: 20px; text-align: center; font-size: 11px; color: #6b7280;">
            <p style="margin: 5px 0;">Thank You for Your Business!</p>
            <p style="margin: 5px 0;">Visit Again...</p>
          </div>
        </div>
      `;

      tempContainer.innerHTML = invoiceHTML;

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate canvas from the invoice
      const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
        scale: quality,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit the page
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583));
      
      const finalWidth = imgWidth * 0.264583 * ratio;
      const finalHeight = imgHeight * 0.264583 * ratio;
      
      // Center the image on the page
      const x = (pdfWidth - finalWidth) / 2;
      const y = 0;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

      // Save the PDF
      pdf.save(filename);

      // Cleanup
      document.body.removeChild(tempContainer);

      return { success: true, filename };
    } catch (error) {
      console.error('PDF export error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'PDF export failed' 
      };
    }
  }

}
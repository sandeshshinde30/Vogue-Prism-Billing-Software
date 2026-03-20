import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import jsPDF from 'jspdf';

interface BillData {
  billNumber: string;
  createdAt: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  paymentMode: string;
  cashAmount?: number;
  upiAmount?: number;
}

interface BillItem {
  productName: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Settings {
  storeName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  gstNumber: string;
}

// Get dynamic temp directory based on OS
export function getTempBillsDirectory(): string {
  const tempDir = os.tmpdir();
  const billsDir = path.join(tempDir, 'vogue-prism-bills');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(billsDir)) {
    fs.mkdirSync(billsDir, { recursive: true });
  }
  
  return billsDir;
}

// Get bill PDF path
export function getBillPdfPath(billNumber: string): string {
  const billsDir = getTempBillsDirectory();
  return path.join(billsDir, `${billNumber}.pdf`);
}

// HTML template for bill
const BILL_TEMPLATE = `
<div style="width: 210mm; min-height: 297mm; padding: 20mm; background: white; font-family: system-ui, -apple-system, sans-serif; font-size: 12px;">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 20px; font-weight: bold; color: #111827; margin: 0;">{{storeName}}</h1>
    <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">{{addressLine1}}</p>
    <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">{{addressLine2}}</p>
    <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">Phone: {{phone}}</p>
    <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">GST: {{gstNumber}}</p>
  </div>

  <!-- Bill Info -->
  <div style="border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 16px 0; margin-bottom: 16px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <p style="font-weight: 500; margin: 0;">Bill No: {{billNumber}}</p>
        <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">Date: {{date}} {{time}}</p>
      </div>
      <div style="text-align: right;">
        <p style="font-weight: 500; margin: 0;">Payment: {{paymentMode}}</p>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
        <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 500;">#</th>
        <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 500;">Item</th>
        <th style="padding: 8px 12px; text-align: center; font-size: 12px; font-weight: 500;">Qty</th>
        <th style="padding: 8px 12px; text-align: right; font-size: 12px; font-weight: 500;">Rate</th>
        <th style="padding: 8px 12px; text-align: right; font-size: 12px; font-weight: 500;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{items}}
    </tbody>
  </table>

  <!-- Totals -->
  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #dc2626;">
      <span>Discount ({{discountPercent}}%):</span>
      <span>-{{discountAmount}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 1px solid #e5e7eb; padding-top: 8px;">
      <span>Total:</span>
      <span>{{total}}</span>
    </div>
  </div>

  <!-- Payment Details -->
  <div style="margin-top: 16px; font-size: 12px; color: #6b7280;">
    <div style="display: flex; justify-content: space-between;">
      <span>Cash:</span>
      <span>{{cashAmount}}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>UPI:</span>
      <span>{{upiAmount}}</span>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af;">
    <p style="margin: 0;">Thank you for your business!</p>
    <p style="margin: 0;">Visit again</p>
  </div>
</div>
`;

/**
 * Generate PDF bill and save to temp directory
 */
export async function generateBillPdf(
  billData: BillData,
  items: BillItem[],
  settings: Settings
): Promise<string> {
  try {
    // Process HTML template
    let html = BILL_TEMPLATE
      // Store information
      .replace(/{{storeName}}/g, settings.storeName)
      .replace(/{{addressLine1}}/g, settings.addressLine1)
      .replace(/{{addressLine2}}/g, settings.addressLine2)
      .replace(/{{phone}}/g, settings.phone)
      .replace(/{{gstNumber}}/g, settings.gstNumber)
      
      // Bill information
      .replace(/{{billNumber}}/g, billData.billNumber)
      .replace(/{{date}}/g, new Date(billData.createdAt).toLocaleDateString())
      .replace(/{{time}}/g, new Date(billData.createdAt).toLocaleTimeString())
      .replace(/{{paymentMode}}/g, billData.paymentMode.toUpperCase())
      
      // Amounts
      .replace(/{{subtotal}}/g, `₹${billData.subtotal.toLocaleString()}`)
      .replace(/{{discountPercent}}/g, billData.discountPercent.toString())
      .replace(/{{discountAmount}}/g, `₹${billData.discountAmount.toLocaleString()}`)
      .replace(/{{total}}/g, `₹${billData.total.toLocaleString()}`)
      .replace(/{{cashAmount}}/g, `₹${(billData.cashAmount || 0).toLocaleString()}`)
      .replace(/{{upiAmount}}/g, `₹${(billData.upiAmount || 0).toLocaleString()}`);

    // Generate items HTML
    const itemsHTML = items.map((item, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 12px; text-align: left;">${index + 1}</td>
        <td style="padding: 8px 12px; text-align: left;">
          ${item.productName}
          ${item.size ? `<br><span style="font-size: 10px; color: #6b7280;">(${item.size})</span>` : ''}
        </td>
        <td style="padding: 8px 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 12px; text-align: right;">₹${item.unitPrice.toLocaleString()}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 500;">₹${item.totalPrice.toLocaleString()}</td>
      </tr>
    `).join('');

    html = html.replace(/{{items}}/g, itemsHTML);

    // Create PDF directly using jsPDF with text rendering
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Set font
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    // Helper function to add text with wrapping
    const addText = (text: string, x: number, y: number, fontSize: number = 10, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, contentWidth - 2 * x);
      pdf.text(lines, x, y);
      return y + (lines.length * fontSize * 0.35);
    };

    // Header
    yPosition = addText(settings.storeName, margin, yPosition, 14, true);
    yPosition = addText(settings.addressLine1, margin, yPosition, 9);
    yPosition = addText(settings.addressLine2, margin, yPosition, 9);
    yPosition = addText(`Phone: ${settings.phone}`, margin, yPosition, 9);
    yPosition = addText(`GST: ${settings.gstNumber}`, margin, yPosition, 9);
    yPosition += 5;

    // Bill info
    pdf.setDrawColor(200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 3;
    
    yPosition = addText(`Bill No: ${billData.billNumber}`, margin, yPosition, 10, true);
    yPosition = addText(`Date: ${new Date(billData.createdAt).toLocaleDateString()} ${new Date(billData.createdAt).toLocaleTimeString()}`, margin, yPosition, 9);
    yPosition = addText(`Payment: ${billData.paymentMode.toUpperCase()}`, margin, yPosition, 9);
    yPosition += 3;

    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Items table header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    const colWidths = [10, 60, 15, 25, 30];
    const cols = ['#', 'Item', 'Qty', 'Rate', 'Amount'];
    let xPos = margin;
    
    for (let i = 0; i < cols.length; i++) {
      pdf.text(cols[i], xPos, yPosition);
      xPos += colWidths[i];
    }
    yPosition += 5;

    // Items
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      xPos = margin;
      
      pdf.text((i + 1).toString(), xPos, yPosition);
      xPos += colWidths[0];
      
      const itemName = item.size ? `${item.productName} (${item.size})` : item.productName;
      const itemLines = pdf.splitTextToSize(itemName, colWidths[1] - 2);
      pdf.text(itemLines, xPos, yPosition);
      xPos += colWidths[1];
      
      pdf.text(item.quantity.toString(), xPos, yPosition, { align: 'center' });
      xPos += colWidths[2];
      
      pdf.text(`₹${item.unitPrice.toLocaleString()}`, xPos, yPosition, { align: 'right' });
      xPos += colWidths[3];
      
      pdf.text(`₹${item.totalPrice.toLocaleString()}`, xPos, yPosition, { align: 'right' });
      
      yPosition += 5;
    }

    yPosition += 3;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Totals
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    const totalLines = [
      [`Subtotal:`, `₹${billData.subtotal.toLocaleString()}`],
      [`Discount (${billData.discountPercent}%):`, `-₹${billData.discountAmount.toLocaleString()}`],
    ];

    for (const [label, value] of totalLines) {
      pdf.text(label, margin, yPosition);
      pdf.text(value, pageWidth - margin - 20, yPosition, { align: 'right' });
      yPosition += 5;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    pdf.text('Total:', margin, yPosition);
    pdf.text(`₹${billData.total.toLocaleString()}`, pageWidth - margin - 20, yPosition, { align: 'right' });
    yPosition += 8;

    // Payment details
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Cash: ₹${(billData.cashAmount || 0).toLocaleString()}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`UPI: ₹${(billData.upiAmount || 0).toLocaleString()}`, margin, yPosition);
    yPosition += 10;

    // Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.text('Visit again', pageWidth / 2, yPosition, { align: 'center' });

    // Save PDF to temp directory
    const pdfPath = getBillPdfPath(billData.billNumber);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    fs.writeFileSync(pdfPath, pdfBuffer);

    console.log(`PDF generated: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete bill PDF from temp directory
 */
export function deleteBillPdf(billNumber: string): void {
  try {
    const pdfPath = getBillPdfPath(billNumber);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log(`PDF deleted: ${pdfPath}`);
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
  }
}

/**
 * Check if bill PDF exists
 */
export function billPdfExists(billNumber: string): boolean {
  const pdfPath = getBillPdfPath(billNumber);
  return fs.existsSync(pdfPath);
}

/**
 * Get temp directory info for debugging
 */
export function getTempDirInfo(): { tempDir: string; billsDir: string; platform: string } {
  return {
    tempDir: os.tmpdir(),
    billsDir: getTempBillsDirectory(),
    platform: process.platform
  };
}

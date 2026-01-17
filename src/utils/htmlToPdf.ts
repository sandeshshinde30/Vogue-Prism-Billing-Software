import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

/**
 * Convert HTML template with Tailwind CSS to PDF
 * @param htmlTemplate - HTML string with Tailwind classes
 * @param billData - Bill information
 * @param items - Bill items array
 * @param settings - Store settings
 * @returns Promise<void>
 */
export async function generatePDFFromHTML(
  htmlTemplate: string,
  billData: BillData,
  items: BillItem[],
  settings: Settings
): Promise<void> {
  try {
    // Replace placeholders in HTML template
    let processedHTML = htmlTemplate
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
      <tr class="border-b border-gray-200">
        <td class="py-2 px-3 text-left">${index + 1}</td>
        <td class="py-2 px-3 text-left">
          ${item.productName}
          ${item.size ? `<br><span class="text-xs text-gray-500">(${item.size})</span>` : ''}
        </td>
        <td class="py-2 px-3 text-center">${item.quantity}</td>
        <td class="py-2 px-3 text-right">₹${item.unitPrice.toLocaleString()}</td>
        <td class="py-2 px-3 text-right font-medium">₹${item.totalPrice.toLocaleString()}</td>
      </tr>
    `).join('');

    // Replace items placeholder
    processedHTML = processedHTML.replace(/{{items}}/g, itemsHTML);

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="width: 210mm; min-height: 297mm; padding: 20mm; background: white; font-family: system-ui, -apple-system, sans-serif;">
        ${processedHTML}
      </div>
    `;
    
    // Add Tailwind CSS (you might need to include this differently based on your setup)
    const style = document.createElement('style');
    style.textContent = `
      /* Add essential Tailwind classes here or include the full Tailwind CSS */
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .font-medium { font-weight: 500; }
      .text-lg { font-size: 1.125rem; }
      .text-xl { font-size: 1.25rem; }
      .text-2xl { font-size: 1.5rem; }
      .text-sm { font-size: 0.875rem; }
      .text-xs { font-size: 0.75rem; }
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-4 { margin-bottom: 1rem; }
      .mt-4 { margin-top: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
      .border-b { border-bottom-width: 1px; }
      .border-t { border-top-width: 1px; }
      .border-gray-200 { border-color: #e5e7eb; }
      .text-gray-500 { color: #6b7280; }
      .text-gray-600 { color: #4b5563; }
      .bg-gray-50 { background-color: #f9fafb; }
      .w-full { width: 100%; }
      .table { display: table; }
      .border-collapse { border-collapse: collapse; }
    `;
    container.appendChild(style);

    // Temporarily add to DOM for rendering
    document.body.appendChild(container);
    
    // Convert to canvas with optimized settings
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 1.6, // Increased from 1.5 to 1.6 for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      removeContainer: true
    });
    
    // Remove from DOM
    document.body.removeChild(container);
    
    // Create PDF with compression
    const imgData = canvas.toDataURL('image/jpeg', 0.88); // Increased from 0.8 to 0.88 for better quality
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm', 
      format: 'a4',
      compress: true // Enable compression
    });
    
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
    
    // Save the PDF
    pdf.save(`${billData.billNumber}.pdf`);
    
  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    throw new Error('Failed to generate PDF from HTML template');
  }
}

/**
 * Example HTML template with Tailwind CSS classes
 * You can replace this with your custom HTML file content
 */
export const SAMPLE_BILL_TEMPLATE = `
<div class="max-w-2xl mx-auto bg-white">
  <!-- Header -->
  <div class="text-center mb-6">
    <h1 class="text-2xl font-bold text-gray-800">{{storeName}}</h1>
    <p class="text-sm text-gray-600">{{addressLine1}}</p>
    <p class="text-sm text-gray-600">{{addressLine2}}</p>
    <p class="text-sm text-gray-600">Phone: {{phone}}</p>
    <p class="text-sm text-gray-600">GST: {{gstNumber}}</p>
  </div>

  <!-- Bill Info -->
  <div class="border-t border-b border-gray-200 py-4 mb-4">
    <div class="flex justify-between items-center">
      <div>
        <p class="font-medium">Bill No: {{billNumber}}</p>
        <p class="text-sm text-gray-600">Date: {{date}} {{time}}</p>
      </div>
      <div class="text-right">
        <p class="font-medium">Payment: {{paymentMode}}</p>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="w-full border-collapse mb-6">
    <thead>
      <tr class="bg-gray-50 border-b border-gray-200">
        <th class="py-2 px-3 text-left text-sm font-medium">#</th>
        <th class="py-2 px-3 text-left text-sm font-medium">Item</th>
        <th class="py-2 px-3 text-center text-sm font-medium">Qty</th>
        <th class="py-2 px-3 text-right text-sm font-medium">Rate</th>
        <th class="py-2 px-3 text-right text-sm font-medium">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{items}}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="border-t border-gray-200 pt-4">
    <div class="flex justify-between mb-2">
      <span>Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div class="flex justify-between mb-2 text-red-600">
      <span>Discount ({{discountPercent}}%):</span>
      <span>-{{discountAmount}}</span>
    </div>
    <div class="flex justify-between text-lg font-bold border-t pt-2">
      <span>Total:</span>
      <span>{{total}}</span>
    </div>
  </div>

  <!-- Payment Details (for mixed payments) -->
  <div class="mt-4 text-sm text-gray-600">
    <div class="flex justify-between">
      <span>Cash:</span>
      <span>{{cashAmount}}</span>
    </div>
    <div class="flex justify-between">
      <span>UPI:</span>
      <span>{{upiAmount}}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="text-center mt-8 text-sm text-gray-500">
    <p>Thank you for your business!</p>
    <p>Visit again</p>
  </div>
</div>
`;

/**
 * Load HTML template from file and generate PDF
 * @param templatePath - Path to HTML template file
 * @param billData - Bill information
 * @param items - Bill items
 * @param settings - Store settings
 */
export async function generatePDFFromFile(
    billData: BillData,
  items: BillItem[],
  settings: Settings
): Promise<void> {
  try {
    // In an Electron app, you would read the file using Node.js fs
    // For now, we'll use the sample template
    const htmlTemplate = SAMPLE_BILL_TEMPLATE;
    
    await generatePDFFromHTML(htmlTemplate, billData, items, settings);
  } catch (error) {
    console.error('Error loading template file:', error);
    throw new Error('Failed to load HTML template file');
  }
}
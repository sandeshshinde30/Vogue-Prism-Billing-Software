import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface ExportRow {
  bill_number: string;
  created_at: string;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  subtotal: number;
  discount_rate: number;
  discount_amount: number;
  final_total: number;
  payment_mode: string;
  cash_amount?: number;
  upi_amount?: number;
}

export function exportToExcel(data: ExportRow[], filename: string): void {
  const formattedData = data.map((row) => ({
    'Date': new Date(row.created_at).toLocaleDateString(),
    'Bill #': row.bill_number,
    'Product Name': row.product_name,
    'Size': row.size || '-',
    'Quantity': row.quantity,
    'Unit Price': row.unit_price,
    'Line Total': row.total_price,
    'Bill Subtotal': row.subtotal,
    'Discount %': row.discount_rate,
    'Discount Amount': row.discount_amount,
    'Final Total': row.final_total,
    'Payment Mode': row.payment_mode.toUpperCase(),
    'Cash Amount': row.cash_amount || 0,
    'UPI Amount': row.upi_amount || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

  // Auto-size columns
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 12 }, // Bill #
    { wch: 25 }, // Product Name
    { wch: 8 },  // Size
    { wch: 10 }, // Quantity
    { wch: 12 }, // Unit Price
    { wch: 12 }, // Line Total
    { wch: 15 }, // Bill Subtotal
    { wch: 12 }, // Discount %
    { wch: 15 }, // Discount Amount
    { wch: 15 }, // Final Total
    { wch: 12 }, // Payment Mode
    { wch: 12 }, // Cash Amount
    { wch: 12 }, // UPI Amount
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
}

export async function exportBillToPDF(
  bill: { billNumber: string; createdAt: string; total: number; paymentMode: string; subtotal: number; discountAmount: number; discountPercent: number; cashAmount?: number; upiAmount?: number },
  items: Array<{ productName: string; size?: string; quantity: number; unitPrice: number; totalPrice: number }>
): Promise<void> {
  try {
    // Get store settings
    const settings = await window.electronAPI.getSettings();
    
    // Convert to BillData format
    const billData = {
      billNumber: bill.billNumber,
      date: formatDateTime(bill.createdAt),
      storeName: settings?.storeName || 'Vogue Prism',
      storeAddress: `${settings?.addressLine1 || ''}\n${settings?.addressLine2 || ''}`.trim(),
      phone: settings?.phone || '',
      gstNumber: settings?.gstNumber || '',
      items: items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      subtotal: bill.subtotal,
      discountPercent: bill.discountPercent || 0,
      discountAmount: bill.discountAmount || 0,
      total: bill.total,
      paymentMode: bill.paymentMode,
      cashAmount: bill.cashAmount,
      upiAmount: bill.upiAmount,
      changeAmount: bill.paymentMode === 'cash' && bill.cashAmount && bill.cashAmount > bill.total 
        ? bill.cashAmount - bill.total : undefined
    };
    
    // Use the PDFExporter to export
    const { PDFExporter } = await import('./pdfExport');
    const result = await PDFExporter.exportBillToPDF(billData, settings);
    
    if (!result.success) {
      throw new Error(result.error || 'PDF export failed');
    }
  } catch (error) {
    console.error('Error exporting bill to PDF:', error);
    throw error;
  }
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const dateObj = new Date(date);
  
  // Handle invalid dates
  if (isNaN(dateObj.getTime())) {
    return '--:--';
  }
  
  return dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTime(date: string | Date): string {
  const dateObj = new Date(date);
  
  // Handle invalid dates
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return dateObj.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

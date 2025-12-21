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

export function exportBillToPDF(
  bill: { billNumber: string; createdAt: string; total: number; paymentMode: string; subtotal: number; discountAmount: number; discountPercent: number },
  items: Array<{ productName: string; size?: string; quantity: number; unitPrice: number; totalPrice: number }>,
  storeName: string = 'Vogue Prism'
): void {
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(storeName, 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('INVOICE', 105, 30, { align: 'center' });
  
  // Bill details
  doc.setFontSize(10);
  doc.text(`Bill No: ${bill.billNumber}`, 20, 45);
  doc.text(`Date: ${formatDateTime(bill.createdAt)}`, 20, 52);
  doc.text(`Payment: ${bill.paymentMode.toUpperCase()}`, 20, 59);
  
  // Table header
  let yPos = 75;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Item', 20, yPos);
  doc.text('Qty', 120, yPos);
  doc.text('Rate', 140, yPos);
  doc.text('Amount', 170, yPos);
  
  // Draw line under header
  doc.line(20, yPos + 2, 190, yPos + 2);
  
  // Items
  yPos += 10;
  doc.setTextColor(0, 0, 0);
  
  items.forEach((item) => {
    const itemName = item.size ? `${item.productName} (${item.size})` : item.productName;
    
    // Wrap long item names
    const splitText = doc.splitTextToSize(itemName, 90);
    doc.text(splitText, 20, yPos);
    
    doc.text(item.quantity.toString(), 120, yPos);
    doc.text(`₹${item.unitPrice.toLocaleString()}`, 140, yPos);
    doc.text(`₹${item.totalPrice.toLocaleString()}`, 170, yPos);
    
    yPos += splitText.length * 5 + 3;
  });
  
  // Totals
  yPos += 10;
  doc.line(20, yPos, 190, yPos);
  yPos += 8;
  
  doc.text('Subtotal:', 140, yPos);
  doc.text(`₹${bill.subtotal.toLocaleString()}`, 170, yPos);
  
  if (bill.discountAmount > 0) {
    yPos += 7;
    doc.text(`Discount (${bill.discountPercent}%):`, 140, yPos);
    doc.text(`-₹${bill.discountAmount.toLocaleString()}`, 170, yPos);
  }
  
  yPos += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 140, yPos);
  doc.text(`₹${bill.total.toLocaleString()}`, 170, yPos);
  
  // Footer
  yPos += 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
  
  // Save the PDF
  doc.save(`${bill.billNumber}.pdf`);
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

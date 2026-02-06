import * as XLSX from 'xlsx';

interface ExportRow {
  bill_number: string;
  created_at: string;
  product_name: string;
  size: string;
  quantity: number;
  cost_price?: number;
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
  // Calculate totals and profit
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalDiscount = 0;
  
  const formattedData = data.map((row) => {
    const costPrice = row.cost_price || 0;
    const itemCost = costPrice * row.quantity;
    const itemProfit = row.total_price - itemCost;
    const profitMargin = row.total_price > 0 ? ((itemProfit / row.total_price) * 100).toFixed(1) + '%' : '0%';
    
    totalRevenue += row.final_total;
    totalCost += itemCost;
    totalProfit += itemProfit;
    totalDiscount += row.discount_amount;
    
    return {
      'Date': new Date(row.created_at).toLocaleDateString('en-IN'),
      'Bill #': row.bill_number,
      'Product': row.product_name,
      'Size': row.size || '-',
      'Qty': row.quantity,
      'Cost Price': costPrice,
      'Selling Price': row.unit_price,
      'Item Total': row.total_price,
      'Item Cost': itemCost,
      'Item Profit': itemProfit,
      'Profit %': profitMargin,
      'Bill Subtotal': row.subtotal,
      'Discount %': row.discount_rate,
      'Discount Amt': row.discount_amount,
      'Final Total': row.final_total,
      'Payment': row.payment_mode.toUpperCase(),
      'Cash': row.cash_amount || 0,
      'UPI': row.upi_amount || 0,
    };
  });

  // Add summary rows
  formattedData.push({} as any); // Empty row
  formattedData.push({
    'Date': 'SUMMARY',
    'Bill #': '',
    'Product': '',
    'Size': '',
    'Qty': '',
    'Cost Price': '',
    'Selling Price': '',
    'Item Total': '',
    'Item Cost': totalCost,
    'Item Profit': totalProfit,
    'Profit %': totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%',
    'Bill Subtotal': '',
    'Discount %': '',
    'Discount Amt': totalDiscount,
    'Final Total': totalRevenue,
    'Payment': '',
    'Cash': '',
    'UPI': '',
  } as any);

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

  // Auto-size columns
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 12 }, // Bill #
    { wch: 25 }, // Product
    { wch: 8 },  // Size
    { wch: 6 },  // Qty
    { wch: 12 }, // Cost Price
    { wch: 12 }, // Selling Price
    { wch: 12 }, // Item Total
    { wch: 12 }, // Item Cost
    { wch: 12 }, // Item Profit
    { wch: 10 }, // Profit %
    { wch: 14 }, // Bill Subtotal
    { wch: 11 }, // Discount %
    { wch: 13 }, // Discount Amt
    { wch: 13 }, // Final Total
    { wch: 10 }, // Payment
    { wch: 10 }, // Cash
    { wch: 10 }, // UPI
  ];
  worksheet['!cols'] = colWidths;

  // Apply styling to header row (row 1)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Style header row
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      fill: { fgColor: { rgb: "4472C4" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
  }

  // Style summary row (last row)
  const summaryRow = range.e.r;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: summaryRow, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      fill: { fgColor: { rgb: "FFC000" } },
      font: { bold: true, sz: 11 },
      alignment: { horizontal: "right", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };
  }

  // Highlight profit columns with light green
  const profitCols = [9, 10]; // Item Profit and Profit % columns (0-indexed)
  for (let row = 1; row < summaryRow; row++) {
    for (const col of profitCols) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      const cellValue = worksheet[cellAddress].v;
      const isProfit = typeof cellValue === 'number' ? cellValue > 0 : false;
      
      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: isProfit ? "E2EFDA" : "FCE4D6" } },
        font: { color: { rgb: isProfit ? "008000" : "C00000" } },
        alignment: { horizontal: "right" }
      };
    }
  }

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

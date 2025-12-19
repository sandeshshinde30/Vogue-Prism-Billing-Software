import * as XLSX from 'xlsx';

interface ExportRow {
  bill_number: string;
  created_at: string;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function exportToExcel(data: ExportRow[], filename: string): void {
  const formattedData = data.map((row) => ({
    'Date': new Date(row.created_at).toLocaleDateString(),
    'Bill #': row.bill_number,
    'Product Name': row.product_name,
    'Size': row.size || '-',
    'Quantity': row.quantity,
    'Unit Price': row.unit_price,
    'Amount': row.total_price,
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
    { wch: 12 }, // Amount
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
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
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

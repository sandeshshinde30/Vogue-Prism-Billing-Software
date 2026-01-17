import type { PrinterSettings } from '../types';

export interface BillData {
  billNumber: string;
  date: string;
  storeName: string;
  storeAddress: string;
  phone: string;
  gstNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMode: string;
  cashAmount?: number;
  upiAmount?: number;
  changeAmount?: number;
}

export class ThermalPrinterFormatter {
  private W: number;

  constructor(settings: PrinterSettings) {
    this.W = settings.paperWidth === '58mm' ? 32 : 48;
  }

  private center(text: string): string {
    const t = text.substring(0, this.W);
    const pad = Math.floor((this.W - t.length) / 2);
    return ' '.repeat(pad) + t;
  }

  private leftRight(left: string, right: string): string {
    const maxLeft = this.W - right.length - 1;
    const l = left.substring(0, maxLeft);
    const space = this.W - l.length - right.length;
    return l + ' '.repeat(Math.max(1, space)) + right;
  }

  private line(char: string = '-'): string {
    return char.repeat(this.W);
  }

  private formatMoney(amount: number): string {
    return 'Rs.' + amount.toFixed(2);
  }

  public formatBill(data: BillData): string {
    const lines: string[] = [];
    const W = this.W;

    // NO empty lines at start - start directly with content
    lines.push(this.line('='));
    lines.push(this.center(data.storeName.toUpperCase()));
    lines.push(this.line('='));

    if (data.storeAddress) {
      lines.push(this.center(data.storeAddress.replace(/\n/g, ', ').substring(0, W)));
    }
    if (data.phone) {
      // Format phone with +91 prefix
      const phoneFormatted = data.phone.startsWith('+91') ? data.phone : `+91 ${data.phone}`;
      lines.push(this.center('Ph: ' + phoneFormatted));
    }
    if (data.gstNumber) {
      lines.push(this.center('GST: ' + data.gstNumber));
    }

    lines.push(this.line('-'));

    // Bill info
    const billNo = 'Bill: ' + data.billNumber;
    const dateTime = data.date.substring(0, 17);
    lines.push(this.leftRight(billNo, dateTime));

    lines.push(this.line('-'));

    // Column widths: Name | Qty(4) | Total(12)
    const qtyW = 4;
    const totalW = 12;
    const nameW = W - qtyW - totalW;

    // Header
    lines.push('Item'.padEnd(nameW) + 'Qty'.padStart(qtyW) + 'Total'.padStart(totalW));
    lines.push(this.line('-'));

    // Items
    data.items.forEach(item => {
      const name = item.name.length > nameW - 1 
        ? item.name.substring(0, nameW - 2) + '..' 
        : item.name.padEnd(nameW);
      const qty = String(item.quantity).padStart(qtyW);
      const total = this.formatMoney(item.totalPrice).padStart(totalW);
      lines.push(name + qty + total);
    });

    lines.push(this.line('-'));

    // Totals
    lines.push(this.leftRight('Subtotal:', this.formatMoney(data.subtotal)));

    if (data.discountAmount > 0) {
      lines.push(this.leftRight('Discount:', '-' + this.formatMoney(data.discountAmount)));
    }

    lines.push(this.line('='));
    lines.push(this.leftRight('TOTAL:', this.formatMoney(data.total)));
    lines.push(this.line('='));

    // Payment
    lines.push(this.leftRight('Payment:', data.paymentMode.toUpperCase()));

    if (data.paymentMode === 'mixed') {
      if (data.cashAmount && data.cashAmount > 0) {
        lines.push(this.leftRight('  Cash:', this.formatMoney(data.cashAmount)));
      }
      if (data.upiAmount && data.upiAmount > 0) {
        lines.push(this.leftRight('  UPI:', this.formatMoney(data.upiAmount)));
      }
    } else if (data.paymentMode === 'cash' && data.changeAmount && data.changeAmount > 0) {
      lines.push(this.leftRight('  Paid:', this.formatMoney(data.total + data.changeAmount)));
      lines.push(this.leftRight('  Change:', this.formatMoney(data.changeAmount)));
    }

    lines.push(this.line('='));
    lines.push(this.center('NO REFUND'));
    lines.push(this.center('Exchange within 7 days'));
    lines.push(this.line('='));

    // MORE space before cut so "Visit again!" is visible
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  public formatTestReceipt(): string {
    return this.formatBill({
      billNumber: 'TEST-001',
      date: new Date().toLocaleString(),
      storeName: 'VOGUE PRISM SHIRALA',
      storeAddress: 'Test Address',
      phone: '+91 9876543210',
      gstNumber: '12ABCDE3456F7GH',
      items: [
        { name: 'Sample Product', quantity: 2, unitPrice: 100, totalPrice: 200 },
        { name: 'Test Item', quantity: 1, unitPrice: 150, totalPrice: 150 }
      ],
      subtotal: 350,
      discountPercent: 0,
      discountAmount: 0,
      total: 350,
      paymentMode: 'cash'
    });
  }
}

// Print a bill - using reliable method
export async function printBill(billData: BillData, printerName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await window.electronAPI.getPrinterSettings();
    const printer = printerName || settings.selectedPrinter;
    
    if (!printer) {
      return { success: false, error: 'No printer selected' };
    }

    const formatter = new ThermalPrinterFormatter(settings);
    const content = formatter.formatBill(billData);
    
    // Use the reliable testPrint method that was working before
    return await window.electronAPI.testPrint(printer, content);
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Print test receipt
export async function printTestReceipt(printerName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await window.electronAPI.getPrinterSettings();
    const formatter = new ThermalPrinterFormatter(settings);
    const content = formatter.formatTestReceipt();
    
    return await window.electronAPI.testPrint(printerName, content);
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

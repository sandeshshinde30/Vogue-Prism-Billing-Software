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
  private paperWidth: number;

  constructor(settings: PrinterSettings) {
    this.paperWidth = settings.paperWidth === '58mm' ? 32 : 48; // Characters per line
  }

  private centerText(text: string): string {
    const padding = Math.max(0, Math.floor((this.paperWidth - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private leftRightText(left: string, right: string): string {
    const totalLength = left.length + right.length;
    if (totalLength >= this.paperWidth) {
      return left.substring(0, this.paperWidth - right.length - 1) + ' ' + right;
    }
    const spaces = this.paperWidth - totalLength;
    return left + ' '.repeat(spaces) + right;
  }

  private line(char: string = '='): string {
    return char.repeat(this.paperWidth);
  }

  private formatCurrency(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }

  public formatBill(billData: BillData): string {
    const lines: string[] = [];

    // Header
    lines.push(this.line('='));
    lines.push(this.centerText(billData.storeName.toUpperCase()));
    lines.push(this.line('='));
    
    if (billData.storeAddress) {
      const addressLines = billData.storeAddress.split('\n');
      addressLines.forEach(line => {
        if (line.trim()) {
          lines.push(this.centerText(line.trim()));
        }
      });
    }
    
    if (billData.phone) {
      lines.push(this.centerText(`Ph: ${billData.phone}`));
    }
    
    if (billData.gstNumber) {
      lines.push(this.centerText(`GST: ${billData.gstNumber}`));
    }
    
    lines.push(this.line('-'));
    
    // Bill details
    lines.push(this.leftRightText(`Bill: ${billData.billNumber}`, billData.date));
    lines.push(this.line('-'));
    
    // Items header
    if (this.paperWidth >= 40) {
      lines.push('Item                 Qty  Rate   Total');
    } else {
      lines.push('Item           Qty    Total');
    }
    lines.push(this.line('-'));
    
    // Items
    billData.items.forEach(item => {
      const itemName = item.name.length > (this.paperWidth - 20) 
        ? item.name.substring(0, this.paperWidth - 23) + '...'
        : item.name;
      
      if (this.paperWidth >= 40) {
        const qtyRate = `${item.quantity}  ${this.formatCurrency(item.unitPrice)}`;
        const total = this.formatCurrency(item.totalPrice);
        const itemLine = itemName.padEnd(20) + qtyRate.padEnd(12) + total.padStart(8);
        lines.push(itemLine.substring(0, this.paperWidth));
      } else {
        const qty = `${item.quantity}`;
        const total = this.formatCurrency(item.totalPrice);
        const itemLine = itemName.padEnd(this.paperWidth - 12) + qty.padEnd(4) + total.padStart(8);
        lines.push(itemLine.substring(0, this.paperWidth));
      }
    });
    
    lines.push(this.line('-'));
    
    // Totals
    lines.push(this.leftRightText('Subtotal:', this.formatCurrency(billData.subtotal)));
    
    if (billData.discountPercent > 0) {
      lines.push(this.leftRightText(
        `Discount (${billData.discountPercent}%):`, 
        `-${this.formatCurrency(billData.discountAmount)}`
      ));
    }
    
    lines.push(this.line('-'));
    lines.push(this.leftRightText('TOTAL:', this.formatCurrency(billData.total)));
    lines.push(this.line('-'));
    
    // Payment details
    lines.push(this.leftRightText('Payment:', billData.paymentMode.toUpperCase()));
    
    if (billData.paymentMode === 'mixed') {
      if (billData.cashAmount && billData.cashAmount > 0) {
        lines.push(this.leftRightText('Cash:', this.formatCurrency(billData.cashAmount)));
      }
      if (billData.upiAmount && billData.upiAmount > 0) {
        lines.push(this.leftRightText('UPI:', this.formatCurrency(billData.upiAmount)));
      }
    } else if (billData.paymentMode === 'cash' && billData.changeAmount && billData.changeAmount > 0) {
      lines.push(this.leftRightText('Paid:', this.formatCurrency(billData.total + billData.changeAmount)));
      lines.push(this.leftRightText('Change:', this.formatCurrency(billData.changeAmount)));
    }
    
    lines.push(this.line('='));
    lines.push(this.centerText('Thank you for your business!'));
    lines.push(this.centerText('Visit again!'));
    lines.push(this.line('='));
    
    // Add some blank lines for paper cutting
    lines.push('');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  public formatTestReceipt(): string {
    const testBill: BillData = {
      billNumber: 'TEST-001',
      date: new Date().toLocaleString(),
      storeName: 'VOGUE PRISM BILLING',
      storeAddress: 'Test Address Line 1\nTest City, State - 123456',
      phone: '+91 9876543210',
      gstNumber: '12ABCDE3456F7GH',
      items: [
        {
          name: 'Sample Product 1',
          quantity: 2,
          unitPrice: 100.00,
          totalPrice: 200.00
        },
        {
          name: 'Test Item with Long Name',
          quantity: 1,
          unitPrice: 150.50,
          totalPrice: 150.50
        }
      ],
      subtotal: 350.50,
      discountPercent: 5,
      discountAmount: 17.53,
      total: 332.97,
      paymentMode: 'cash',
      changeAmount: 17.03
    };

    return this.formatBill(testBill);
  }
}

// Utility function to print a bill
export async function printBill(billData: BillData, printerName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get printer settings
    const printerSettings = await window.electronAPI.getPrinterSettings();
    
    // Check if printer is selected
    const selectedPrinter = printerName || printerSettings.selectedPrinter;
    if (!selectedPrinter) {
      return { success: false, error: 'No printer selected. Please configure a printer in settings.' };
    }
    
    // Format the bill
    const formatter = new ThermalPrinterFormatter(printerSettings);
    const formattedBill = formatter.formatBill(billData);
    
    // Use testPrint handler which works for actual printing
    const result = await window.electronAPI.testPrint(selectedPrinter, formattedBill);
    
    return result;
  } catch (error) {
    console.error('Error printing bill:', error);
    return { success: false, error: `Print failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Utility function to print a test receipt
export async function printTestReceipt(printerName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get printer settings
    const printerSettings = await window.electronAPI.getPrinterSettings();
    
    // Format test receipt
    const formatter = new ThermalPrinterFormatter(printerSettings);
    const testReceipt = formatter.formatTestReceipt();
    
    // Print
    const result = await window.electronAPI.testPrint(printerName, testReceipt);
    
    return result;
  } catch (error) {
    console.error('Error printing test receipt:', error);
    return { success: false, error: `Test print failed: ${error}` };
  }
}
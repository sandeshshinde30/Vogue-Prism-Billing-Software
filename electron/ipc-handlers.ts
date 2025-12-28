import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  addProduct, 
  getProducts, 
  getProductById, 
  getProductByBarcode,
  searchProducts,
  getProductsByCategory,
  getLowStockProducts,
  updateProduct, 
  updateStock,
  deleteProduct,
  deactivateProduct,
  reactivateProduct,
  ProductData 
} from './DB/products';
import {
  createBill,
  getBills,
  getBillById,
  getRecentBills,
  getDailySummary,
  getDateRangeSummary,
  getTopSelling,
  updateBill,
  deleteBill,
  BillData
} from './DB/bills';
import {
  getSettings,
  getSetting,
  updateSetting,
  updateAllSettings,
  getTypedSettings
} from './DB/settings';
import {
  getSalesReport,
  exportData,
  getStockMovementReport,
  getCategorySales,
  getPaymentModeSummary,
  getHourlySales,
  getLowStockAlert,
  getProductPerformance
} from './DB/reports';
import {
  exportBackup,
  importBackup,
  getDatabaseStats
} from './DB/backup';
import {
  addActivityLog,
  getActivityLogs,
  getLogsCount,
  cleanupOldLogs
} from './DB/logs';

export function setupIpcHandlers() {
  
  // Clear any existing printer handlers to prevent duplicates
  const printerHandlers = [
    'printer:getList', 'printer:refresh', 'printer:getStatus', 
    'printer:testPrint', 'printer:print', 'printer:printLabel',
    'printer:printLabelWithImage', 'printer:getSettings', 'printer:setSettings'
  ];
  
  printerHandlers.forEach(handler => {
    try {
      ipcMain.removeHandler(handler);
    } catch (error) {
      // Handler doesn't exist, which is fine
    }
  });
  
  // ===== PRODUCT HANDLERS =====
  
  ipcMain.handle('products:create', async (_, product: ProductData) => {
    try {
      const id = addProduct(product);
      return getProductById(Number(id));
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  });

  ipcMain.handle('products:getAll', async (_, includeInactive?: boolean) => {
    try {
      return getProducts(includeInactive);
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  });

  ipcMain.handle('products:getById', async (_, id: number) => {
    try {
      return getProductById(id);
    } catch (error) {
      console.error('Error getting product by id:', error);
      throw error;
    }
  });

  ipcMain.handle('products:getByBarcode', async (_, barcode: string) => {
    try {
      return getProductByBarcode(barcode);
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      throw error;
    }
  });

  ipcMain.handle('products:search', async (_, query: string) => {
    try {
      return searchProducts(query);
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  });

  ipcMain.handle('products:getByCategory', async (_, category: string) => {
    try {
      return getProductsByCategory(category);
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw error;
    }
  });

  ipcMain.handle('products:getLowStock', async () => {
    try {
      return getLowStockProducts();
    } catch (error) {
      console.error('Error getting low stock products:', error);
      throw error;
    }
  });

  ipcMain.handle('products:update', async (_, product: { id: number } & Partial<ProductData>) => {
    try {
      const { id, ...data } = product;
      const success = updateProduct(id, data);
      if (success) {
        return getProductById(id);
      }
      throw new Error('Product not found');
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  });

  ipcMain.handle('products:updateStock', async (_, id: number, quantity: number, changeType: string) => {
    try {
      const success = updateStock(id, quantity, changeType as any);
      return { success };
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  });

  ipcMain.handle('products:delete', async (_, id: number, forceDeactivate?: boolean) => {
    try {
      const result = deleteProduct(id, forceDeactivate);
      return result;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  });

  ipcMain.handle('products:deactivate', async (_, id: number) => {
    try {
      const result = deactivateProduct(id);
      return result;
    } catch (error) {
      console.error('Error deactivating product:', error);
      throw error;
    }
  });

  ipcMain.handle('products:reactivate', async (_, id: number) => {
    try {
      const success = reactivateProduct(id);
      return { success };
    } catch (error) {
      console.error('Error reactivating product:', error);
      throw error;
    }
  });

  // ===== BILL HANDLERS =====

  ipcMain.handle('bills:create', async (_, billData: BillData) => {
    try {
      console.log('Creating bill with data:', billData);
      const result = createBill(billData);
      console.log('Bill created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating bill:', error);
      console.error('Bill data that caused error:', billData);
      throw new Error(`Failed to create bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('bills:getAll', async (_, dateFrom?: string, dateTo?: string) => {
    try {
      return getBills(dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting bills:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getById', async (_, id: number) => {
    try {
      return getBillById(id);
    } catch (error) {
      console.error('Error getting bill by id:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getRecent', async (_, limit?: number) => {
    try {
      return getRecentBills(limit);
    } catch (error) {
      console.error('Error getting recent bills:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getDailySummary', async (_, date?: string) => {
    try {
      return getDailySummary(date);
    } catch (error) {
      console.error('Error getting daily summary:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getDateRangeSummary', async (_, dateFrom: string, dateTo: string) => {
    try {
      return getDateRangeSummary(dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting date range summary:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:getTopSelling', async (_, date?: string) => {
    try {
      return getTopSelling(date);
    } catch (error) {
      console.error('Error getting top selling:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:update', async (_, billId: number, billData: Partial<BillData>) => {
    try {
      return updateBill(billId, billData);
    } catch (error) {
      console.error('Error updating bill:', error);
      throw error;
    }
  });

  ipcMain.handle('bills:delete', async (_, billId: number) => {
    try {
      return deleteBill(billId);
    } catch (error) {
      console.error('Error deleting bill:', error);
      throw error;
    }
  });

  // ===== SETTINGS HANDLERS =====

  ipcMain.handle('settings:getAll', async () => {
    try {
      return getSettings();
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:get', async (_, key: string) => {
    try {
      return getSetting(key);
    } catch (error) {
      console.error('Error getting setting:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', async (_, key: string, value: string) => {
    try {
      const success = updateSetting(key, value);
      return { success };
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:updateAll', async (_, settings: Record<string, string>) => {
    try {
      const success = updateAllSettings(settings);
      return { success };
    } catch (error) {
      console.error('Error updating all settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:getTyped', async () => {
    try {
      return getTypedSettings();
    } catch (error) {
      console.error('Error getting typed settings:', error);
      throw error;
    }
  });

  // ===== REPORTS HANDLERS =====

  ipcMain.handle('reports:getSales', async (_, dateFrom: string, dateTo: string) => {
    try {
      return getSalesReport(dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting sales report:', error);
      throw error;
    }
  });

  ipcMain.handle('reports:exportData', async (_, dateFrom: string, dateTo: string) => {
    try {
      return exportData(dateFrom, dateTo);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  });

  ipcMain.handle('reports:getStockMovement', async (_, dateFrom: string, dateTo: string) => {
    try {
      return getStockMovementReport(dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting stock movement report:', error);
      throw error;
    }
  });

  ipcMain.handle('reports:getCategorySales', async (_, dateFrom: string, dateTo: string) => {
    try {
      return getCategorySales(dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting category sales:', error);
      throw error;
    }
  });

  ipcMain.handle('reports:getPaymentModeSummary', async (_, dateFrom: string, dateTo: string) => {
    try {
      return getPaymentModeSummary(dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting payment mode summary:', error);
      throw error;
    }
  });

  ipcMain.handle('reports:getHourlySales', async (_, date: string) => {
    try {
      return getHourlySales(date);
    } catch (error) {
      console.error('Error getting hourly sales:', error);
      throw error;
    }
  });

  ipcMain.handle('reports:getLowStockAlert', async () => {
    try {
      return getLowStockAlert();
    } catch (error) {
      console.error('Error getting low stock alert:', error);
      throw error;
    }
  });

  ipcMain.handle('reports:getProductPerformance', async (_, dateFrom: string, dateTo: string, limit?: number) => {
    try {
      return getProductPerformance(dateFrom, dateTo, limit);
    } catch (error) {
      console.error('Error getting product performance:', error);
      throw error;
    }
  });

  // ===== BACKUP HANDLERS =====

  ipcMain.handle('backup:export', async () => {
    try {
      return await exportBackup();
    } catch (error) {
      console.error('Error exporting backup:', error);
      throw error;
    }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      return await importBackup();
    } catch (error) {
      console.error('Error importing backup:', error);
      throw error;
    }
  });

  ipcMain.handle('backup:getStats', async () => {
    try {
      return getDatabaseStats();
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  });

  // ===== PRINTER HANDLERS =====

  const execAsync = promisify(exec);

  // Get available printers using CUPS (Linux)
  // Helper function for printer discovery
  const discoverPrinters = async () => {
    const printers: any[] = [];
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: Use PowerShell to get printers
      try {
        const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Default | ConvertTo-Json"');
        const windowsPrinters = JSON.parse(stdout);
        
        // Handle both single printer (object) and multiple printers (array)
        const printerList = Array.isArray(windowsPrinters) ? windowsPrinters : [windowsPrinters];
        
        for (const printer of printerList) {
          if (!printer || !printer.Name) continue;
          
          // Map Windows printer status
          let status = 'unknown';
          switch (printer.PrinterStatus) {
            case 0: status = 'idle'; break;
            case 1: status = 'paused'; break;
            case 2: status = 'error'; break;
            case 3: status = 'pending_deletion'; break;
            case 4: status = 'paper_jam'; break;
            case 5: status = 'paper_out'; break;
            case 6: status = 'manual_feed'; break;
            case 7: status = 'paper_problem'; break;
            case 8: status = 'offline'; break;
            default: status = 'idle'; // Default to idle for normal operation
          }
          
          const name = printer.Name;
          const isNetworkPrinter = printer.PortName?.includes('\\\\') || printer.PortName?.includes('IP_');
          
          printers.push({
            name,
            displayName: name,
            description: printer.DriverName || 'Windows Printer',
            location: isNetworkPrinter ? 'Network' : 'Local',
            status,
            isDefault: printer.Default === true,
            deviceUri: printer.PortName || '',
            makeModel: printer.DriverName || '',
            paperSize: name.toLowerCase().includes('80') || name.toLowerCase().includes('pos') ? '80mm' : 
                       name.toLowerCase().includes('58') ? '58mm' : 'Unknown',
            driverName: printer.DriverName || '',
            isNetworkPrinter,
            capabilities: []
          });
        }
        
        console.log(`Found ${printers.length} Windows printers`);
      } catch (winError) {
        console.error('Error getting Windows printers via PowerShell:', winError);
        
        // Fallback: Try wmic command
        try {
          const { stdout: wmicOutput } = await execAsync('wmic printer get Name,DriverName,PortName,Default /format:csv');
          const lines = wmicOutput.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
          
          for (const line of lines) {
            const parts = line.split(',');
            if (parts.length >= 4) {
              const isDefault = parts[1]?.trim().toLowerCase() === 'true';
              const driverName = parts[2]?.trim() || '';
              const name = parts[3]?.trim() || '';
              const portName = parts[4]?.trim() || '';
              
              if (name) {
                printers.push({
                  name,
                  displayName: name,
                  description: driverName || 'Windows Printer',
                  location: portName?.includes('\\\\') ? 'Network' : 'Local',
                  status: 'idle',
                  isDefault,
                  deviceUri: portName,
                  makeModel: driverName,
                  paperSize: name.toLowerCase().includes('80') || name.toLowerCase().includes('pos') ? '80mm' : 'Unknown',
                  driverName,
                  isNetworkPrinter: portName?.includes('\\\\') || false,
                  capabilities: []
                });
              }
            }
          }
          console.log(`Found ${printers.length} Windows printers via WMIC`);
        } catch (wmicError) {
          console.error('Error getting Windows printers via WMIC:', wmicError);
        }
      }
    } else {
      // Linux/macOS: Use CUPS
      try {
        const { stdout: cupsOutput } = await execAsync('lpstat -p -d');
        const lines = cupsOutput.split('\n').filter(line => line.trim());
        
        let defaultPrinter = '';
        const printerLines: string[] = [];
        
        for (const line of lines) {
          if (line.startsWith('system default destination:')) {
            defaultPrinter = line.split(':')[1].trim();
          } else if (line.startsWith('printer ')) {
            printerLines.push(line);
          }
        }
        
        // Get detailed printer info
        for (const line of printerLines) {
          const match = line.match(/printer (\S+) (.+)/);
          if (match) {
            const name = match[1];
            const description = match[2];
            
            try {
              // Get printer details
              const { stdout: detailsOutput } = await execAsync(`lpoptions -p ${name} -l`);
              const { stdout: statusOutput } = await execAsync(`lpstat -p ${name}`);
              
              // Parse status
              let status = 'unknown';
              if (statusOutput.includes('is idle')) status = 'idle';
              else if (statusOutput.includes('is printing')) status = 'printing';
              else if (statusOutput.includes('disabled')) status = 'offline';
              
              // Get device URI and other details
              let deviceUri = '';
              let makeModel = '';
              try {
                const { stdout: uriOutput } = await execAsync(`lpoptions -p ${name} | grep device-uri`);
                const uriMatch = uriOutput.match(/device-uri=(\S+)/);
                if (uriMatch) deviceUri = uriMatch[1];
              } catch (e) {
                // Ignore URI errors
              }
              
              try {
                const { stdout: modelOutput } = await execAsync(`lpoptions -p ${name} | grep printer-make-and-model`);
                const modelMatch = modelOutput.match(/printer-make-and-model=(.+)/);
                if (modelMatch) makeModel = modelMatch[1];
              } catch (e) {
                // Ignore model errors
              }
              
              printers.push({
                name,
                displayName: name,
                description: description.replace(/is\s+(idle|printing|disabled).*/, '').trim(),
                location: deviceUri.includes('usb://') ? 'USB' : deviceUri.includes('network://') ? 'Network' : 'Local',
                status,
                isDefault: name === defaultPrinter,
                deviceUri,
                makeModel,
                paperSize: name.toLowerCase().includes('80') ? '80mm' : name.toLowerCase().includes('58') ? '58mm' : 'Unknown',
                driverName: makeModel,
                isNetworkPrinter: deviceUri.includes('ipp://') || deviceUri.includes('http://') || deviceUri.includes('socket://'),
                capabilities: detailsOutput.split('\n').filter(line => line.includes('/')).map(line => line.split('/')[0])
              });
            } catch (detailError) {
              // Add basic printer info even if details fail
              printers.push({
                name,
                displayName: name,
                description: description.replace(/is\s+(idle|printing|disabled).*/, '').trim(),
                location: 'Unknown',
                status: 'unknown',
                isDefault: name === defaultPrinter,
                deviceUri: '',
                makeModel: '',
                paperSize: 'Unknown',
                driverName: '',
                isNetworkPrinter: false,
                capabilities: []
              });
            }
          }
        }
      } catch (cupsError) {
        console.log('CUPS not available');
      }
    }
    
    // If still no printers, add a default entry
    if (printers.length === 0) {
      printers.push({
        name: 'Default',
        displayName: 'Default Printer',
        description: 'System Default Printer',
        location: 'System',
        status: 'unknown',
        isDefault: true,
        deviceUri: '',
        makeModel: '',
        paperSize: 'Unknown',
        driverName: '',
        isNetworkPrinter: false,
        capabilities: []
      });
    }
    
    return printers;
  };

  ipcMain.handle('printer:getList', async () => {
    try {
      return await discoverPrinters();
    } catch (error) {
      console.error('Error getting printers:', error);
      return [{
        name: 'Default',
        displayName: 'Default Printer',
        description: 'System Default Printer',
        location: 'System',
        status: 'unknown',
        isDefault: true,
        deviceUri: '',
        makeModel: '',
        paperSize: 'Unknown',
        driverName: '',
        isNetworkPrinter: false,
        capabilities: []
      }];
    }
  });

  // Refresh printer list
  ipcMain.handle('printer:refresh', async () => {
    try {
      return await discoverPrinters();
    } catch (error) {
      console.error('Error refreshing printers:', error);
      return [{
        name: 'Default',
        displayName: 'Default Printer',
        description: 'System Default Printer',
        location: 'System',
        status: 'unknown',
        isDefault: true,
        deviceUri: '',
        makeModel: '',
        paperSize: 'Unknown',
        driverName: '',
        isNetworkPrinter: false,
        capabilities: []
      }];
    }
  });

  // Get printer status
  ipcMain.handle('printer:getStatus', async (_, printerName: string) => {
    try {
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // Windows: Use PowerShell to get printer status
        const escapedPrinter = printerName.replace(/'/g, "''");
        const { stdout } = await execAsync(`powershell -Command "(Get-Printer -Name '${escapedPrinter}').PrinterStatus"`);
        const statusCode = parseInt(stdout.trim(), 10);
        
        let status = 'unknown';
        let details = `Printer: ${printerName}`;
        
        switch (statusCode) {
          case 0: status = 'idle'; details = 'Printer is ready'; break;
          case 1: status = 'paused'; details = 'Printer is paused'; break;
          case 2: status = 'error'; details = 'Printer has an error'; break;
          case 3: status = 'pending_deletion'; details = 'Printer pending deletion'; break;
          case 4: status = 'paper_jam'; details = 'Paper jam'; break;
          case 5: status = 'paper_out'; details = 'Out of paper'; break;
          case 6: status = 'manual_feed'; details = 'Manual feed required'; break;
          case 7: status = 'paper_problem'; details = 'Paper problem'; break;
          case 8: status = 'offline'; details = 'Printer is offline'; break;
          default: status = 'idle'; details = 'Printer is ready';
        }
        
        return { status, details };
      } else {
        // Linux/macOS: Use lpstat
        const { stdout } = await execAsync(`lpstat -p ${printerName}`);
        
        let status = 'unknown';
        let details = stdout.trim();
        
        if (stdout.includes('is idle')) {
          status = 'idle';
        } else if (stdout.includes('is printing')) {
          status = 'printing';
        } else if (stdout.includes('disabled')) {
          status = 'offline';
        }
        
        return { status, details };
      }
    } catch (error) {
      return { status: 'error', details: `Error checking printer status: ${error}` };
    }
  });

  // Test print with sample bill
  ipcMain.handle('printer:testPrint', async (_, printerName: string, customContent?: string) => {
    try {
      const isWindows = process.platform === 'win32';
      
      // Use custom content if provided, otherwise use default test
      // Replace ₹ with Rs. for thermal printer compatibility
      let content = customContent || `================================================
                  VOGUE PRISM
================================================
                Test Address
              Ph: +91 9876543210
             GST: 12ABCDE3456F7GH
------------------------------------------------
Bill: TEST-001                  ${new Date().toLocaleDateString()}
------------------------------------------------
Item                             Qty   Total
------------------------------------------------
Sample Product                     2  Rs.200.00
Test Item                          1  Rs.150.00
------------------------------------------------
Subtotal:                           Rs.350.00
================================================
TOTAL:                              Rs.350.00
================================================
Payment:                                CASH
================================================
         Thank you for your business!
               Visit again!
================================================



`;

      // Replace any remaining ₹ symbols with Rs.
      content = content.replace(/₹/g, 'Rs.');
      
      // Add comprehensive ESC/POS commands for POS80 thermal printer
      const escInit = Buffer.from([0x1B, 0x40]); // ESC @ - Initialize printer
      const escWakeUp = Buffer.from([0x1B, 0x3D, 0x01]); // ESC = 1 - Select printer online
      const escAlign = Buffer.from([0x1B, 0x61, 0x00]); // ESC a 0 - Left align
      const escFont = Buffer.from([0x1B, 0x21, 0x00]); // ESC ! 0 - Normal font
      const escLineSpacing = Buffer.from([0x1B, 0x33, 0x20]); // ESC 3 n - Set line spacing
      const escCharSet = Buffer.from([0x1B, 0x52, 0x00]); // ESC R 0 - Select character set
      
      // Paper feed and cut commands
      const feedLines = Buffer.from([0x0A, 0x0A, 0x0A, 0x0A]); // Multiple line feeds
      const partialCut = Buffer.from([0x1D, 0x56, 0x01]); // GS V 1 - Partial cut (more compatible)
      const fullCut = Buffer.from([0x1D, 0x56, 0x00]); // GS V 0 - Full cut
      
      // Create temporary file for printing
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempFile = path.join(os.tmpdir(), `print-${Date.now()}.txt`);
      
      // Combine all buffers with proper initialization sequence
      const contentBuffer = Buffer.from(content, 'ascii');
      const finalBuffer = Buffer.concat([
        escInit,        // Initialize printer
        escWakeUp,      // Wake up printer
        escAlign,       // Set alignment
        escFont,        // Set font
        escLineSpacing, // Set line spacing
        escCharSet,     // Set character set
        contentBuffer,  // Receipt content
        feedLines,      // Feed paper
        partialCut      // Cut paper (partial cut is more reliable)
      ]);
      fs.writeFileSync(tempFile, finalBuffer);
      
      if (isWindows) {
        // Windows: Use multiple methods to send raw data to thermal printer
        const escapedPrinter = printerName.replace(/'/g, "''").replace(/"/g, '""');
        
        try {
          // Get printer port info for logging
          let portName = 'UNKNOWN';
          try {
            const { stdout: portInfo } = await execAsync(`powershell -Command "try { (Get-Printer -Name '${escapedPrinter}').PortName } catch { 'UNKNOWN' }"`);
            portName = portInfo.trim();
          } catch (e) {
            console.log('Could not get port name');
          }
          
          console.log(`Windows printer: ${printerName}, Port: ${portName}`);
          
          let printSuccess = false;
          let lastError = '';
          
          // Method 1: Try using .NET PrintDocument with RAW data via PowerShell
          console.log('Trying Method 1: .NET RawPrinterHelper...');
          try {
            const psScript1 = `
$ErrorActionPreference = 'Stop'
$printerName = '${escapedPrinter}'
$filePath = '${tempFile.replace(/\\/g, '\\\\')}'

Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrint {
    [StructLayout(LayoutKind.Sequential)]
    public struct DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static int Print(string printerName, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Receipt";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            return Marshal.GetLastWin32Error();
        }

        if (!StartDocPrinter(hPrinter, 1, ref di)) {
            int err = Marshal.GetLastWin32Error();
            ClosePrinter(hPrinter);
            return err;
        }

        if (!StartPagePrinter(hPrinter)) {
            int err = Marshal.GetLastWin32Error();
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return err;
        }

        int written = 0;
        if (!WritePrinter(hPrinter, data, data.Length, out written)) {
            int err = Marshal.GetLastWin32Error();
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return err;
        }

        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return 0;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrint]::Print($printerName, $bytes)
if ($result -eq 0) {
    Write-Output "SUCCESS"
} else {
    Write-Output "ERROR:$result"
}
`;
            const psFile1 = path.join(os.tmpdir(), `print1-${Date.now()}.ps1`);
            fs.writeFileSync(psFile1, psScript1, 'utf8');
            
            const { stdout: result1 } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile1}"`, { timeout: 30000 });
            setTimeout(() => { try { fs.unlinkSync(psFile1); } catch (e) {} }, 1000);
            
            if (result1.trim().includes('SUCCESS')) {
              printSuccess = true;
              console.log('✓ Method 1 succeeded');
            } else {
              lastError = result1.trim();
              console.log(`Method 1 failed: ${lastError}`);
            }
          } catch (e: any) {
            lastError = e.message;
            console.log(`Method 1 exception: ${e.message}`);
          }
          
          // Method 2: Try using print command with /D: switch
          if (!printSuccess) {
            console.log('Trying Method 2: Windows print command...');
            try {
              await execAsync(`print /D:"${printerName}" "${tempFile}"`, { timeout: 15000 });
              printSuccess = true;
              console.log('✓ Method 2 succeeded');
            } catch (e: any) {
              lastError = e.message;
              console.log(`Method 2 failed: ${e.message}`);
            }
          }
          
          // Method 3: Try using PowerShell Out-Printer (for text content)
          if (!printSuccess) {
            console.log('Trying Method 3: Out-Printer...');
            try {
              // Read content as text and send via Out-Printer
              const textContent = content.replace(/'/g, "''");
              await execAsync(`powershell -Command "'${textContent}' | Out-Printer -Name '${escapedPrinter}'"`, { timeout: 15000 });
              printSuccess = true;
              console.log('✓ Method 3 succeeded');
            } catch (e: any) {
              lastError = e.message;
              console.log(`Method 3 failed: ${e.message}`);
            }
          }
          
          // Method 4: Try direct file copy to printer share name
          if (!printSuccess) {
            console.log('Trying Method 4: Copy to printer...');
            try {
              await execAsync(`copy /b "${tempFile}" "\\\\%COMPUTERNAME%\\${printerName}"`, { timeout: 15000 });
              printSuccess = true;
              console.log('✓ Method 4 succeeded');
            } catch (e: any) {
              lastError = e.message;
              console.log(`Method 4 failed: ${e.message}`);
            }
          }
          
          if (!printSuccess) {
            throw new Error(`All print methods failed. Last error: ${lastError}`);
          }
          
          console.log('✓ Successfully printed to Windows printer');
        } catch (error) {
          console.error('❌ Windows printing error:', error);
          throw error;
        }
      } else {
        // Linux/macOS: Use lp command with raw option
        await execAsync(`lp -d "${printerName}" -o raw "${tempFile}"`);
      }
      
      // Clean up temp file after a delay
      setTimeout(() => {
        try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
      }, 5000);
      
      return { success: true };
    } catch (error) {
      console.error('Print error:', error);
      return { success: false, error: `Print failed: ${error}` };
    }
  });

  // Simple debug test - sends just plain text to test printer connectivity
  ipcMain.handle('printer:debugTest', async (_, printerName: string) => {
    try {
      const isWindows = process.platform === 'win32';
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      // Create simple text content
      const simpleText = `
PRINTER TEST
============
Time: ${new Date().toLocaleString()}
Printer: ${printerName}
============
If you see this, printing works!


`;

      const tempFile = path.join(os.tmpdir(), `debug-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, simpleText, 'ascii');
      
      console.log(`Debug test - Printer: ${printerName}, Platform: ${process.platform}`);

      if (isWindows) {
        const escapedPrinter = printerName.replace(/'/g, "''").replace(/"/g, '""');
        
        try {
          console.log('Trying Windows raw print...');
          const psScript = `
$ErrorActionPreference = 'Stop'
$printerName = '${escapedPrinter}'
$filePath = '${tempFile.replace(/\\/g, '\\\\')}'

Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrint {
    [StructLayout(LayoutKind.Sequential)]
    public struct DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static int Print(string printerName, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Debug Test";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            return Marshal.GetLastWin32Error();
        }

        if (!StartDocPrinter(hPrinter, 1, ref di)) {
            int err = Marshal.GetLastWin32Error();
            ClosePrinter(hPrinter);
            return err;
        }

        if (!StartPagePrinter(hPrinter)) {
            int err = Marshal.GetLastWin32Error();
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return err;
        }

        int written = 0;
        if (!WritePrinter(hPrinter, data, data.Length, out written)) {
            int err = Marshal.GetLastWin32Error();
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return err;
        }

        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return 0;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrint]::Print($printerName, $bytes)
if ($result -eq 0) {
    Write-Output "SUCCESS"
} else {
    Write-Output "ERROR:$result"
}
`;
          const psFile = path.join(os.tmpdir(), `debugprint-${Date.now()}.ps1`);
          fs.writeFileSync(psFile, psScript, 'utf8');
          
          const { stdout: result } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 30000 });
          setTimeout(() => { try { fs.unlinkSync(psFile); } catch (e) {} }, 1000);
          
          if (result.trim().includes('SUCCESS')) {
            console.log('Windows raw print succeeded');
            setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 2000);
            return { success: true, message: 'Debug test sent successfully' };
          } else {
            console.log(`Windows raw print failed: ${result.trim()}`);
          }
        } catch (e: any) {
          console.log(`Windows print exception: ${e.message}`);
        }
        
        // Method 2: Try Out-Printer
        console.log('Trying Out-Printer...');
        try {
          const textContent = simpleText.replace(/'/g, "''");
          await execAsync(`powershell -Command "'${textContent}' | Out-Printer -Name '${escapedPrinter}'"`, { timeout: 15000 });
          console.log('Out-Printer succeeded');
          setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 2000);
          return { success: true, message: 'Debug test sent successfully' };
        } catch (e: any) {
          console.log(`Out-Printer failed: ${e.message}`);
        }
        
        setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 2000);
        return { success: false, error: 'All Windows print methods failed' };
      } else {
        // Linux: Use lp/lpr commands
        console.log('Trying Linux print methods...');
        
        // Get printer info first
        try {
          const { stdout: printerInfo } = await execAsync(`lpstat -p "${printerName}" 2>&1`);
          console.log('Printer status:', printerInfo.trim());
        } catch (e) {
          console.log('Could not get printer status');
        }
        
        // Method 1: lp with raw
        try {
          await execAsync(`lp -d "${printerName}" -o raw "${tempFile}"`);
          console.log('lp -o raw succeeded');
          setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 2000);
          return { success: true, message: 'Debug test sent via lp -o raw' };
        } catch (e: any) {
          console.log('lp -o raw failed:', e.message);
        }
        
        // Method 2: lp without raw
        try {
          await execAsync(`lp -d "${printerName}" "${tempFile}"`);
          console.log('lp succeeded');
          setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 2000);
          return { success: true, message: 'Debug test sent via lp' };
        } catch (e: any) {
          console.log('lp failed:', e.message);
        }
        
        // Method 3: lpr
        try {
          await execAsync(`lpr -P "${printerName}" "${tempFile}"`);
          console.log('lpr succeeded');
          setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 2000);
          return { success: true, message: 'Debug test sent via lpr' };
        } catch (e: any) {
          console.log('lpr failed:', e.message);
        }
        
        // Method 4: echo to lp
        try {
          await execAsync(`echo "${simpleText}" | lp -d "${printerName}"`);
          console.log('echo | lp succeeded');
          setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 2000);
          return { success: true, message: 'Debug test sent via echo | lp' };
        } catch (e: any) {
          console.log('echo | lp failed:', e.message);
        }
        
        setTimeout(() => { try { fs.unlinkSync(tempFile); } catch (e) {} }, 2000);
        return { success: false, error: 'All Linux print methods failed. Check CUPS configuration and printer permissions.' };
      }
    } catch (error) {
      console.error('Debug test error:', error);
      return { success: false, error: `Debug test error: ${error}` };
    }
  });

  // Print content
  ipcMain.handle('printer:print', async (_, content: string, printerName?: string, options?: any) => {
    try {
      const { BrowserWindow } = await import('electron');
      
      // Create a hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      // Load the content
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      
      // Print options
      const printOptions = {
        silent: true,
        printBackground: true,
        deviceName: printerName || undefined,
        margins: {
          marginType: 'none' as const
        },
        pageSize: 'A4' as const
      };
      
      // Print
      const success = await printWindow.webContents.print(printOptions);
      
      // Clean up
      printWindow.close();
      
      return { success: true };
    } catch (error) {
      console.error('Error printing:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Print failed' 
      };
    }
  });

  // Print label - dedicated handler for label printers (Honeywell IH-210, etc.)
  ipcMain.handle('printer:printLabel', async (_, content: string, printerName: string) => {
    try {
      const isWindows = process.platform === 'win32';
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      // Create temporary file for printing
      const tempFile = path.join(os.tmpdir(), `label-${Date.now()}.prn`);
      
      // Write content to temp file (ZPL or ESC/POS commands)
      fs.writeFileSync(tempFile, content, 'binary');
      
      console.log(`Printing label to: ${printerName}`);
      console.log(`Content length: ${content.length} bytes`);
      
      if (isWindows) {
        // Windows: Use raw printing
        const escapedPrinter = printerName.replace(/'/g, "''").replace(/"/g, '""');
        
        try {
          // Try .NET RawPrinterHelper
          const psScript = `
$ErrorActionPreference = 'Stop'
$printerName = '${escapedPrinter}'
$filePath = '${tempFile.replace(/\\/g, '\\\\')}'

Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrint {
    [StructLayout(LayoutKind.Sequential)]
    public struct DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static int Print(string printerName, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Label";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return Marshal.GetLastWin32Error();
        if (!StartDocPrinter(hPrinter, 1, ref di)) { ClosePrinter(hPrinter); return Marshal.GetLastWin32Error(); }
        if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return Marshal.GetLastWin32Error(); }
        
        int written = 0;
        if (!WritePrinter(hPrinter, data, data.Length, out written)) {
            EndPagePrinter(hPrinter); EndDocPrinter(hPrinter); ClosePrinter(hPrinter);
            return Marshal.GetLastWin32Error();
        }
        
        EndPagePrinter(hPrinter); EndDocPrinter(hPrinter); ClosePrinter(hPrinter);
        return 0;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrint]::Print($printerName, $bytes)
if ($result -eq 0) { Write-Output "SUCCESS" } else { Write-Output "ERROR:$result" }
`;
          const psFile = path.join(os.tmpdir(), `labelprint-${Date.now()}.ps1`);
          fs.writeFileSync(psFile, psScript, 'utf8');
          
          const { stdout } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 30000 });
          setTimeout(() => { try { fs.unlinkSync(psFile); } catch (e) {} }, 1000);
          
          if (!stdout.trim().includes('SUCCESS')) {
            throw new Error(`Print failed: ${stdout.trim()}`);
          }
        } catch (winError) {
          console.error('Windows label print error:', winError);
          throw winError;
        }
      } else {
        // Linux: Use lp command with raw option for label printers
        // The -o raw option sends data directly to the printer without processing
        try {
          // First try with raw option (best for ZPL/ESC-POS)
          await execAsync(`lp -d "${printerName}" -o raw "${tempFile}"`);
          console.log('Label printed successfully using lp -o raw');
        } catch (lpError) {
          console.log('lp -o raw failed, trying alternative methods...');
          
          try {
            // Try without raw option
            await execAsync(`lp -d "${printerName}" "${tempFile}"`);
            console.log('Label printed successfully using lp');
          } catch (lpError2) {
            // Try using lpr as fallback
            try {
              await execAsync(`lpr -P "${printerName}" -o raw "${tempFile}"`);
              console.log('Label printed successfully using lpr');
            } catch (lprError) {
              // Final fallback: try direct device write if we can find the device
              try {
                // Get printer device URI
                const { stdout: printerInfo } = await execAsync(`lpstat -v "${printerName}"`);
                const deviceMatch = printerInfo.match(/device for [^:]+:\s*(.+)/);
                
                if (deviceMatch && deviceMatch[1]) {
                  const deviceUri = deviceMatch[1].trim();
                  
                  // If it's a USB device, try direct write
                  if (deviceUri.startsWith('usb://') || deviceUri.includes('/dev/usb')) {
                    // Extract device path or use common USB printer paths
                    const usbDevices = ['/dev/usb/lp0', '/dev/usb/lp1', '/dev/lp0'];
                    
                    for (const device of usbDevices) {
                      try {
                        await execAsync(`cat "${tempFile}" > ${device}`);
                        console.log(`Label printed via direct device: ${device}`);
                        break;
                      } catch (devError) {
                        continue;
                      }
                    }
                  }
                }
              } catch (deviceError) {
                console.error('All print methods failed');
                throw new Error('Failed to print label. Please check printer connection and permissions.');
              }
            }
          }
        }
      }
      
      // Clean up temp file after a delay
      setTimeout(() => {
        try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
      }, 5000);
      
      return { success: true };
    } catch (error) {
      console.error('Label print error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Label print failed' 
      };
    }
  });

  // Print label with image - uses TSPL commands for Honeywell IH-210 and similar label printers
  ipcMain.handle('printer:printLabelWithImage', async (_, barcode: string, price: number, printerName: string, design?: { logoWidth?: number; barcodeWidth?: number; barcodeHeight?: number; textSize?: number; priceSize?: number }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      const { app } = await import('electron');
      const { PNG } = await import('pngjs');
      
      // Validate printer name
      if (!printerName || printerName.trim() === '') {
        return { success: false, error: 'No printer selected. Please select a label printer.' };
      }
      
      console.log('Printing label:', barcode, 'Price:', price, 'to printer:', printerName);
      
      const isWindows = process.platform === 'win32';
      const barcodeHeight = design?.barcodeHeight || 50;
      
      // Get the app path for logo files
      const appPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'public')
        : path.join(app.getAppPath(), 'public');
      
      // Helper function to convert PNG to TSPL BITMAP command
      const pngToTsplBitmap = (pngPath: string, targetWidth: number, targetHeight: number, x: number, y: number): string => {
        try {
          if (!fs.existsSync(pngPath)) {
            console.log('Logo file not found:', pngPath);
            return '';
          }
          
          // Read and parse PNG
          const pngBuffer = fs.readFileSync(pngPath);
          const png = PNG.sync.read(pngBuffer);
          
          // Calculate scale to fit target dimensions
          const scaleX = targetWidth / png.width;
          const scaleY = targetHeight / png.height;
          const scale = Math.min(scaleX, scaleY);
          
          const scaledWidth = Math.floor(png.width * scale);
          const scaledHeight = Math.floor(png.height * scale);
          
          // TSPL BITMAP: width is in bytes (8 pixels per byte)
          const widthBytes = Math.ceil(scaledWidth / 8);
          const bitmapData: number[] = [];
          
          // Convert to 1-bit monochrome bitmap
          for (let row = 0; row < scaledHeight; row++) {
            for (let byteCol = 0; byteCol < widthBytes; byteCol++) {
              let byte = 0;
              for (let bit = 0; bit < 8; bit++) {
                const pixelX = byteCol * 8 + bit;
                if (pixelX < scaledWidth) {
                  // Map to original image coordinates
                  const srcX = Math.floor(pixelX / scale);
                  const srcY = Math.floor(row / scale);
                  
                  if (srcX < png.width && srcY < png.height) {
                    const idx = (srcY * png.width + srcX) * 4;
                    const r = png.data[idx];
                    const g = png.data[idx + 1];
                    const b = png.data[idx + 2];
                    const a = png.data[idx + 3];
                    
                    // Convert to grayscale and threshold
                    // Consider alpha - if transparent, treat as white (no print)
                    if (a > 128) {
                      const gray = (r * 0.299 + g * 0.587 + b * 0.114);
                      // If dark pixel (gray < 128), set bit to 1 (print black)
                      if (gray < 128) {
                        byte |= (1 << (7 - bit));
                      }
                    }
                  }
                }
              }
              bitmapData.push(byte);
            }
          }
          
          // Generate TSPL BITMAP command
          // BITMAP X,Y,width,height,mode,data
          // mode 0 = overwrite
          let cmd = `BITMAP ${x},${y},${widthBytes},${scaledHeight},0,`;
          
          // Convert bitmap data to hex string
          const hexData = bitmapData.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
          cmd += hexData + '\r\n';
          
          console.log(`Logo bitmap: ${scaledWidth}x${scaledHeight} pixels, ${widthBytes}x${scaledHeight} bytes`);
          
          return cmd;
        } catch (e) {
          console.log('Error processing logo:', e);
          return '';
        }
      };
      
      // Generate TSPL commands for Honeywell IH-210 (50mm x 25mm label)
      // At 203 DPI: 50mm = ~400 dots, 25mm = ~200 dots
      let tspl = '';
      
      // Set label size: 50mm width, 25mm height (in mm)
      tspl += 'SIZE 50 mm, 25 mm\r\n';
      
      // Set gap between labels (typically 2-3mm)
      tspl += 'GAP 2 mm, 0 mm\r\n';
      
      // Set print direction (0 = normal)
      tspl += 'DIRECTION 0\r\n';
      
      // Set reference point
      tspl += 'REFERENCE 0,0\r\n';
      
      // Clear image buffer
      tspl += 'CLS\r\n';
      
      // Add logos (left side)
      const logoUpPath = path.join(appPath, 'label-logo-up.png');
      const logoDownPath = path.join(appPath, 'label-logo-down.png');
      
      // Logo up - top left (target: ~80 dots wide, ~50 dots tall)
      const logoUpCmd = pngToTsplBitmap(logoUpPath, 80, 45, 5, 5);
      if (logoUpCmd) {
        tspl += logoUpCmd;
      }
      
      // Logo down - bottom left (target: ~80 dots wide, ~50 dots tall)
      const logoDownCmd = pngToTsplBitmap(logoDownPath, 80, 45, 5, 55);
      if (logoDownCmd) {
        tspl += logoDownCmd;
      }
      
      // Print barcode - CODE128 (right side)
      // BARCODE X,Y,"code type",height,human readable,rotation,narrow,wide,"content"
      // Position: X=100 (after logo area), Y=10 (from top)
      tspl += `BARCODE 100,8,"128",${barcodeHeight},0,0,2,4,"${barcode}"\r\n`;
      
      // Print barcode text below barcode
      // TEXT X,Y,"font",rotation,x-multiplication,y-multiplication,"content"
      // Font 2 = 12x20 dots
      tspl += `TEXT 100,${8 + barcodeHeight + 3},"2",0,1,1,"${barcode}"\r\n`;
      
      // Print price - larger font
      // Font 4 = 24x32 dots
      tspl += `TEXT 100,${8 + barcodeHeight + 22},"4",0,1,1,"Rs.${price}"\r\n`;
      
      // Print 1 copy
      tspl += 'PRINT 1,1\r\n';
      
      // Create temp file - write as binary since bitmap data may contain special chars
      const tempFile = path.join(os.tmpdir(), `label-${Date.now()}.prn`);
      fs.writeFileSync(tempFile, tspl, 'binary');
      
      console.log('TSPL commands generated, length:', tspl.length);
      console.log('Temp file:', tempFile);
      
      let printed = false;
      let lastError = '';
      
      if (isWindows) {
        // Windows: Use raw printing via PowerShell
        const escapedPrinter = printerName.replace(/'/g, "''").replace(/"/g, '""');
        
        const psScript = `
$ErrorActionPreference = 'Stop'
$printerName = '${escapedPrinter}'
$filePath = '${tempFile.replace(/\\/g, '\\\\')}'

Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrint {
    [StructLayout(LayoutKind.Sequential)]
    public struct DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static int Print(string printerName, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Label";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return Marshal.GetLastWin32Error();
        if (!StartDocPrinter(hPrinter, 1, ref di)) { ClosePrinter(hPrinter); return Marshal.GetLastWin32Error(); }
        if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return Marshal.GetLastWin32Error(); }
        
        int written = 0;
        if (!WritePrinter(hPrinter, data, data.Length, out written)) {
            EndPagePrinter(hPrinter); EndDocPrinter(hPrinter); ClosePrinter(hPrinter);
            return Marshal.GetLastWin32Error();
        }
        
        EndPagePrinter(hPrinter); EndDocPrinter(hPrinter); ClosePrinter(hPrinter);
        return 0;
    }
}
'@

$bytes = [System.IO.File]::ReadAllBytes($filePath)
$result = [RawPrint]::Print($printerName, $bytes)
if ($result -eq 0) { Write-Output "SUCCESS" } else { Write-Output "ERROR:$result" }
`;
        const psFile = path.join(os.tmpdir(), `labelprint-${Date.now()}.ps1`);
        fs.writeFileSync(psFile, psScript, 'utf8');
        
        try {
          const { stdout } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 30000 });
          setTimeout(() => { try { fs.unlinkSync(psFile); } catch (e) {} }, 1000);
          
          if (stdout.trim().includes('SUCCESS')) {
            printed = true;
            console.log('Windows raw print successful');
          } else {
            lastError = stdout.trim();
          }
        } catch (winError: any) {
          lastError = winError.message;
          console.error('Windows print error:', winError);
        }
      } else {
        // Linux: Try multiple methods to send raw data to printer
        
        // First, check if printer exists and get its device
        try {
          const { stdout: printerInfo } = await execAsync(`lpstat -v "${printerName}" 2>&1`);
          console.log('Printer info:', printerInfo);
        } catch (e) {
          console.log('Could not get printer info');
        }
        
        // Method 1: lp with raw option (most reliable for TSPL printers)
        if (!printed) {
          try {
            console.log('Trying: lp -d "' + printerName + '" -o raw "' + tempFile + '"');
            await execAsync(`lp -d "${printerName}" -o raw "${tempFile}"`);
            console.log('lp -o raw succeeded');
            printed = true;
          } catch (e: any) {
            lastError = e.message;
            console.log('lp -o raw failed:', e.message);
          }
        }
        
        // Method 2: Direct cat to printer device
        if (!printed) {
          try {
            // Find the USB device for this printer
            const { stdout: deviceInfo } = await execAsync(`lpstat -v "${printerName}" 2>&1`);
            console.log('Device info:', deviceInfo);
            
            // Try common USB printer device paths
            const usbDevices = ['/dev/usb/lp0', '/dev/usb/lp1', '/dev/usb/lp2', '/dev/lp0', '/dev/lp1'];
            
            for (const device of usbDevices) {
              try {
                // Check if device exists
                await execAsync(`test -e ${device}`);
                console.log(`Trying direct write to ${device}`);
                await execAsync(`cat "${tempFile}" > ${device}`);
                console.log(`Direct write to ${device} succeeded`);
                printed = true;
                break;
              } catch (devErr) {
                continue;
              }
            }
          } catch (e: any) {
            console.log('Direct device write failed:', e.message);
          }
        }
        
        // Method 3: lp without raw
        if (!printed) {
          try {
            console.log('Trying: lp -d "' + printerName + '" "' + tempFile + '"');
            await execAsync(`lp -d "${printerName}" "${tempFile}"`);
            console.log('lp succeeded');
            printed = true;
          } catch (e: any) {
            lastError = e.message;
            console.log('lp failed:', e.message);
          }
        }
        
        // Method 4: lpr with raw
        if (!printed) {
          try {
            console.log('Trying: lpr -P "' + printerName + '" -o raw "' + tempFile + '"');
            await execAsync(`lpr -P "${printerName}" -o raw "${tempFile}"`);
            console.log('lpr -o raw succeeded');
            printed = true;
          } catch (e: any) {
            lastError = e.message;
            console.log('lpr failed:', e.message);
          }
        }
      }
      
      // Cleanup temp file
      setTimeout(() => {
        try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
      }, 5000);
      
      if (printed) {
        return { success: true };
      } else {
        return { success: false, error: `Print failed: ${lastError}. Make sure the printer is connected and CUPS is configured correctly.` };
      }
    } catch (error) {
      console.error('Label print error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Print failed' };
    }
  });

  // ===== LOGS HANDLERS =====

  ipcMain.handle('logs:getActivity', async (_, limit?: number, offset?: number, entityType?: string, dateFrom?: string, dateTo?: string) => {
    try {
      return getActivityLogs(limit, offset, entityType, dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw error;
    }
  });

  ipcMain.handle('logs:getCount', async (_, entityType?: string, dateFrom?: string, dateTo?: string) => {
    try {
      return getLogsCount(entityType, dateFrom, dateTo);
    } catch (error) {
      console.error('Error getting logs count:', error);
      throw error;
    }
  });

  ipcMain.handle('logs:cleanup', async () => {
    try {
      const deletedCount = cleanupOldLogs();
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      throw error;
    }
  });

  // ===== PRINTER SETTINGS HANDLERS =====

  ipcMain.handle('printer:getSettings', async () => {
    try {
      const settings = getSettings();
      return {
        selectedPrinter: settings.selectedPrinter || '',
        paperWidth: settings.paperWidth || '80mm',
        autoPrint: settings.autoPrint === 'true',
        printDensity: settings.printDensity || 'medium',
        cutPaper: settings.cutPaper === 'true',
        printSpeed: settings.printSpeed || 'medium',
        encoding: settings.encoding || 'utf8'
      };
    } catch (error) {
      console.error('Error getting printer settings:', error);
      return {
        selectedPrinter: '',
        paperWidth: '80mm',
        autoPrint: false,
        printDensity: 'medium',
        cutPaper: true,
        printSpeed: 'medium',
        encoding: 'utf8'
      };
    }
  });

  ipcMain.handle('printer:setSettings', async (_, settings: any) => {
    try {
      const settingsToUpdate: Record<string, string> = {};
      
      if (settings.selectedPrinter !== undefined) settingsToUpdate.selectedPrinter = settings.selectedPrinter;
      if (settings.paperWidth !== undefined) settingsToUpdate.paperWidth = settings.paperWidth;
      if (settings.autoPrint !== undefined) settingsToUpdate.autoPrint = settings.autoPrint.toString();
      if (settings.printDensity !== undefined) settingsToUpdate.printDensity = settings.printDensity;
      if (settings.cutPaper !== undefined) settingsToUpdate.cutPaper = settings.cutPaper.toString();
      if (settings.printSpeed !== undefined) settingsToUpdate.printSpeed = settings.printSpeed;
      if (settings.encoding !== undefined) settingsToUpdate.encoding = settings.encoding;
      
      updateAllSettings(settingsToUpdate);
      
      return { success: true };
    } catch (error) {
      console.error('Error saving printer settings:', error);
      return { success: false, error: `Failed to save printer settings: ${error}` };
    }
  });

  console.log('All IPC handlers set up successfully');
}
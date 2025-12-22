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
    'printer:testPrint', 'printer:print', 'printer:getSettings', 'printer:setSettings'
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
      
      // Add ESC/POS paper cut command at the end
      // GS V m - Cut paper: \x1D\x56\x00 = full cut, \x1D\x56\x01 = partial cut
      const cutCommand = Buffer.from([0x1D, 0x56, 0x00]);
      
      // Create temporary file for printing
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempFile = path.join(os.tmpdir(), `print-${Date.now()}.txt`);
      
      // Write content as ASCII + cut command
      const contentBuffer = Buffer.from(content, 'ascii');
      const finalBuffer = Buffer.concat([contentBuffer, cutCommand]);
      fs.writeFileSync(tempFile, finalBuffer);
      
      if (isWindows) {
        // Windows: Use PowerShell to print raw content
        // Escape the printer name and file path for PowerShell
        const escapedPrinter = printerName.replace(/'/g, "''");
        const escapedFile = tempFile.replace(/\\/g, '\\\\');
        
        // Try multiple Windows printing methods
        try {
          // Method 1: Use print command (simplest)
          await execAsync(`print /D:"${printerName}" "${tempFile}"`);
        } catch (printError) {
          console.log('Print command failed, trying copy method...');
          try {
            // Method 2: Copy to printer port (for USB printers)
            // First get the port name
            const { stdout: portInfo } = await execAsync(`powershell -Command "(Get-Printer -Name '${escapedPrinter}').PortName"`);
            const portName = portInfo.trim();
            
            if (portName && (portName.startsWith('USB') || portName.startsWith('COM'))) {
              await execAsync(`copy /b "${tempFile}" "${portName}"`);
            } else {
              // Method 3: Use Out-Printer PowerShell cmdlet
              await execAsync(`powershell -Command "Get-Content -Path '${escapedFile}' -Raw | Out-Printer -Name '${escapedPrinter}'"`);
            }
          } catch (copyError) {
            console.log('Copy method failed, trying raw print...');
            // Method 4: Use .NET printing via PowerShell for raw data
            const psScript = `
              $printerName = '${escapedPrinter}'
              $content = [System.IO.File]::ReadAllBytes('${escapedFile}')
              $printer = New-Object System.Drawing.Printing.PrintDocument
              $printer.PrinterSettings.PrinterName = $printerName
              
              # For raw printing, we'll use RawPrinterHelper
              Add-Type -TypeDefinition @"
              using System;
              using System.Runtime.InteropServices;
              public class RawPrinterHelper {
                [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
                public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
                [DllImport("winspool.drv", SetLastError = true)]
                public static extern bool ClosePrinter(IntPtr hPrinter);
                [DllImport("winspool.drv", SetLastError = true)]
                public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, ref DOCINFO pDocInfo);
                [DllImport("winspool.drv", SetLastError = true)]
                public static extern bool EndDocPrinter(IntPtr hPrinter);
                [DllImport("winspool.drv", SetLastError = true)]
                public static extern bool StartPagePrinter(IntPtr hPrinter);
                [DllImport("winspool.drv", SetLastError = true)]
                public static extern bool EndPagePrinter(IntPtr hPrinter);
                [DllImport("winspool.drv", SetLastError = true)]
                public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
                
                [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
                public struct DOCINFO {
                  public int cbSize;
                  public string pDocName;
                  public string pOutputFile;
                  public string pDatatype;
                }
                
                public static bool SendBytesToPrinter(string printerName, byte[] bytes) {
                  IntPtr hPrinter;
                  if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
                  
                  DOCINFO di = new DOCINFO();
                  di.cbSize = Marshal.SizeOf(di);
                  di.pDocName = "Raw Document";
                  di.pDatatype = "RAW";
                  
                  if (!StartDocPrinter(hPrinter, 1, ref di)) { ClosePrinter(hPrinter); return false; }
                  if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return false; }
                  
                  IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
                  Marshal.Copy(bytes, 0, pBytes, bytes.Length);
                  int written;
                  bool success = WritePrinter(hPrinter, pBytes, bytes.Length, out written);
                  Marshal.FreeCoTaskMem(pBytes);
                  
                  EndPagePrinter(hPrinter);
                  EndDocPrinter(hPrinter);
                  ClosePrinter(hPrinter);
                  return success;
                }
              }
"@
              [RawPrinterHelper]::SendBytesToPrinter($printerName, $content)
            `;
            await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
          }
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
          marginType: 'none'
        },
        pageSize: 'A4'
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
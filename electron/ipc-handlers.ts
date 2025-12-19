import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getDatabase, getDbPath } from './database';
import fs from 'node:fs';
import path from 'node:path';

export function setupIpcHandlers(): void {
  const db = getDatabase();

  // Products
  ipcMain.handle('products:getAll', () => {
    return db.prepare(`
      SELECT id, name, category, size, barcode, price, stock, 
             low_stock_threshold as lowStockThreshold,
             created_at as createdAt, updated_at as updatedAt
      FROM products ORDER BY name
    `).all();
  });

  ipcMain.handle('products:getByBarcode', (_, barcode: string) => {
    return db.prepare(`
      SELECT id, name, category, size, barcode, price, stock,
             low_stock_threshold as lowStockThreshold,
             created_at as createdAt, updated_at as updatedAt
      FROM products WHERE barcode = ?
    `).get(barcode);
  });

  ipcMain.handle('products:search', (_, query: string) => {
    const searchTerm = `%${query}%`;
    return db.prepare(`
      SELECT id, name, category, size, barcode, price, stock,
             low_stock_threshold as lowStockThreshold,
             created_at as createdAt, updated_at as updatedAt
      FROM products 
      WHERE name LIKE ? OR barcode LIKE ? OR category LIKE ?
      ORDER BY name LIMIT 50
    `).all(searchTerm, searchTerm, searchTerm);
  });

  ipcMain.handle('products:getByCategory', (_, category: string) => {
    return db.prepare(`
      SELECT id, name, category, size, barcode, price, stock,
             low_stock_threshold as lowStockThreshold,
             created_at as createdAt, updated_at as updatedAt
      FROM products WHERE category = ? ORDER BY name
    `).all(category);
  });

  ipcMain.handle('products:create', (_, product) => {
    const stmt = db.prepare(`
      INSERT INTO products (name, category, size, barcode, price, stock, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      product.name,
      product.category,
      product.size,
      product.barcode,
      product.price,
      product.stock,
      product.lowStockThreshold
    );
    return { id: result.lastInsertRowid, ...product };
  });

  ipcMain.handle('products:update', (_, product) => {
    const stmt = db.prepare(`
      UPDATE products SET 
        name = ?, category = ?, size = ?, barcode = ?, 
        price = ?, stock = ?, low_stock_threshold = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      product.name,
      product.category,
      product.size,
      product.barcode,
      product.price,
      product.stock,
      product.lowStockThreshold,
      product.id
    );
    return product;
  });

  ipcMain.handle('products:delete', (_, id: number) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('products:updateStock', (_, id: number, quantity: number, changeType: string) => {
    const updateStmt = db.prepare('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO stock_log (product_id, change_type, quantity_change) VALUES (?, ?, ?)');
    
    db.transaction(() => {
      updateStmt.run(quantity, id);
      logStmt.run(id, changeType, quantity);
    })();
    
    return { success: true };
  });

  ipcMain.handle('products:getLowStock', () => {
    return db.prepare(`
      SELECT id, name, category, size, barcode, price, stock,
             low_stock_threshold as lowStockThreshold
      FROM products WHERE stock <= low_stock_threshold ORDER BY stock
    `).all();
  });

  // Bills
  ipcMain.handle('bills:create', (_, billData) => {
    const { items, subtotal, discountPercent, discountAmount, total, paymentMode } = billData;
    
    // Get next bill number
    const settings = db.prepare('SELECT value FROM settings WHERE key = ?');
    const prefix = (settings.get('billPrefix') as { value: string })?.value || 'VP-';
    const startNum = parseInt((settings.get('startingBillNumber') as { value: string })?.value || '1001');
    
    const lastBill = db.prepare('SELECT bill_number FROM bills ORDER BY id DESC LIMIT 1').get() as { bill_number: string } | undefined;
    let nextNum = startNum;
    if (lastBill) {
      const lastNum = parseInt(lastBill.bill_number.replace(prefix, ''));
      nextNum = Math.max(lastNum + 1, startNum);
    }
    const billNumber = `${prefix}${nextNum}`;

    const insertBill = db.prepare(`
      INSERT INTO bills (bill_number, subtotal, discount_percent, discount_amount, total, payment_mode)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO bill_items (bill_id, product_id, product_name, size, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    const logStock = db.prepare('INSERT INTO stock_log (product_id, change_type, quantity_change, reference_id) VALUES (?, ?, ?, ?)');

    let billId: number = 0;

    db.transaction(() => {
      const result = insertBill.run(billNumber, subtotal, discountPercent, discountAmount, total, paymentMode);
      billId = result.lastInsertRowid as number;

      for (const item of items) {
        insertItem.run(
          billId,
          item.product.id,
          item.product.name,
          item.product.size,
          item.quantity,
          item.product.price,
          item.product.price * item.quantity
        );
        updateStock.run(item.quantity, item.product.id);
        logStock.run(item.product.id, 'sale', -item.quantity, billId);
      }
    })();

    return {
      id: billId,
      billNumber,
      subtotal,
      discountPercent,
      discountAmount,
      total,
      paymentMode,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
  });

  ipcMain.handle('bills:getAll', (_, dateFrom?: string, dateTo?: string) => {
    let query = `
      SELECT id, bill_number as billNumber, subtotal, 
             discount_percent as discountPercent, discount_amount as discountAmount,
             total, payment_mode as paymentMode, status, created_at as createdAt
      FROM bills WHERE status = 'completed'
    `;
    const params: string[] = [];

    if (dateFrom) {
      query += ' AND date(created_at) >= date(?)';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND date(created_at) <= date(?)';
      params.push(dateTo);
    }

    query += ' ORDER BY created_at DESC';
    return db.prepare(query).all(...params);
  });

  ipcMain.handle('bills:getById', (_, id: number) => {
    const bill = db.prepare(`
      SELECT id, bill_number as billNumber, subtotal,
             discount_percent as discountPercent, discount_amount as discountAmount,
             total, payment_mode as paymentMode, status, created_at as createdAt
      FROM bills WHERE id = ?
    `).get(id);

    const items = db.prepare(`
      SELECT id, bill_id as billId, product_id as productId, product_name as productName,
             size, quantity, unit_price as unitPrice, total_price as totalPrice
      FROM bill_items WHERE bill_id = ?
    `).all(id);

    return { bill, items };
  });

  ipcMain.handle('bills:getDailySummary', (_, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as totalSales,
        COUNT(*) as totalBills,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cashSales,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN total ELSE 0 END), 0) as upiSales
      FROM bills 
      WHERE date(created_at) = date(?) AND status = 'completed'
    `).get(targetDate) as { totalSales: number; totalBills: number; cashSales: number; upiSales: number };

    const itemsSold = db.prepare(`
      SELECT COALESCE(SUM(bi.quantity), 0) as itemsSold
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE date(b.created_at) = date(?) AND b.status = 'completed'
    `).get(targetDate) as { itemsSold: number };

    return { ...summary, itemsSold: itemsSold.itemsSold };
  });

  ipcMain.handle('bills:getTopSelling', (_, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    return db.prepare(`
      SELECT bi.product_name as productName, bi.size, SUM(bi.quantity) as totalQty
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE date(b.created_at) = date(?) AND b.status = 'completed'
      GROUP BY bi.product_id
      ORDER BY totalQty DESC
      LIMIT 5
    `).all(targetDate);
  });

  ipcMain.handle('bills:getRecentBills', (_, limit: number = 5) => {
    return db.prepare(`
      SELECT id, bill_number as billNumber, total, payment_mode as paymentMode,
             created_at as createdAt
      FROM bills WHERE status = 'completed'
      ORDER BY created_at DESC LIMIT ?
    `).all(limit);
  });

  // Reports
  ipcMain.handle('reports:getSalesReport', (_, dateFrom: string, dateTo: string) => {
    return db.prepare(`
      SELECT 
        bi.product_name as productName,
        bi.size,
        p.category,
        SUM(bi.quantity) as quantitySold,
        SUM(bi.total_price) as totalAmount
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN products p ON bi.product_id = p.id
      WHERE date(b.created_at) >= date(?) AND date(b.created_at) <= date(?)
        AND b.status = 'completed'
      GROUP BY bi.product_id
      ORDER BY totalAmount DESC
    `).all(dateFrom, dateTo);
  });

  ipcMain.handle('reports:exportData', (_, dateFrom: string, dateTo: string) => {
    const bills = db.prepare(`
      SELECT b.bill_number, b.created_at, bi.product_name, bi.size, 
             bi.quantity, bi.unit_price, bi.total_price
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE date(b.created_at) >= date(?) AND date(b.created_at) <= date(?)
        AND b.status = 'completed'
      ORDER BY b.created_at
    `).all(dateFrom, dateTo);
    
    return bills;
  });

  // Settings
  ipcMain.handle('settings:getAll', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  });

  ipcMain.handle('settings:update', (_, key: string, value: string) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    return { success: true };
  });

  ipcMain.handle('settings:updateAll', (_, settings: Record<string, string>) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, value);
      }
    })();
    return { success: true };
  });

  // Backup & Restore
  ipcMain.handle('backup:export', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: 'No window' };

    const result = await dialog.showSaveDialog(win, {
      title: 'Export Database Backup',
      defaultPath: `vogue-prism-backup-${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true };
    }

    try {
      const dbPath = getDbPath();
      fs.copyFileSync(dbPath, result.filePath);
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('backup:import', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: 'No window' };

    const result = await dialog.showOpenDialog(win, {
      title: 'Import Database Backup',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    try {
      const dbPath = getDbPath();
      const backupPath = `${dbPath}.backup-${Date.now()}`;
      
      // Backup current database
      fs.copyFileSync(dbPath, backupPath);
      
      // Import new database
      fs.copyFileSync(result.filePaths[0], dbPath);
      
      return { success: true, requiresRestart: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Printer
  ipcMain.handle('printer:getList', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return [];
    
    const printers = await win.webContents.getPrintersAsync();
    return printers.map(p => ({ name: p.name, isDefault: p.isDefault }));
  });

  ipcMain.handle('printer:print', async (_, content: string, printerName?: string) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: 'No window' };

    try {
      // Create a hidden window for printing
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: true },
      });

      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);
      
      const options: Electron.WebContentsPrintOptions = {
        silent: true,
        printBackground: true,
        deviceName: printerName || undefined,
      };

      printWin.webContents.print(options, (success, failureReason) => {
        printWin.close();
        if (!success) {
          console.error('Print failed:', failureReason);
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}

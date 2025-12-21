import { getDatabase } from './connection';
import { dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';

// EXPORT - Create database backup
export async function exportBackup() {
  try {
    const db = getDatabase();
    
    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'Export Database Backup',
      defaultPath: path.join(
        app.getPath('desktop'), 
        `vogue-prism-backup-${new Date().toISOString().split('T')[0]}.sql`
      ),
      filters: [
        { name: 'SQL Files', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, cancelled: true };
    }
    
    // Get all data from all tables
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        products: db.prepare('SELECT * FROM products ORDER BY id').all(),
        bills: db.prepare('SELECT * FROM bills ORDER BY id').all(),
        bill_items: db.prepare('SELECT * FROM bill_items ORDER BY id').all(),
        stock_logs: db.prepare('SELECT * FROM stock_logs ORDER BY id').all(),
        settings: db.prepare('SELECT * FROM settings ORDER BY key').all()
      }
    };
    
    // Create SQL backup content with better formatting
    let sqlContent = `-- Vogue Prism Database Backup\n`;
    sqlContent += `-- Created: ${backup.timestamp}\n`;
    sqlContent += `-- Version: ${backup.version}\n\n`;
    
    // Helper function to escape SQL values
    const escapeValue = (value: any): string => {
      if (value === null || value === undefined) {
        return 'NULL';
      }
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return String(value);
    };
    
    // Helper function to generate INSERT statements
    const generateInserts = (tableName: string, rows: any[]) => {
      if (rows.length === 0) return '';
      
      const columns = Object.keys(rows[0]);
      let sql = `-- Table: ${tableName}\n`;
      sql += `DELETE FROM ${tableName};\n`;
      
      for (const row of rows) {
        const values = columns.map(col => escapeValue(row[col])).join(', ');
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
      }
      sql += '\n';
      return sql;
    };
    
    // Generate SQL for each table
    sqlContent += generateInserts('settings', backup.data.settings);
    sqlContent += generateInserts('products', backup.data.products);
    sqlContent += generateInserts('bills', backup.data.bills);
    sqlContent += generateInserts('bill_items', backup.data.bill_items);
    sqlContent += generateInserts('stock_logs', backup.data.stock_logs);
    
    // Write backup file
    fs.writeFileSync(result.filePath!, sqlContent, 'utf8');
    
    return { 
      success: true, 
      path: result.filePath,
      recordCount: {
        products: backup.data.products.length,
        bills: backup.data.bills.length,
        bill_items: backup.data.bill_items.length,
        stock_logs: backup.data.stock_logs.length,
        settings: backup.data.settings.length
      }
    };
    
  } catch (error) {
    console.error('Backup export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// IMPORT - Restore database from backup
export async function importBackup() {
  try {
    // Show open dialog
    const result = await dialog.showOpenDialog({
      title: 'Import Database Backup',
      filters: [
        { name: 'SQL Files', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths.length) {
      return { success: false, cancelled: true };
    }
    
    // Confirm restore
    const confirmResult = await dialog.showMessageBox({
      type: 'warning',
      title: 'Confirm Database Restore',
      message: 'This will replace all current data with the backup data. This action cannot be undone.',
      detail: 'Are you sure you want to continue?',
      buttons: ['Cancel', 'Restore'],
      defaultId: 0,
      cancelId: 0
    });
    
    if (confirmResult.response === 0) {
      return { success: false, cancelled: true };
    }
    
    const db = getDatabase();
    const backupPath = result.filePaths[0];
    
    // Read backup file
    const sqlContent = fs.readFileSync(backupPath, 'utf8');
    
    // Execute backup SQL in transaction
    const transaction = db.transaction(() => {
      // Disable foreign key constraints temporarily
      db.exec('PRAGMA foreign_keys = OFF;');
      
      // Split SQL content into individual statements more carefully
      const lines = sqlContent.split('\n');
      let currentStatement = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (!trimmedLine || trimmedLine.startsWith('--')) {
          continue;
        }
        
        currentStatement += line + '\n';
        
        // If line ends with semicolon, execute the statement
        if (trimmedLine.endsWith(';')) {
          const statement = currentStatement.trim();
          if (statement && statement !== ';') {
            try {
              db.exec(statement);
            } catch (error) {
              console.error('Error executing statement:', statement);
              console.error('Error:', error);
              // Continue with other statements
            }
          }
          currentStatement = '';
        }
      }
      
      // Re-enable foreign key constraints
      db.exec('PRAGMA foreign_keys = ON;');
    });
    
    transaction();
    
    return { 
      success: true, 
      requiresRestart: true,
      message: 'Database restored successfully. Please restart the application.' 
    };
    
  } catch (error) {
    console.error('Backup import error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// UTILITY - Get database statistics
export function getDatabaseStats() {
  const db = getDatabase();
  
  const stats = {
    products: db.prepare('SELECT COUNT(*) as count FROM products').get(),
    bills: db.prepare('SELECT COUNT(*) as count FROM bills').get(),
    bill_items: db.prepare('SELECT COUNT(*) as count FROM bill_items').get(),
    stock_logs: db.prepare('SELECT COUNT(*) as count FROM stock_logs').get(),
    settings: db.prepare('SELECT COUNT(*) as count FROM settings').get(),
    database_size: getDatabaseSize()
  };
  
  return stats;
}

// UTILITY - Get database file size
function getDatabaseSize() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'billing.db');
    const stats = fs.statSync(dbPath);
    return {
      bytes: stats.size,
      mb: Math.round((stats.size / 1024 / 1024) * 100) / 100
    };
  } catch (error) {
    return { bytes: 0, mb: 0 };
  }
}
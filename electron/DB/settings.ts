import { getDatabase } from './connection';

// READ - Get all settings as key-value pairs
export function getSettings() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT key, value FROM settings');
  const rows = stmt.all() as Array<{ key: string; value: string }>;
  
  // Convert to object
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  
  return settings;
}

// READ - Get single setting by key
export function getSetting(key: string) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const result = stmt.get(key) as { value: string } | undefined;
  return result?.value;
}

// UPDATE - Update single setting
export function updateSetting(key: string, value: string) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updatedAt) 
    VALUES (?, ?, datetime('now'))
  `);
  const result = stmt.run(key, value);
  return result.changes > 0;
}

// UPDATE - Update multiple settings at once
export function updateAllSettings(settings: Record<string, string>) {
  const db = getDatabase();
  
  const transaction = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt) 
      VALUES (?, ?, datetime('now'))
    `);
    
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value);
    }
  });
  
  transaction();
  return true;
}

// UTILITY - Get typed setting values
export function getTypedSetting(key: string, defaultValue: any = null) {
  const value = getSetting(key);
  if (value === undefined) return defaultValue;
  
  // Try to parse as number
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  
  // Try to parse as boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Return as string
  return value;
}

// UTILITY - Get all settings with proper types
export function getTypedSettings() {
  const settings = getSettings();
  
  return {
    storeName: settings.storeName || 'Vogue Prism',
    addressLine1: settings.addressLine1 || '',
    addressLine2: settings.addressLine2 || '',
    phone: settings.phone || '',
    gstNumber: settings.gstNumber || '',
    billPrefix: settings.billPrefix || 'VP',
    startingBillNumber: parseInt(settings.startingBillNumber || '1'),
    maxDiscountPercent: parseFloat(settings.maxDiscountPercent || '20'),
    lowStockThreshold: parseInt(settings.lowStockThreshold || '5'),
    printerName: settings.printerName || '',
    paperWidth: settings.paperWidth as '58mm' | '80mm' || '80mm',
    autoPrint: settings.autoPrint === 'true'
  };
}
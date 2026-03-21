import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppConfig {
  storeType: 'master' | 'branch';
  storeId: string;
  storeName: string;
  features: {
    dbSync: boolean;
    analytics: boolean;
    forecast: boolean;
    backup: boolean;
    deletedBills: boolean;
    combos: boolean;
  };
  sync: {
    enabled: boolean;
    autoSyncInterval: number;
    retryAttempts: number;
    batchSize: number;
  };
  ui: {
    showDBSyncTab: boolean;
    showAnalyticsTab: boolean;
    showForecastTab: boolean;
    showCombosTab: boolean;
    showDeletedBillsTab: boolean;
  };
}

let config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (config) return config;

  try {
    const configPath = path.join(__dirname, '../app.config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configData);
    
    console.log('📋 App Configuration Loaded:');
    console.log(`   Store Type: ${config!.storeType}`);
    console.log(`   Store ID: ${config!.storeId}`);
    console.log(`   Store Name: ${config!.storeName}`);
    console.log(`   DB Sync: ${config!.features.dbSync ? 'Enabled' : 'Disabled'}`);
    console.log(`   Auto-sync Interval: ${config!.sync.autoSyncInterval / 1000 / 60} minutes`);
    
    return config!;
  } catch (error) {
    console.warn('⚠️  Could not load app.config.json, using defaults');
    
    // Default configuration
    config = {
      storeType: 'master',
      storeId: process.env.VITE_STORE_ID || 'store_001',
      storeName: process.env.VITE_STORE_NAME || 'Main Store',
      features: {
        dbSync: true,
        analytics: true,
        forecast: true,
        backup: true,
        deletedBills: true,
        combos: true,
      },
      sync: {
        enabled: true,
        autoSyncInterval: 3600000, // 1 hour
        retryAttempts: 3,
        batchSize: 100,
      },
      ui: {
        showDBSyncTab: true,
        showAnalyticsTab: true,
        showForecastTab: true,
        showCombosTab: true,
        showDeletedBillsTab: true,
      },
    };
    
    return config;
  }
}

export function getConfig(): AppConfig {
  if (!config) {
    return loadConfig();
  }
  return config;
}

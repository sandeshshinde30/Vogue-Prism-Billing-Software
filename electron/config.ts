import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { app } from 'electron';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppConfig {
  appType: 'master' | 'branch';
  storeId: string;
  storeName: string;
  masterStoreId?: string;
  features: Record<string, boolean>;
  ui: Record<string, boolean>;
  sync: {
    enabled: boolean;
    autoSyncInterval: number;
    retryAttempts: number;
    batchSize: number;
    masterEndpoint?: string;
    pullFromBranches?: boolean;
    branchStores?: Array<{
      storeId: string;
      storeName: string;
      endpoint: string;
      status: string;
    }>;
  };
  database: {
    location: 'documents' | 'appdata' | 'custom';
    customPath?: string;
  };
}

let config: AppConfig | null = null;

export function getDatabasePath(): string {
  const cfg = getConfig();
  
  if (cfg.database.location === 'custom' && cfg.database.customPath) {
    return cfg.database.customPath;
  }
  
  // Master store uses old path ~/.config/vogue-prism-billing-software/billing.db
  // Branch store uses Documents/VoguePrism/ for production
  if (cfg.appType === 'master') {
    // Master store: use old config path
    const configPath = path.join(os.homedir(), '.config', 'vogue-prism-billing-software');
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }
    return path.join(configPath, 'billing.db');
  }
  
  // Branch store: use Documents/VoguePrism/
  if (cfg.database.location === 'documents') {
    const documentsPath = path.join(os.homedir(), 'Documents', 'VoguePrism');
    if (!fs.existsSync(documentsPath)) {
      fs.mkdirSync(documentsPath, { recursive: true });
    }
    return path.join(documentsPath, `${cfg.storeId}_billing.db`);
  }
  
  // Default to appdata
  return path.join(app.getPath('userData'), `${cfg.storeId}_billing.db`);
}

export function loadConfig(): AppConfig {
  if (config) return config;

  try {
    // Try multiple paths for app.config.json
    const possiblePaths = [
      path.join(__dirname, '../app.config.json'), // Development
      path.join(app.getAppPath(), 'app.config.json'), // Production (AppImage)
      path.join(process.resourcesPath, 'app.config.json'), // Alternative production path
      path.join(process.cwd(), 'app.config.json'), // Current working directory
    ];

    let configPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        configPath = p;
        break;
      }
    }

    if (!configPath) {
      throw new Error('app.config.json not found in any expected location');
    }

    const configData = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configData);
    
    console.log('📋 App Configuration Loaded:');
    console.log(`   Config Path: ${configPath}`);
    console.log(`   App Type: ${config!.appType}`);
    console.log(`   Store ID: ${config!.storeId}`);
    console.log(`   Store Name: ${config!.storeName}`);
    console.log(`   DB Sync: ${config!.features.dbSync ? 'Enabled' : 'Disabled'}`);
    console.log(`   Database Location: ${config!.database.location}`);
    console.log(`   Database Path: ${getDatabasePath()}`);
    
    return config!;
  } catch (error) {
    console.warn('⚠️  Could not load app.config.json, using defaults');
    console.warn(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    
    // Default configuration for branch
    config = {
      appType: 'branch',
      storeId: process.env.VITE_STORE_ID || 'branch_001',
      storeName: process.env.VITE_STORE_NAME || 'Branch Store',
      features: {
        billing: true,
        products: true,
        stock: true,
        cashUpiTracking: true,
        reports: true,
        backup: true,
        deletedBills: true,
        combos: true,
        forecast: true,
        analytics: true,
        dbSync: true,
        storeManagement: false,
      },
      ui: {
        showBillingTab: true,
        showProductsTab: true,
        showStockTab: true,
        showCashUpiTrackingTab: true,
        showReportsTab: true,
        showBackupTab: true,
        showDeletedBillsTab: true,
        showCombosTab: false,
        showForecastTab: true,
        showAnalyticsTab: true,
        showDBSyncTab: true,
        showStoreManagementTab: false,
      },
      sync: {
        enabled: true,
        autoSyncInterval: 3600000,
        retryAttempts: 3,
        batchSize: 100,
        masterEndpoint: 'http://localhost:3000',
      },
      database: {
        location: 'documents',
        customPath: null,
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

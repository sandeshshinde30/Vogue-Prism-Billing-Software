import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST before any other imports
// Try multiple paths for .env file
const possibleEnvPaths = [
  path.join(__dirname, '../.env'), // Development
  path.join(process.resourcesPath, '.env'), // Production (AppImage resources)
  path.join(process.cwd(), '.env'), // Current working directory
];

let envPath = '';
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    envPath = p;
    break;
  }
}

const result = envPath ? config({ path: envPath, debug: true }) : { error: new Error('.env file not found') };

// Log env loading status
console.log('=== ENV LOADING DEBUG ===');
console.log('ENV Path:', envPath || 'Not found');
console.log('ENV Load Result:', result.error ? `ERROR: ${result.error.message}` : 'SUCCESS');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✓ Loaded' : '✗ Missing');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✓ Loaded' : '✗ Missing');
console.log('VITE_STORE_ID:', process.env.VITE_STORE_ID || 'Not set');
console.log('VITE_STORE_NAME:', process.env.VITE_STORE_NAME || 'Not set');
console.log('========================');

import { app, BrowserWindow } from 'electron';
import { initDatabase, closeDatabase } from './DB/connection';
import { setupIpcHandlers } from './ipc-handlers';
import { startNetworkMonitoring, stopNetworkMonitoring } from './services/networkMonitor';
import { initSync } from './services/dbSync';
import { initSyncQueue } from './services/syncQueue';
import { initSyncMetadata } from './services/syncMetadata';
import { loadConfig } from './config';

let win: BrowserWindow | null = null;

function createWindow() {
  // Load configuration
  const config = loadConfig();
  
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: `${config.storeName} - Billing Software`,
  });

  win.setMenuBarVisibility(false);

  if (process.env['VITE_DEV_SERVER_URL']) {
    win.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(async () => {
  await initDatabase();
  
  // Initialize sync system
  initSyncQueue();
  initSyncMetadata();
  await initSync();
  
  win = createWindow();
  
  setupIpcHandlers();
  
  // Start background services
  startNetworkMonitoring();
});

app.on('before-quit', async () => {
  stopNetworkMonitoring();
  await closeDatabase();
});

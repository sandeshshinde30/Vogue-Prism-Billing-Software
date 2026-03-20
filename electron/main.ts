import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { initDatabase, closeDatabase } from './DB/connection';
import { setupIpcHandlers } from './ipc-handlers';
import { initializeBillSendJobsTable } from './DB/billSendJobs';
import { startBillSendQueue, stopBillSendQueue } from './services/billSendQueue';
import { startNetworkMonitoring, stopNetworkMonitoring } from './services/networkMonitor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win: BrowserWindow | null = null;

function createWindow() {
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
    title: 'Vogue Prism - Billing Software',
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
  initializeBillSendJobsTable();
  
  win = createWindow();
  
  setupIpcHandlers();
  
  // Start background services
  startNetworkMonitoring();
  startBillSendQueue(win);
});

app.on('before-quit', async () => {
  stopBillSendQueue();
  stopNetworkMonitoring();
  await closeDatabase();
});

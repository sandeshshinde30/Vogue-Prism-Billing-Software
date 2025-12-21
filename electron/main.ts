import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { initDatabase, closeDatabase } from './DB/connection';
import { setupIpcHandlers } from './ipc-handlers';

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
  setupIpcHandlers();
  createWindow();
});

app.on('before-quit', async () => {
  await closeDatabase();
});

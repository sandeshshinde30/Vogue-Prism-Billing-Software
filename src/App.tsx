import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from './components/layout/MainLayout';
import {
  Dashboard,
  Billing,
  Products,
  Stock,
  Reports,
  Backup,
  Settings,
} from './pages';
import { useStore } from './store/useStore';
import { Settings as SettingsType } from './types';

function App() {
  const { setSettings } = useStore();

  useEffect(() => {
    // Load settings on app start
    const loadSettings = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        setSettings(settings as unknown as SettingsType);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, [setSettings]);

  return (
    <HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="billing" element={<Billing />} />
          <Route path="products" element={<Products />} />
          <Route path="stock" element={<Stock />} />
          <Route path="reports" element={<Reports />} />
          <Route path="backup" element={<Backup />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;

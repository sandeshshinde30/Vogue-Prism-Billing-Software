import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store, StoreContextType } from '../types/store';
import toast from 'react-hot-toast';

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [selectedStore, setSelectedStore] = useState<string | 'all'>('all');
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPullTime, setLastPullTime] = useState<string | null>(null);

  // Load stores on mount
  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const storeList = await window.electronAPI.stores.getStores();
      setStores(storeList);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const getFilteredData = <T extends { storeId?: string }>(data: T[]): T[] => {
    if (selectedStore === 'all') {
      return data;
    }
    return data.filter(item => item.storeId === selectedStore);
  };

  const pullStoreData = async (storeId?: string) => {
    setIsLoading(true);
    try {
      const targetStoreId = storeId || selectedStore;
      
      if (targetStoreId === 'all') {
        // Pull data from all stores
        await window.electronAPI.stores.pullAllStoreData();
        toast.success('Successfully pulled data from all stores');
      } else {
        // Pull data from specific store
        await window.electronAPI.stores.pullStoreData(targetStoreId);
        const store = stores.find(s => s.id === targetStoreId);
        toast.success(`Successfully pulled data from ${store?.name || 'store'}`);
      }
      
      setLastPullTime(new Date().toISOString());
      await loadStores(); // Refresh store list to update sync times
    } catch (error) {
      console.error('Error pulling store data:', error);
      toast.error('Failed to pull store data: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const value: StoreContextType = {
    selectedStore,
    stores,
    setSelectedStore,
    getFilteredData,
    pullStoreData,
    isLoading,
    lastPullTime,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
}
export interface Store {
  id: string;
  name: string;
  type: 'master' | 'branch';
  location: string;
  isActive: boolean;
  lastSyncTime: string | null;
  syncStatus: 'online' | 'offline' | 'syncing' | 'never_synced';
  createdAt: string;
  updatedAt: string;
}

export interface StoreContextType {
  selectedStore: string | 'all';
  stores: Store[];
  setSelectedStore: (storeId: string) => void;
  getFilteredData: <T extends { storeId?: string }>(data: T[]) => T[];
  pullStoreData: (storeId?: string) => Promise<void>;
  isLoading: boolean;
  lastPullTime: string | null;
}

export interface ConsolidatedBill {
  id: number;
  billNumber: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMode: 'cash' | 'upi' | 'mixed';
  cashAmount?: number;
  upiAmount?: number;
  customerMobileNumber?: string;
  status: string;
  createdAt: string;
  storeId: string;
  storeName: string;
  syncedAt: string;
}

export interface StoreStats {
  storeId: string;
  storeName: string;
  totalRevenue: number;
  totalBills: number;
  pendingBills: number;
  syncedBills: number;
  lastSyncTime: string | null;
}
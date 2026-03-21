# Store Management Feature

## Overview
The Store Management feature enables multi-store operations where a master store can manage and analyze data from multiple branch stores. This feature is designed for businesses with multiple locations that need centralized management and reporting.

## Architecture

### Master-Branch Model
- **Master Store**: Acts as both a regular POS and central management hub
- **Branch Stores**: Regular POS operations that sync data to cloud (Supabase)
- **Data Flow**: Master pulls data from branches via manual "Pull Data" button

## Features Implemented

### 1. Store Management Tab
- New navigation tab "Store Management" with sub-tabs:
  - Dashboard: Overview and store status
  - Analytics: Multi-store analytics (placeholder)
  - Forecast: Cross-store forecasting (placeholder)
  - Bill Management: Consolidated bill management (placeholder)
  - Reports: Multi-store reports (placeholder)

### 2. Store Selector Component
- Dropdown to select specific store or "All Stores"
- Store information display with status indicators
- Manual data pull functionality with "Pull Data" button
- Quick action buttons for individual store data pulls

### 3. Store Dashboard
- Real-time store status overview
- Aggregated statistics (revenue, bills, sync status)
- Store-specific performance metrics
- Visual store status grid with online/offline indicators

### 4. Data Management
- Manual data pulling from Supabase (button-triggered)
- Store-specific and bulk data operations
- Mock implementation with realistic delays and responses

## Technical Implementation

### Frontend Components
```
src/
├── pages/StoreManagement.tsx          # Main store management page
├── contexts/StoreContext.tsx          # Store state management
├── components/store/
│   ├── StoreSelector.tsx              # Store selection and data control
│   ├── StoreDashboard.tsx             # Store overview dashboard
│   ├── StoreAnalytics.tsx             # Multi-store analytics (placeholder)
│   ├── StoreForecast.tsx              # Cross-store forecasting (placeholder)
│   ├── StoreBillManagement.tsx        # Consolidated bills (placeholder)
│   └── StoreReports.tsx               # Multi-store reports (placeholder)
└── types/store.ts                     # Store-related TypeScript types
```

### Backend APIs
```
electron/
├── ipc-handlers.ts                    # Store management IPC handlers
└── preload.ts                         # Store APIs exposure
```

### Configuration
- `app.config.json`: Store configuration with branch store definitions
- `showStoreManagementTab`: UI configuration flag

## Usage

### For Master Stores
1. Navigate to "Store Management" tab
2. Use store selector to choose specific store or "All Stores"
3. Click "Pull Data" to fetch latest data from selected store(s)
4. View aggregated analytics and reports across all stores

### Store Selection Options
- **All Stores**: Combined view of all store data
- **Master Store**: Local master store data
- **Branch Stores**: Individual branch store data (after pulling)

## Configuration

### App Config (app.config.json)
```json
{
  "storeType": "master",
  "storeId": "store_001",
  "storeName": "Main Store",
  "features": {
    "storeManagement": true
  },
  "sync": {
    "branchStores": [
      {
        "storeId": "store_002",
        "storeName": "Branch Store 1",
        "endpoint": "http://branch1.local:3000",
        "status": "active"
      }
    ]
  },
  "ui": {
    "showStoreManagementTab": true
  }
}
```

## Future Enhancements

### Phase 2: Advanced Analytics
- Real-time multi-store charts and comparisons
- Store performance rankings and trends
- Cross-store product performance analysis

### Phase 3: Advanced Features
- Automated data pulling with configurable intervals
- Real-time sync status monitoring
- Inter-store inventory transfers
- Consolidated customer management

### Phase 4: Enterprise Features
- Role-based access control per store
- Advanced reporting with custom filters
- Store-to-store communication
- Centralized inventory management

## API Reference

### Store Context
```typescript
interface StoreContextType {
  selectedStore: string | 'all';
  stores: Store[];
  setSelectedStore: (storeId: string) => void;
  pullStoreData: (storeId?: string) => Promise<void>;
  isLoading: boolean;
  lastPullTime: string | null;
}
```

### Electron APIs
```typescript
window.electronAPI.stores.getStores()
window.electronAPI.stores.getStoreStats(storeId?)
window.electronAPI.stores.pullStoreData(storeId)
window.electronAPI.stores.pullAllStoreData()
```

## Notes
- Current implementation uses mock data for demonstration
- Real implementation would integrate with Supabase for data pulling
- Store management is only available for master store type
- All sub-tabs except Dashboard are placeholders for future development
# Supabase Sync Enhancements

## Overview
Enhanced the Supabase sync functionality with real network speed monitoring, database statistics, and granular bill sync tracking.

## New Features Implemented

### 1. Real Network Speed Monitoring
- **Actual Speed Calculation**: Network speed is now calculated by downloading a test file and measuring throughput
- **Fallback Mechanism**: If speed test fails, falls back to latency-based estimation
- **Connection Type Detection**: Automatically detects 4G/5G, 3G/4G, 2G/3G, or Slow connections
- **Location**: `electron/services/networkMonitor.ts`

### 2. Database Statistics
- **Storage Usage**: Shows used/free storage out of 500 MB free tier
- **Bandwidth Tracking**: Monitors bandwidth usage out of 5 GB monthly limit
- **Real-time Updates**: Statistics refresh every 10 seconds
- **Visual Progress Bars**: Color-coded progress bars (green/yellow/red) based on usage
- **Location**: `electron/services/dbSync.ts` - `getDBStatistics()`

### 3. Unsynced Bills Tracking
- **Two Tabs**: Separate tabs for "Unsynced Bills" and "Synced Bills"
- **Detailed Bill Info**: Shows bill number, total, items count, payment mode, creation date
- **Error Display**: Shows retry count and error messages for failed syncs
- **Individual Sync**: Button to sync each bill individually
- **Bulk Sync**: "Sync All" button to sync all unsynced bills at once
- **Location**: `src/components/sync/EnhancedDBSyncTab.tsx`

### 4. Sync Progress Tracking
- **Real-time Progress**: Shows sync progress as percentage (0-100%)
- **Duration Tracking**: Displays how long each sync operation takes
- **Items Synced Count**: Shows number of items successfully synced
- **Visual Feedback**: Progress bar with smooth animations

### 5. Sync History
- **Last 20 Syncs**: Maintains history of recent sync operations
- **Success/Failure Tracking**: Color-coded entries (green for success, red for failure)
- **Expandable Details**: Click to see detailed information about each sync
- **Metrics**: Shows pending count, items synced, duration, and errors

## Files Created/Modified

### New Files
1. `src/components/sync/EnhancedDBSyncTab.tsx` - Main enhanced sync UI component

### Modified Files
1. `electron/services/dbSync.ts` - Added:
   - `getDBStatistics()` - Get Supabase storage and bandwidth stats
   - `getUnsyncedBills()` - Get bills pending sync
   - `getSyncedBills()` - Get recently synced bills
   - `syncSingleBill()` - Sync individual bill by queue ID

2. `electron/services/networkMonitor.ts` - Enhanced:
   - `measureActualSpeed()` - Calculate real network speed
   - `checkNetworkStatus()` - Updated to use actual speed measurement

3. `electron/ipc-handlers.ts` - Added handlers:
   - `sync:getDBStats`
   - `sync:getUnsyncedBills`
   - `sync:getSyncedBills`
   - `sync:syncSingleBill`

4. `electron/preload.ts` - Exposed new methods:
   - `sync.getDBStats()`
   - `sync.getUnsyncedBills()`
   - `sync.getSyncedBills()`
   - `sync.syncSingleBill()`

5. `src/types/electron.d.ts` - Added TypeScript definitions for new methods

## Usage

### Replace Old Sync Tab
To use the enhanced sync tab, update your routing/navigation to use:
```tsx
import { EnhancedDBSyncTab } from './components/sync/EnhancedDBSyncTab';
```

### Key Features

#### Network Status Card
- Shows online/offline status
- Displays actual network speed in Mbps
- Shows latency in milliseconds
- Indicates connection type (4G/5G, 3G, etc.)

#### Sync Status Card
- Current sync state (Ready/Syncing/Error)
- Real-time progress percentage
- Pending and synced counts
- Last sync timestamp

#### DB Statistics Card
- Storage usage with progress bar
- Bandwidth usage with progress bar
- Free tier limits displayed
- Color-coded warnings (green/yellow/red)

#### Bills Sync Status
- **Unsynced Bills Tab**: Lists all bills waiting to sync
  - Individual sync buttons
  - Bulk "Sync All" button
  - Error messages and retry counts
  - Bill details (number, total, items, payment mode)

- **Synced Bills Tab**: Shows recently synced bills
  - Confirmation checkmarks
  - Bill details for reference

#### Sync History
- Last 20 sync operations
- Expandable entries with detailed metrics
- Success/failure indicators
- Duration and item counts

## Technical Details

### Sync Queue Tracking
Bills are tracked through the `sync_queue` table in local SQLite:
- `synced = 0`: Unsynced bills
- `synced = 1`: Synced bills
- `retry_count`: Number of failed attempts
- `error_message`: Last error encountered

### Network Speed Calculation
```typescript
// Downloads test file and measures throughput
const speedMbps = (fileSizeMB * 8) / timeTakenSeconds;
```

### DB Statistics Estimation
```typescript
// Rough estimation based on row counts
const estimatedSize = 
  (productsCount * 1KB) + 
  (billsCount * 2KB) + 
  (billItemsCount * 0.5KB);
```

## Benefits

1. **Transparency**: Users can see exactly what's synced and what's pending
2. **Control**: Individual bill sync allows fixing specific sync issues
3. **Monitoring**: Real network speed helps diagnose connectivity problems
4. **Resource Awareness**: DB statistics prevent exceeding free tier limits
5. **Troubleshooting**: Detailed error messages and retry counts aid debugging

## Future Enhancements

- Add filters for unsynced bills (by date, amount, etc.)
- Export unsynced bills list
- Automatic retry with exponential backoff
- Sync conflict resolution UI
- Real-time sync notifications
- Bandwidth usage charts over time

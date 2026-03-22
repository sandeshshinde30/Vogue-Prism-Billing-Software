# Application Configuration Guide

## Quick Start

### For Branch Application
The app is pre-configured as a **branch** application. No changes needed unless you want to customize.

### For Master Application
1. Copy `app.config.master.json` to `app.config.json`
2. Restart the application

---

## Configuration File Structure

### Basic Settings

```json
{
  "appType": "branch",           // "branch" or "master"
  "storeId": "branch_001",       // Unique store identifier
  "storeName": "Branch Store",   // Display name
  "masterStoreId": "store_001"   // (Branch only) Master store ID
}
```

### Features Toggle

Enable/disable features easily:

```json
"features": {
  "billing": true,              // Bill creation and management
  "products": true,             // Product management
  "stock": true,                // Stock tracking
  "cashUpiTracking": true,       // Cash/UPI tracking
  "reports": true,              // Reports and analytics
  "backup": true,               // Database backup
  "deletedBills": true,         // Deleted bills recovery
  "combos": true,               // Product combos
  "forecast": true,             // Sales forecasting
  "analytics": true,            // Analytics dashboard
  "dbSync": true,               // Database synchronization
  "storeManagement": false       // (Master only) Store management
}
```

### UI Tabs Control

Show/hide tabs in the application:

```json
"ui": {
  "showBillingTab": true,
  "showProductsTab": true,
  "showStockTab": true,
  "showCashUpiTrackingTab": true,
  "showReportsTab": true,
  "showBackupTab": true,
  "showDeletedBillsTab": true,
  "showCombosTab": false,
  "showForecastTab": true,
  "showAnalyticsTab": true,
  "showDBSyncTab": true,
  "showStoreManagementTab": false
}
```

### Database Configuration

```json
"database": {
  "location": "documents",    // "documents", "appdata", or "custom"
  "customPath": null          // Only used if location is "custom"
}
```

**Location Options:**
- `"documents"` - Stores DB in `~/Documents/VoguePrism/` (Recommended for branch)
- `"appdata"` - Stores DB in application data folder
- `"custom"` - Use custom path specified in `customPath`

### Sync Configuration

**For Branch:**
```json
"sync": {
  "enabled": true,
  "autoSyncInterval": 3600000,      // 1 hour in milliseconds
  "retryAttempts": 3,
  "batchSize": 100,
  "masterEndpoint": "http://localhost:3000"
}
```

**For Master:**
```json
"sync": {
  "enabled": true,
  "autoSyncInterval": 3600000,
  "retryAttempts": 3,
  "batchSize": 100,
  "pullFromBranches": true,
  "branchStores": [
    {
      "storeId": "branch_001",
      "storeName": "Branch Store 1",
      "endpoint": "http://branch1.local:3000",
      "status": "active"
    }
  ]
}
```

---

## Common Configurations

### Branch Store (Default)
```json
{
  "appType": "branch",
  "storeId": "branch_001",
  "storeName": "Branch Store",
  "features": {
    "storeManagement": false
  },
  "database": {
    "location": "documents"
  }
}
```

### Master Store
```json
{
  "appType": "master",
  "storeId": "store_001",
  "storeName": "Main Store",
  "features": {
    "storeManagement": true
  },
  "sync": {
    "pullFromBranches": true
  }
}
```

### Minimal Branch (Only Billing)
```json
{
  "appType": "branch",
  "features": {
    "billing": true,
    "products": true,
    "stock": true,
    "cashUpiTracking": true,
    "reports": false,
    "backup": false,
    "deletedBills": false,
    "combos": false,
    "forecast": false,
    "analytics": false,
    "dbSync": false,
    "storeManagement": false
  }
}
```

---

## Database Paths

### Branch Application
- **Location:** `~/Documents/VoguePrism/`
- **File:** `branch_001_billing.db`
- **Full Path:** `~/Documents/VoguePrism/branch_001_billing.db`

### Master Application
- **Location:** `~/Documents/VoguePrism/`
- **File:** `store_001_billing.db`
- **Full Path:** `~/Documents/VoguePrism/store_001_billing.db`

---

## Building for Linux Mint

### Prerequisites
```bash
# Install Node.js and Bun
curl -fsSL https://bun.sh/install | bash
```

### Build Steps

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Build the application:**
   ```bash
   bun run build
   ```

3. **Run in development:**
   ```bash
   bun run dev
   ```

### Build Output
- Linux executable: `dist-electron/main.js`
- Frontend build: `dist/`

---

## Configuration Examples

### Example 1: Branch with Full Features
```json
{
  "appType": "branch",
  "storeId": "branch_mumbai",
  "storeName": "Mumbai Branch",
  "masterStoreId": "store_001",
  "features": {
    "billing": true,
    "products": true,
    "stock": true,
    "cashUpiTracking": true,
    "reports": true,
    "backup": true,
    "deletedBills": true,
    "combos": true,
    "forecast": true,
    "analytics": true,
    "dbSync": true,
    "storeManagement": false
  },
  "database": {
    "location": "documents"
  },
  "sync": {
    "enabled": true,
    "autoSyncInterval": 1800000,
    "masterEndpoint": "http://master.company.local:3000"
  }
}
```

### Example 2: Master with Multiple Branches
```json
{
  "appType": "master",
  "storeId": "store_001",
  "storeName": "Head Office",
  "features": {
    "storeManagement": true,
    "dbSync": true
  },
  "sync": {
    "pullFromBranches": true,
    "branchStores": [
      {
        "storeId": "branch_mumbai",
        "storeName": "Mumbai Branch",
        "endpoint": "http://branch-mumbai.local:3000",
        "status": "active"
      },
      {
        "storeId": "branch_delhi",
        "storeName": "Delhi Branch",
        "endpoint": "http://branch-delhi.local:3000",
        "status": "active"
      }
    ]
  }
}
```

---

## Troubleshooting

### Database Not Found
- Check `database.location` setting
- Ensure `~/Documents/VoguePrism/` directory exists
- Check file permissions

### Sync Not Working
- Verify `sync.enabled` is `true`
- Check `masterEndpoint` URL is correct
- Ensure network connectivity

### Features Not Showing
- Check corresponding `ui.show*Tab` is `true`
- Check `features.*` is `true`
- Restart application after config changes

---

## Notes

- Changes to `app.config.json` require application restart
- Database path is created automatically if it doesn't exist
- Store ID must be unique across all instances
- Master endpoint should be accessible from branch machines

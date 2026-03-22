# Branch Application Setup Guide

## Overview

The application is now configured as a **Branch** application by default. This guide will help you set up and run the branch application on Linux Mint.

---

## Prerequisites

### System Requirements
- Linux Mint (or any Linux distribution)
- Node.js 18+ or Bun runtime
- 2GB RAM minimum
- 500MB disk space

### Install Bun (Recommended)
```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Quick Setup

### 1. Install Dependencies
```bash
bun install
```

### 2. Build the Application
```bash
bun run build
```

### 3. Run the Application
```bash
bun run dev
```

---

## Configuration

### Default Branch Configuration
The app comes pre-configured for branch use. File: `app.config.json`

```json
{
  "appType": "branch",
  "storeId": "branch_001",
  "storeName": "Branch Store",
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
    "location": "documents",
    "customPath": null
  }
}
```

### Customize Your Branch

Edit `app.config.json` to customize:

1. **Store Identity:**
   ```json
   "storeId": "branch_mumbai",
   "storeName": "Mumbai Branch"
   ```

2. **Enable/Disable Features:**
   ```json
   "features": {
     "combos": false,           // Disable combos
     "forecast": false,         // Disable forecasting
     "storeManagement": false   // Always false for branch
   }
   ```

3. **Database Location:**
   ```json
   "database": {
     "location": "documents"    // Stores in ~/Documents/VoguePrism/
   }
   ```

4. **Master Server Connection:**
   ```json
   "sync": {
     "masterEndpoint": "http://192.168.1.100:3000"
   }
   ```

---

## Database Location

### Default Path
```
~/Documents/VoguePrism/branch_001_billing.db
```

### Directory Structure
```
~/Documents/VoguePrism/
├── branch_001_billing.db
├── branch_002_billing.db
└── store_001_billing.db (if master on same machine)
```

### Change Database Location

Edit `app.config.json`:

```json
"database": {
  "location": "custom",
  "customPath": "/path/to/custom/location/billing.db"
}
```

---

## Running the Application

### Development Mode
```bash
bun run dev
```
- Hot reload enabled
- Debug console visible
- Slower startup

### Production Build
```bash
bun run build
```
- Creates optimized build
- Output in `dist/` and `dist-electron/`

### Run Built Application
```bash
bun run preview
```

---

## Features Available in Branch

✅ **Billing** - Create and manage bills
✅ **Products** - Manage product catalog
✅ **Stock** - Track inventory
✅ **Cash/UPI Tracking** - Track payments
✅ **Reports** - View sales reports
✅ **Backup** - Backup database
✅ **Deleted Bills** - Recover deleted bills
✅ **Combos** - Product combinations (optional)
✅ **Forecast** - Sales forecasting (optional)
✅ **Analytics** - Analytics dashboard (optional)
✅ **DB Sync** - Sync with master store

❌ **Store Management** - Not available in branch

---

## Database Synchronization

### How Sync Works

1. **Automatic Sync** - Every 1 hour (configurable)
2. **Manual Sync** - Click "Sync Now" in DB Sync tab
3. **Data Flow** - Branch → Master (one-way)

### Configure Sync

Edit `app.config.json`:

```json
"sync": {
  "enabled": true,
  "autoSyncInterval": 3600000,      // 1 hour in milliseconds
  "retryAttempts": 3,
  "batchSize": 100,
  "masterEndpoint": "http://master-server:3000"
}
```

### Disable Sync (Offline Mode)

```json
"sync": {
  "enabled": false
}
```

---

## Troubleshooting

### Application Won't Start
```bash
# Clear cache and rebuild
rm -rf dist dist-electron node_modules
bun install
bun run build
```

### Database Not Found
- Check `~/Documents/VoguePrism/` exists
- Check file permissions: `ls -la ~/Documents/VoguePrism/`
- Restart application

### Sync Not Working
1. Check master server is running
2. Verify `masterEndpoint` in config
3. Check network connectivity: `ping master-server`
4. Check firewall settings

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

---

## Multiple Branch Setup

### Setup Branch 1
```json
{
  "storeId": "branch_mumbai",
  "storeName": "Mumbai Branch",
  "database": {
    "location": "documents"
  }
}
```
Database: `~/Documents/VoguePrism/branch_mumbai_billing.db`

### Setup Branch 2
```json
{
  "storeId": "branch_delhi",
  "storeName": "Delhi Branch",
  "database": {
    "location": "documents"
  }
}
```
Database: `~/Documents/VoguePrism/branch_delhi_billing.db`

Each branch has its own database file automatically.

---

## Performance Tips

1. **Reduce Sync Interval** for faster updates:
   ```json
   "autoSyncInterval": 1800000  // 30 minutes
   ```

2. **Increase Batch Size** for faster sync:
   ```json
   "batchSize": 500
   ```

3. **Disable Unused Features** to improve performance:
   ```json
   "features": {
     "forecast": false,
     "analytics": false
   }
   "ui": {
     "showForecastTab": false,
     "showAnalyticsTab": false
   }
   ```

---

## Security Notes

1. **Admin Password** - Default: `sunil123`
   - Change in application settings
   - Required for sensitive operations

2. **Database Backup** - Automatic backups in:
   ```
   ~/Documents/VoguePrism/backups/
   ```

3. **Network Security** - Use HTTPS for master endpoint in production:
   ```json
   "masterEndpoint": "https://master-server.company.com"
   ```

---

## Next Steps

1. ✅ Install dependencies: `bun install`
2. ✅ Build application: `bun run build`
3. ✅ Customize `app.config.json`
4. ✅ Run application: `bun run dev`
5. ✅ Configure master server endpoint
6. ✅ Test database sync

---

## Support

For issues or questions:
1. Check `CONFIG_GUIDE.md` for detailed configuration
2. Review application logs in console
3. Check database path: `~/Documents/VoguePrism/`
4. Verify network connectivity to master server

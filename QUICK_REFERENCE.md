# Quick Reference Card

## Installation & Running

```bash
# Install dependencies
bun install

# Build application
bun run build

# Run in development
bun run dev

# Run production build
bun run preview
```

## Configuration Quick Edit

Edit `app.config.json`:

### Change Store Name
```json
"storeId": "branch_mumbai",
"storeName": "Mumbai Branch"
```

### Disable Features
```json
"features": {
  "combos": false,
  "forecast": false,
  "analytics": false
}
```

### Hide Tabs
```json
"ui": {
  "showCombosTab": false,
  "showForecastTab": false,
  "showAnalyticsTab": false
}
```

### Change Database Location
```json
"database": {
  "location": "documents"  // or "appdata" or "custom"
}
```

### Configure Master Server
```json
"sync": {
  "masterEndpoint": "http://192.168.1.100:3000"
}
```

## Database Paths

```
Branch: ~/Documents/VoguePrism/branch_001_billing.db
Master: ~/Documents/VoguePrism/store_001_billing.db
```

## Default Credentials

- **Admin Password:** `sunil123`

## Features Toggle

```json
"features": {
  "billing": true,              // ✅ Always enable
  "products": true,             // ✅ Always enable
  "stock": true,                // ✅ Always enable
  "cashUpiTracking": true,       // ✅ Always enable
  "reports": true,              // Optional
  "backup": true,               // Optional
  "deletedBills": true,         // Optional
  "combos": false,              // Optional (default off)
  "forecast": false,            // Optional (default off)
  "analytics": false,           // Optional (default off)
  "dbSync": true,               // ✅ For branch
  "storeManagement": false       // ❌ Branch only
}
```

## Sync Configuration

```json
"sync": {
  "enabled": true,
  "autoSyncInterval": 3600000,  // 1 hour
  "retryAttempts": 3,
  "batchSize": 100,
  "masterEndpoint": "http://localhost:3000"
}
```

## Common Issues

| Issue | Solution |
|-------|----------|
| App won't start | `rm -rf dist node_modules && bun install && bun run build` |
| Database not found | Check `~/Documents/VoguePrism/` exists |
| Sync not working | Verify `masterEndpoint` and network |
| Port in use | `lsof -i :3000` then `kill -9 <PID>` |

## File Locations

```
app.config.json              ← Main configuration
app.config.master.json       ← Master reference
CONFIG_GUIDE.md              ← Detailed guide
BRANCH_SETUP_GUIDE.md        ← Setup instructions
electron/config.ts           ← Config loader
electron/DB/connection.ts    ← Database setup
```

## Branch vs Master

| Feature | Branch | Master |
|---------|--------|--------|
| Billing | ✅ | ✅ |
| Products | ✅ | ✅ |
| Stock | ✅ | ✅ |
| Cash/UPI | ✅ | ✅ |
| Reports | ✅ | ✅ |
| DB Sync | ✅ | ✅ |
| Store Mgmt | ❌ | ✅ |
| Multi-branch | ❌ | ✅ |

## Restart Application

After editing `app.config.json`:
1. Stop the application (Ctrl+C)
2. Restart: `bun run dev`

## Check Configuration

```bash
# View current config
cat app.config.json

# Check database path
ls -la ~/Documents/VoguePrism/

# Check if master is running
curl http://localhost:3000
```

## Useful Commands

```bash
# Clean build
rm -rf dist dist-electron && bun run build

# Check port usage
lsof -i :3000

# View logs
tail -f ~/.config/VoguePrism/logs.txt

# Backup database
cp ~/Documents/VoguePrism/*.db ~/Documents/VoguePrism/backups/
```

## Next: Master Application

To switch to master:
1. Copy `app.config.master.json` to `app.config.json`
2. Restart application
3. Store Management tab will appear

## Support

- **Config Issues:** See `CONFIG_GUIDE.md`
- **Setup Issues:** See `BRANCH_SETUP_GUIDE.md`
- **Build Issues:** Run `bun run build` again
- **Database Issues:** Check `~/Documents/VoguePrism/`

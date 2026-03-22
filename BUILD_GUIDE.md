# Build Guide - Vogue Prism Billing Software

## Platform-Specific Builds

### Windows Build

```bash
# Build for Windows (NSIS installer + Portable)
bun run build:win

# Output files:
# - dist/Vogue Prism Billing Setup 0.0.0.exe (NSIS Installer)
# - dist/Vogue Prism Billing 0.0.0.exe (Portable)
```

**Database Location (Windows):**
- Master Store: `%APPDATA%\vogue-prism-billing-software\billing.db`
- Branch Store: `%USERPROFILE%\Documents\VoguePrism\branch_001_billing.db`

### Linux Build

```bash
# Build for Linux (AppImage)
bun run build:linux

# Output file:
# - dist/Vogue Prism Billing-0.0.0.AppImage
```

**Database Location (Linux):**
- Master Store: `~/.config/vogue-prism-billing-software/billing.db`
- Branch Store: `~/Documents/VoguePrism/branch_001_billing.db`

### macOS Build

```bash
# Build for macOS (DMG)
bun run build:mac

# Output file:
# - dist/Vogue Prism Billing-0.0.0.dmg
```

### Build All Platforms

```bash
# Build for Windows, macOS, and Linux
bun run build:all
```

## Configuration

### Master Store (Development)
- **Config File**: `app.config.json`
- **App Type**: `master`
- **Store ID**: `store_001`
- **Features**: All enabled (including Store Management)
- **Database**: Old path (for backward compatibility)

### Branch Store (Production)
- **Config File**: `app.config.branch.json`
- **App Type**: `branch`
- **Store ID**: `branch_001`
- **Features**: All except Store Management
- **Database**: Documents/VoguePrism/ folder

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_STORE_ID=store_001
VITE_STORE_NAME=Main Store
```

## Windows Installation

### NSIS Installer
- Double-click `Vogue Prism Billing Setup 0.0.0.exe`
- Follow the installation wizard
- Creates Start Menu shortcuts
- Creates Desktop shortcut
- Allows custom installation directory

### Portable Version
- No installation required
- Just run `Vogue Prism Billing 0.0.0.exe`
- Database stored in Documents/VoguePrism/ or AppData

## Linux Installation

### AppImage
```bash
# Make executable
chmod +x Vogue\ Prism\ Billing-0.0.0.AppImage

# Run directly
./Vogue\ Prism\ Billing-0.0.0.AppImage

# Or install to system
sudo mv Vogue\ Prism\ Billing-0.0.0.AppImage /opt/vogue-prism-billing
```

## Database Paths

### Windows
```
Master Store:  C:\Users\[Username]\AppData\Roaming\vogue-prism-billing-software\billing.db
Branch Store:  C:\Users\[Username]\Documents\VoguePrism\branch_001_billing.db
```

### Linux
```
Master Store:  ~/.config/vogue-prism-billing-software/billing.db
Branch Store:  ~/Documents/VoguePrism/branch_001_billing.db
```

### macOS
```
Master Store:  ~/Library/Application Support/vogue-prism-billing-software/billing.db
Branch Store:  ~/Documents/VoguePrism/branch_001_billing.db
```

## Troubleshooting

### Windows Build Issues

**Issue**: "electron-builder not found"
- Solution: `npm install` or `bun install`

**Issue**: "NSIS not found"
- Solution: Install NSIS from https://nsis.sourceforge.io/
- Or use portable build only: `bun run build:win -- --win portable`

**Issue**: Database not found
- Check: `%APPDATA%\vogue-prism-billing-software\` exists
- Check: `%USERPROFILE%\Documents\VoguePrism\` exists

### Linux Build Issues

**Issue**: "AppImage tools not found"
- Solution: electron-builder will download them automatically

**Issue**: Permission denied when running AppImage
- Solution: `chmod +x Vogue\ Prism\ Billing-0.0.0.AppImage`

## Development vs Production

### Development (bun run dev)
- Uses master store configuration
- Database: Old path (backward compatible)
- All features enabled
- Hot reload enabled

### Production (Built App)
- Uses app.config.json
- Database: Documents/VoguePrism/ (branch) or AppData (master)
- Features based on configuration
- Optimized build

## Multi-Store Setup

### Running Multiple Instances

**Windows:**
```bash
# Master Store
Vogue Prism Billing.exe

# Branch Store 1
mkdir branch_001
cd branch_001
copy ..\Vogue Prism Billing.exe .
copy ..\app.config.branch.json .\app.config.json
Vogue Prism Billing.exe
```

**Linux:**
```bash
# Master Store
./Vogue\ Prism\ Billing-0.0.0.AppImage

# Branch Store 1
mkdir branch_001
cd branch_001
cp ../Vogue\ Prism\ Billing-0.0.0.AppImage .
cp ../app.config.branch.json ./app.config.json
./Vogue\ Prism\ Billing-0.0.0.AppImage
```

## Release Checklist

- [ ] Update version in package.json
- [ ] Update app.config.json with correct settings
- [ ] Ensure .env file has correct credentials
- [ ] Run `bun run build:win` for Windows
- [ ] Run `bun run build:linux` for Linux
- [ ] Test on target platform
- [ ] Verify database paths
- [ ] Test Store Management features
- [ ] Test DB Sync functionality
- [ ] Create release notes


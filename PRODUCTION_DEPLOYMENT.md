# Production Deployment Guide

## Handling Credentials in Production Builds

### Overview
The application now supports loading credentials from multiple locations to work seamlessly in both development and production (AppImage) environments.

### Environment Variables (.env file)

The application looks for the `.env` file in the following order:
1. **Development**: `project_root/.env`
2. **Production (AppImage)**: Inside the AppImage resources directory
3. **Fallback**: Current working directory

### Required Environment Variables

```env
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_STORE_ID=store_001
VITE_STORE_NAME=Main Store
```

### Configuration File (app.config.json)

The application looks for `app.config.json` in the following order:
1. **Development**: `project_root/app.config.json`
2. **Production (AppImage)**: Inside the AppImage resources directory
3. **Fallback**: Current working directory

### Deployment Steps

#### 1. For Development
- Place `.env` file in the project root
- Place `app.config.json` in the project root
- Run `bun run dev` or `bun run build`

#### 2. For Production (AppImage)

**Option A: Include files in AppImage (Recommended)**
- Files are automatically included in the AppImage build
- The application will find them in the resources directory
- No additional setup needed after installation

**Option B: Place files in user directory**
- Copy `.env` and `app.config.json` to the directory where you run the AppImage
- The application will find them in the current working directory

**Option C: Use environment variables**
- Set environment variables before running the AppImage:
  ```bash
  export VITE_SUPABASE_URL="https://your-url.supabase.co"
  export VITE_SUPABASE_ANON_KEY="your-key"
  ./Vogue\ Prism\ Billing-0.0.0.AppImage
  ```

### Building for Production

```bash
# Build the application
bun run build

# The AppImage will be created at:
# dist/Vogue Prism Billing-0.0.0.AppImage
```

### Verifying Credentials are Loaded

When you run the application, check the console output:

**Success:**
```
=== ENV LOADING DEBUG ===
ENV Path: /path/to/.env
ENV Load Result: SUCCESS
VITE_SUPABASE_URL: ✓ Loaded
VITE_SUPABASE_ANON_KEY: ✓ Loaded
========================

📋 App Configuration Loaded:
   Config Path: /path/to/app.config.json
   App Type: branch
   Store ID: branch_001
   ...
```

**Missing Credentials:**
```
=== ENV LOADING DEBUG ===
ENV Path: Not found
ENV Load Result: ERROR: .env file not found
VITE_SUPABASE_URL: ✗ Missing
VITE_SUPABASE_ANON_KEY: ✗ Missing
========================

⚠️  Could not load app.config.json, using defaults
⚠️  Supabase credentials not configured. DB Sync will be disabled.
```

### Troubleshooting

**Issue: "Could not load app.config.json"**
- Ensure `app.config.json` is in the same directory as the AppImage
- Or place it in the project root before building

**Issue: "Supabase credentials not configured"**
- Ensure `.env` file contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check that the file is in the correct location
- Verify the credentials are correct

**Issue: DB Sync not working**
- Check that Supabase credentials are loaded (see console output)
- Verify the Supabase URL and key are correct
- Check network connectivity

### Security Best Practices

1. **Never commit `.env` to version control**
   - Add `.env` to `.gitignore`
   - Use `.env.example` as a template

2. **Protect credentials in production**
   - Use secure credential management systems
   - Rotate keys regularly
   - Use environment-specific credentials

3. **For AppImage distribution**
   - Don't include credentials in the AppImage
   - Provide instructions for users to add their own credentials
   - Or use a configuration wizard on first launch

### Configuration Priority

The application uses this priority order for configuration:

1. **app.config.json** (if found)
   - Defines app type, features, database location, etc.
   
2. **Environment variables** (if set)
   - Override app.config.json settings
   - Used for Supabase credentials

3. **Defaults** (fallback)
   - Branch app with all features enabled
   - Database in ~/Documents/VoguePrism/
   - DB Sync disabled (if no Supabase credentials)

### Example Deployment Scenarios

#### Scenario 1: Single Branch Store
```bash
# Create .env with branch credentials
VITE_SUPABASE_URL=https://your-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=your-key

# Create app.config.json
{
  "appType": "branch",
  "storeId": "branch_001",
  "storeName": "Branch Store",
  ...
}

# Run the AppImage
./Vogue\ Prism\ Billing-0.0.0.AppImage
```

#### Scenario 2: Multiple Branch Stores
```bash
# For each branch, create a separate directory with:
# - .env (with shared Supabase credentials)
# - app.config.json (with unique storeId)

# Branch 1
mkdir branch_001
cp .env branch_001/
cp app.config.branch_001.json branch_001/app.config.json
cd branch_001
../Vogue\ Prism\ Billing-0.0.0.AppImage

# Branch 2
mkdir branch_002
cp .env branch_002/
cp app.config.branch_002.json branch_002/app.config.json
cd branch_002
../Vogue\ Prism\ Billing-0.0.0.AppImage
```

#### Scenario 3: Master Store
```bash
# Create .env with master credentials
VITE_SUPABASE_URL=https://your-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=your-key

# Create app.config.json for master
{
  "appType": "master",
  "storeId": "store_001",
  "storeName": "Main Store",
  "features": {
    "storeManagement": true,
    ...
  }
}

# Run the AppImage
./Vogue\ Prism\ Billing-0.0.0.AppImage
```


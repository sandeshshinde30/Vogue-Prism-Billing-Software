# Bill Send Feature - Setup Guide

This document guides you through setting up the automatic bill sending feature with Firebase and Twilio.

## Overview

The bill send feature automatically:
1. Generates PDF bills
2. Uploads them to Firebase Storage
3. Sends download links via SMS using Twilio
4. Tracks sending status with retry mechanism
5. Monitors network connectivity
6. Provides a dedicated Operations tab for management

## Prerequisites

- Node.js and Bun installed
- Firebase account
- Twilio account

---

## Step 1: Create Twilio Account & Get Credentials

### 1.1 Sign Up
- Go to https://www.twilio.com/console
- Sign up for a free account
- Verify your phone number (they'll send OTP)

### 1.2 Get Credentials
- Go to **Console Dashboard**
- Copy these values:
  - **Account SID** (starts with AC...)
  - **Auth Token** (long string)

### 1.3 Get a Phone Number
- Go to **Phone Numbers** → **Manage Numbers**
- Get a **Twilio Phone Number** (free trial gives one)
- Copy the phone number (format: +1XXXXXXXXXX)

### 1.4 Store Credentials
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Step 2: Create Firebase Project & Get Credentials

### 2.1 Create Project
- Go to https://console.firebase.google.com
- Click **Create Project**
- Enter project name (e.g., "vogue-prism")
- Click **Create**

### 2.2 Get Service Account Credentials
- Go to **Project Settings** (gear icon)
- Click **Service Accounts** tab
- Click **Generate New Private Key**
- A JSON file downloads - **keep it safe**

### 2.3 Extract Credentials from JSON
Open the downloaded JSON file and copy:
- `project_id`
- `private_key` (entire key including BEGIN/END lines)
- `client_email`

### 2.4 Create Storage Bucket
- Go to **Storage** tab in Firebase Console
- Click **Create Bucket**
- Choose region: **asia-south1** (India)
- Keep default settings
- Copy bucket name (format: `project-name.appspot.com`)

### 2.5 Store Credentials
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

---

## Step 3: Configure .env File

### 3.1 Create .env File
Create a `.env` file in your project root:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# App Configuration
BILL_SEND_MAX_RETRIES=2
BILL_SEND_RETRY_DELAY=5000
```

### 3.2 Important Notes
- **FIREBASE_PRIVATE_KEY**: Replace `\n` with actual newlines in the key
- Keep `.env` file **private** - never commit to git
- Add `.env` to `.gitignore`

---

## Step 4: Install Dependencies

```bash
bun install
```

This will install:
- `firebase-admin` - Firebase integration
- `twilio` - SMS sending

---

## Step 5: How It Works

### Bill Creation Flow
1. User creates a bill with customer phone number
2. Bill is saved to database
3. A job is created in `bill_send_jobs` table with status `pending`
4. Background processor picks up the job

### Background Processing
1. **Network Check**: Verifies internet connectivity
2. **PDF Upload**: Uploads bill PDF to Firebase Storage
3. **Link Generation**: Gets shareable download link
4. **SMS Send**: Sends SMS with download link via Twilio
5. **Status Update**: Marks job as `sent` or `failed`

### Retry Mechanism
- If sending fails, job is retried (max 2 attempts)
- Failed jobs can be manually retried from Operations tab
- Network unavailability pauses processing

### Network Monitoring
- Checks connectivity every 10 seconds
- Measures latency and speed
- Shows connection quality (Excellent/Good/Fair/Poor/Offline)
- Pauses sending when offline

---

## Step 6: Using the Feature

### In Bill Creation
1. Enter customer phone number (10 digits for India)
2. Create bill normally
3. On successful save, a send job is queued automatically

### In Operations Tab
- **View Status**: See all pending, sent, and failed jobs
- **Network Info**: Check current connectivity and speed
- **Manual Retry**: Retry failed jobs
- **Manual Send**: Send bill to customer manually
- **Delete**: Remove jobs from queue
- **Auto Refresh**: Updates every 10 seconds

---

## Step 7: Troubleshooting

### Firebase Upload Fails
- Check Firebase credentials in `.env`
- Verify storage bucket exists
- Check Firebase project permissions

### SMS Not Sending
- Verify Twilio credentials
- Check phone number format (+91 for India)
- Check Twilio account balance/credits

### Network Issues
- Check internet connectivity
- Verify network speed is adequate
- Check firewall/proxy settings

### Jobs Stuck in Pending
- Check network status in Operations tab
- Manually retry from Operations tab
- Check error message for details

---

## Step 8: Testing

### Test Configuration
```bash
# Check if credentials are configured
# Go to Operations tab → Check "Config Status"
```

### Manual Test
1. Create a bill with phone number
2. Go to Operations tab
3. Wait for job to process (or manually retry)
4. Check SMS received on phone

### Monitor Logs
- Check browser console for errors
- Check Electron console for backend logs
- Check Firebase console for upload logs

---

## Costs

### Twilio
- **Free Tier**: 1000 SMS/month
- **Paid**: ~₹0.50-1.50 per SMS

### Firebase
- **Free Tier**: 5 GB storage, 1 GB/month downloads
- **Paid**: ₹0.18/GB storage, ₹0.12/GB download

For a small store (100 customers/month):
- **Total Cost**: ₹0 (within free tier)

---

## Features

✅ Automatic bill sending on creation
✅ Firebase Storage integration
✅ Twilio SMS integration
✅ Network monitoring
✅ Retry mechanism (2 attempts)
✅ Operations dashboard
✅ Manual send/retry options
✅ Real-time status tracking
✅ Error logging and display
✅ Background processing

---

## Next Steps

1. Create Twilio account
2. Create Firebase project
3. Add credentials to `.env`
4. Run `bun install`
5. Start dev server: `bun run dev`
6. Test with a bill creation
7. Check Operations tab for status

---

## Support

For issues:
1. Check error messages in Operations tab
2. Review logs in browser console
3. Verify credentials in `.env`
4. Check network connectivity
5. Manually retry from Operations tab

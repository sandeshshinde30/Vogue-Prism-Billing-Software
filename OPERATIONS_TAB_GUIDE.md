# Operations Tab - User Guide

## Where to Find It

The **Operations** tab is now available in the main sidebar navigation.

### Location in Sidebar
```
Dashboard
Billing
Combos
Products
Stock
Bill Management
Reports
Analytics
Forecast
→ OPERATIONS ← (NEW)
Deleted Bills
Logs
Printer
Backup
Settings
```

## What You'll See

### 1. Network Status Card
Shows real-time network information:
- **Status**: Online/Offline
- **Speed**: Network speed in Mbps
- **Latency**: Response time in ms
- **Type**: Connection type (4G/5G, 3G, 2G, Slow)

### 2. Statistics Cards
Quick overview of all jobs:
- **Total**: Total number of jobs
- **Pending**: Waiting to be sent
- **Sent**: Successfully sent
- **Failed**: Failed to send

### 3. Job Tabs
Filter jobs by status:
- **Pending**: Jobs waiting to be processed
- **Sent**: Successfully sent bills
- **Failed**: Failed attempts
- **All**: All jobs combined

### 4. Jobs Table
Shows detailed information for each job:
- **Bill**: Bill number
- **Customer**: Customer name
- **Phone**: Customer phone number
- **Status**: Current status with icon
- **Attempts**: Number of retry attempts (e.g., 1/2)
- **Created**: Date and time job was created
- **Actions**: Retry or Delete buttons

### 5. Error Details Section
Shows error messages for failed jobs:
- Displays which bill failed
- Shows the error reason
- Helps troubleshoot issues

## How to Use

### View Pending Bills
1. Click **Operations** in sidebar
2. Click **Pending** tab
3. See all bills waiting to be sent

### Manually Retry Failed Bill
1. Go to **Failed** tab
2. Click **Retry** button on the bill
3. System will attempt to send again
4. Check status after a few seconds

### Delete a Job
1. Find the job in any tab
2. Click **Delete** button
3. Confirm deletion
4. Job is removed from queue

### Check Network Status
1. Look at the **Network Status** card at the top
2. If **Offline**, sending is paused
3. When **Online** again, sending resumes automatically

### Monitor in Real-Time
- Page auto-refreshes every 10 seconds
- Click **Refresh** button for immediate update
- Watch status change from Pending → Sent

## Status Meanings

### Pending (Orange)
- Job is waiting to be processed
- Will be sent when network is available
- Automatic processing happens in background

### Sent (Green)
- Bill PDF uploaded to Firebase
- SMS with download link sent successfully
- Customer received the link

### Failed (Red)
- Sending failed after 2 attempts
- Check error message for reason
- Can manually retry from this tab

## Network Quality Indicators

| Speed | Quality | Status |
|-------|---------|--------|
| > 50 Mbps | Excellent | ✅ Optimal |
| 20-50 Mbps | Good | ✅ Good |
| 5-20 Mbps | Fair | ⚠️ Acceptable |
| < 5 Mbps | Poor | ⚠️ Slow |
| Offline | Offline | ❌ No Connection |

## Troubleshooting

### Jobs Stuck in Pending
1. Check **Network Status** - is it Online?
2. If Offline, wait for connection
3. If Online, click **Refresh** button
4. If still stuck, manually **Retry**

### SMS Not Received
1. Check phone number format (should be 10 digits)
2. Check error message in **Error Details**
3. Verify Twilio credentials in `.env`
4. Check Twilio account balance

### Firebase Upload Failed
1. Check error message
2. Verify Firebase credentials in `.env`
3. Check Firebase storage bucket exists
4. Manually retry the job

### Network Shows Offline
1. Check internet connection
2. Check WiFi/mobile data
3. Check firewall/proxy settings
4. Wait a few seconds and refresh

## Tips

✅ **Best Practices**
- Check Operations tab regularly
- Monitor network status before creating bills
- Retry failed jobs manually if needed
- Keep `.env` credentials updated

⚠️ **Important**
- Don't delete jobs unless necessary
- Network must be online for sending
- SMS delivery depends on Twilio credits
- Firebase storage has free tier limits

## Auto-Processing

The system automatically:
- ✅ Checks network every 10 seconds
- ✅ Processes pending jobs every 30 seconds
- ✅ Retries failed jobs (max 2 attempts)
- ✅ Pauses when offline
- ✅ Resumes when online
- ✅ Updates UI in real-time

No manual intervention needed - it just works!

## Next Steps

1. Create a bill with customer phone number
2. Go to **Operations** tab
3. Watch the job status change
4. Verify SMS received on phone
5. Check **Sent** tab for confirmation

Enjoy automatic bill delivery! 🚀

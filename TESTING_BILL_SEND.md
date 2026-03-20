# Testing Bill Send Feature - Step by Step

## Prerequisites

Before testing, you need:

1. ✅ **Twilio Account** with credentials in `.env`
2. ✅ **Firebase Project** with credentials in `.env`
3. ✅ **Dependencies installed**: `bun install`
4. ✅ **Dev server running**: `bun run dev`

## Step 1: Verify Configuration

### Check if Services are Initialized
1. Open **Operations** tab
2. Look at **Network Status** card
3. Should show:
   - Status: Online/Offline
   - Speed: X Mbps
   - Latency: X ms
   - Type: Connection type

✅ If you see this, network monitoring is working!

### Check Configuration Status
Open browser console (F12) and look for:
```
Firebase initialized successfully
Twilio initialized successfully
Network monitoring started
Bill send queue processor started
```

If you see errors like "Firebase credentials not configured", check your `.env` file.

## Step 2: Create a Test Bill

### Create Bill with Phone Number
1. Go to **Billing** tab
2. Add products to cart
3. **Important**: Enter customer phone number (10 digits)
   - Format: `9876543210` or `+919876543210`
4. Click **Save Bill**
5. You should see success message

### Check Operations Tab
1. Go to **Operations** tab
2. Look at **Pending** tab
3. You should see your bill in the list with status **Pending**

✅ If you see it, the job was queued successfully!

## Step 3: Monitor Sending Process

### Watch the Status Change
1. Stay on **Operations** tab
2. Watch the **Pending** count decrease
3. Watch the **Sent** count increase
4. Your bill should move from Pending → Sent

### Timeline
- **0-5 seconds**: Job appears in Pending
- **5-15 seconds**: Network check happens
- **15-30 seconds**: PDF uploads to Firebase
- **30-45 seconds**: SMS sends via Twilio
- **45-60 seconds**: Status changes to Sent

### If It Stays Pending
1. Check **Network Status** - is it Online?
2. If Offline, wait for connection
3. Click **Refresh** button
4. Check browser console for errors

## Step 4: Verify SMS Received

### Check Your Phone
1. Wait 1-2 minutes
2. Check SMS on the phone number you entered
3. You should receive message like:
   ```
   Hi! Your bill BILL-001 is ready. Download it here: https://...
   ```

✅ If you got the SMS, everything is working!

### If SMS Not Received
1. Check phone number format (should be 10 digits)
2. Check Twilio account has credits
3. Check error message in Operations tab
4. Verify Twilio credentials in `.env`

## Step 5: Download Bill from Link

### Click the Link
1. Open the SMS on your phone
2. Click the download link
3. PDF should download
4. Open and verify it's your bill

✅ If PDF downloads, Firebase is working!

## Step 6: Test Retry Mechanism

### Create Another Bill
1. Go to **Billing** tab
2. Create another bill with phone number
3. Go to **Operations** tab
4. Wait for it to process

### Manually Retry
1. Go to **Failed** tab (if any failed)
2. Click **Retry** button
3. Watch status change back to Pending
4. Wait for it to process again

✅ If retry works, the mechanism is functioning!

## Troubleshooting

### Problem: Job Stuck in Pending

**Solution:**
1. Check network status (should be Online)
2. Check browser console for errors
3. Verify Firebase credentials
4. Verify Twilio credentials
5. Click Refresh button
6. Manually retry the job

### Problem: SMS Not Received

**Solution:**
1. Check phone number format (10 digits)
2. Check Twilio account balance
3. Check error message in Operations tab
4. Verify Twilio phone number in `.env`
5. Check spam folder on phone

### Problem: Firebase Upload Failed

**Solution:**
1. Check Firebase credentials in `.env`
2. Verify storage bucket exists
3. Check Firebase project permissions
4. Check error message in Operations tab
5. Manually retry the job

### Problem: Network Shows Offline

**Solution:**
1. Check internet connection
2. Check WiFi/mobile data
3. Check firewall/proxy
4. Wait a few seconds
5. Click Refresh button

## Testing Checklist

- [ ] Network status shows Online
- [ ] Created bill with phone number
- [ ] Job appears in Pending tab
- [ ] Job moves to Sent tab
- [ ] SMS received on phone
- [ ] PDF downloads from link
- [ ] Retry mechanism works
- [ ] Error handling works

## Expected Results

### Success Flow
```
Create Bill → Job Queued → Network Check → PDF Upload → SMS Send → Status Sent → SMS Received → PDF Downloaded
```

### Failure Flow
```
Create Bill → Job Queued → Network Check → Upload Failed → Status Failed → Manual Retry → Success
```

## Performance Metrics

### Typical Timings
- Job creation: < 1 second
- Network check: 1-2 seconds
- PDF upload: 5-10 seconds
- SMS send: 5-10 seconds
- Total: 15-30 seconds

### Network Requirements
- Minimum speed: 1 Mbps
- Latency: < 200 ms
- Connection: Stable

## Advanced Testing

### Test Offline Scenario
1. Disconnect internet
2. Create a bill
3. Job should appear in Pending
4. Reconnect internet
5. Job should process automatically

### Test Multiple Bills
1. Create 5 bills with different phone numbers
2. Watch them process in queue
3. All should eventually send
4. Check all SMS received

### Test Error Handling
1. Use invalid phone number
2. Watch job fail
3. Check error message
4. Manually retry with correct number

## Success Indicators

✅ **Everything Working If:**
- Network status updates every 10 seconds
- Jobs appear in Pending immediately
- Jobs move to Sent within 30 seconds
- SMS received within 1-2 minutes
- PDF downloads successfully
- Retry mechanism works
- No errors in console

## Next Steps

1. ✅ Test basic flow (create bill → receive SMS)
2. ✅ Test retry mechanism
3. ✅ Test offline scenario
4. ✅ Test multiple bills
5. ✅ Monitor for 24 hours
6. ✅ Deploy to production

Enjoy! 🚀

# PDF Generation & Bill Sending - Implementation Guide

## Overview

The bill sending system now:
1. **Generates PDF** from bill data using existing template
2. **Saves to temp directory** (OS-specific, dynamic path)
3. **Uploads to Firebase** 
4. **Sends SMS** with download link
5. **Deletes PDF** after upload (success or failure)
6. **Retries on failure** with fresh PDF generation

## How It Works

### Flow Diagram
```
Bill Created with Phone Number
    ↓
Job Created in Database (pending)
    ↓
Background Processor Picks Up Job
    ↓
Generate PDF (from bill data + items)
    ↓
Save to Temp Directory (OS-specific)
    ↓
Upload to Firebase
    ↓
Send SMS with Link
    ↓
Delete PDF from Temp
    ↓
Mark Job as Sent
    ↓
If Failed: Retry (generates new PDF)
```

## Temp Directory Paths

### By Operating System

**Linux:**
```
/tmp/vogue-prism-bills/VP0001.pdf
```

**macOS:**
```
/var/folders/xx/xxxxx/T/vogue-prism-bills/VP0001.pdf
```

**Windows:**
```
C:\Users\[Username]\AppData\Local\Temp\vogue-prism-bills\VP0001.pdf
```

### Dynamic Path Generation
```typescript
import * as os from 'os';
import * as path from 'path';

const tempDir = os.tmpdir(); // OS-specific temp directory
const billsDir = path.join(tempDir, 'vogue-prism-bills');
const pdfPath = path.join(billsDir, `${billNumber}.pdf`);
```

## PDF Generation Process

### 1. Get Bill Data
```typescript
const bill = getBillById(billId);
const items = getBillItems(billId);
const settings = getSettings();
```

### 2. Generate PDF
```typescript
const pdfPath = await generateBillPdf(
  billData,
  items,
  settings
);
```

### 3. Upload to Firebase
```typescript
const downloadUrl = await uploadBillPdfToFirebase(
  pdfPath,
  billNumber
);
```

### 4. Send SMS
```typescript
const smsId = await sendBillSms(
  customerPhone,
  billNumber,
  downloadUrl
);
```

### 5. Delete PDF
```typescript
deleteBillPdf(billNumber);
```

## Key Features

### ✅ OS-Independent Paths
- Uses `os.tmpdir()` for OS-specific temp directory
- Uses `path.join()` for cross-platform path handling
- Works on Linux, macOS, Windows

### ✅ Automatic Cleanup
- PDF deleted after successful upload
- PDF deleted after failed attempt
- No orphaned files left behind

### ✅ Retry with Fresh PDF
- On retry, new PDF is generated
- Uses latest bill data
- Ensures fresh upload

### ✅ Error Handling
- Catches PDF generation errors
- Catches upload errors
- Catches SMS errors
- Provides detailed error messages

## File Structure

### New Files
- `electron/services/pdfGenerator.ts` - PDF generation service
- `PDF_GENERATION_GUIDE.md` - This guide

### Modified Files
- `electron/services/billSendQueue.ts` - Uses PDF generator
- `electron/DB/bills.ts` - Creates send jobs
- `vite.config.ts` - Added jsdom to external
- `package.json` - Added jsdom dependency

## Configuration

### Environment Variables
```env
# No new env vars needed for PDF generation
# Uses existing settings from database
```

### Settings Used
```typescript
{
  storeName: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  gstNumber: string;
}
```

## Debugging

### Check Temp Directory
```typescript
import { getTempDirInfo } from 'electron/services/pdfGenerator';

const info = getTempDirInfo();
console.log(info);
// Output:
// {
//   tempDir: '/tmp',
//   billsDir: '/tmp/vogue-prism-bills',
//   platform: 'linux'
// }
```

### Check if PDF Exists
```typescript
import { billPdfExists } from 'electron/services/pdfGenerator';

if (billPdfExists('VP0001')) {
  console.log('PDF exists');
}
```

### Manual PDF Generation
```typescript
import { generateBillPdf } from 'electron/services/pdfGenerator';

const pdfPath = await generateBillPdf(billData, items, settings);
console.log(`PDF saved to: ${pdfPath}`);
```

## Testing

### Test 1: Create Bill with Phone Number
1. Go to Billing tab
2. Add products
3. Enter phone number
4. Click Save Bill
5. Check Operations tab → Pending

### Test 2: Monitor PDF Generation
1. Open browser console (F12)
2. Look for: "Generating PDF for bill VP0001"
3. Look for: "PDF generated: /tmp/vogue-prism-bills/VP0001.pdf"

### Test 3: Verify PDF Cleanup
1. Check temp directory before sending
2. PDF should exist during upload
3. PDF should be deleted after upload
4. Check temp directory after sending

### Test 4: Test Retry
1. Create bill with invalid phone number
2. Job fails
3. Go to Operations → Failed
4. Click Retry
5. New PDF generated
6. Retry with correct phone number

## Performance

### PDF Generation Time
- Typical: 2-5 seconds
- Depends on: Bill size, system resources
- Includes: HTML processing, canvas rendering, PDF creation

### Upload Time
- Typical: 5-10 seconds
- Depends on: File size, network speed
- Firebase: ~1-2 MB per PDF

### Total Time
- Typical: 15-30 seconds from bill creation to SMS sent
- Network dependent

## Troubleshooting

### PDF Not Generated
**Error:** "PDF file not created"
**Solution:**
1. Check disk space in temp directory
2. Check file permissions
3. Check system resources
4. Check console for detailed error

### PDF Not Deleted
**Error:** "Error deleting PDF"
**Solution:**
1. Check file is not locked
2. Check file permissions
3. Manual cleanup: Delete from temp directory
4. Check console for detailed error

### Wrong Temp Directory
**Error:** PDF saved to unexpected location
**Solution:**
1. Check `getTempDirInfo()` output
2. Verify OS temp directory
3. Check `os.tmpdir()` value
4. Check `path.join()` logic

## Best Practices

✅ **Do:**
- Let system handle PDF cleanup
- Use provided functions for PDF operations
- Check temp directory periodically
- Monitor PDF generation logs

❌ **Don't:**
- Manually manage PDF files
- Hardcode paths
- Assume temp directory location
- Delete PDFs manually

## Future Improvements

- [ ] Add PDF compression options
- [ ] Add custom template support
- [ ] Add PDF encryption
- [ ] Add batch PDF generation
- [ ] Add PDF archiving

## Support

For issues:
1. Check console logs
2. Check temp directory
3. Verify settings in database
4. Check network connectivity
5. Check Firebase credentials
6. Check Twilio credits

---

**Last Updated:** March 20, 2026
**Version:** 1.0

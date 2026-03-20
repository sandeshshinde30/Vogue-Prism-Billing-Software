import * as path from 'path';
import * as fs from 'fs';
import { BrowserWindow } from 'electron';
import {
  getPendingJobs,
  updateJobStatus,
  incrementJobAttempts,
  getJobById,
  BillSendJob,
} from '../DB/billSendJobs';
import { uploadBillPdfToFirebase } from './firebase';
import { sendBillSms } from './twilio';
import { getNetworkStatus, isNetworkAvailable } from './networkMonitor';
import { getBillById } from '../DB/bills';
import { generateBillPdf, deleteBillPdf, billPdfExists } from './pdfGenerator';
import { getSettings } from '../DB/settings';
import { getDatabase } from '../DB/connection';

const MAX_RETRIES = parseInt(process.env.BILL_SEND_MAX_RETRIES || '2');
const RETRY_DELAY = parseInt(process.env.BILL_SEND_RETRY_DELAY || '5000');

let processingInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

export function startBillSendQueue(mainWindow?: BrowserWindow) {
  if (processingInterval) return;

  console.log('Starting bill send queue processor');

  // Process immediately
  processBillQueue(mainWindow);

  // Process every 30 seconds
  processingInterval = setInterval(() => {
    processBillQueue(mainWindow);
  }, 30000);
}

export function stopBillSendQueue() {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    console.log('Bill send queue processor stopped');
  }
}

async function processBillQueue(mainWindow?: BrowserWindow) {
  if (isProcessing) return;

  isProcessing = true;

  try {
    const pendingJobs = getPendingJobs();

    if (pendingJobs.length === 0) {
      isProcessing = false;
      return;
    }

    console.log(`Processing ${pendingJobs.length} pending bill send jobs`);

    for (const job of pendingJobs) {
      // Check network before processing
      if (!isNetworkAvailable()) {
        console.log('Network not available, pausing queue processing');
        notifyUI(mainWindow, 'network-unavailable', getNetworkStatus());
        break;
      }

      try {
        await processSingleJob(job, mainWindow);
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
      }

      // Small delay between jobs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Error in bill send queue processor:', error);
  } finally {
    isProcessing = false;
  }
}

async function processSingleJob(job: BillSendJob, mainWindow?: BrowserWindow) {
  let pdfPath: string | null = null;
  
  try {
    console.log(`Processing job ${job.id} for bill ${job.billNumber}`);

    // Get bill details
    const billData = getBillById(job.billId);
    if (!billData) {
      throw new Error('Bill not found');
    }

    const bill = billData.bill;
    const billItems = billData.items;

    // Get store settings
    const settings = getSettings();

    // Generate PDF
    console.log(`Generating PDF for bill ${job.billNumber}`);
    pdfPath = await generateBillPdf(
      {
        billNumber: bill.billNumber,
        createdAt: bill.createdAt,
        total: bill.total,
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        discountPercent: bill.discountPercent,
        paymentMode: bill.paymentMode,
        cashAmount: bill.cashAmount,
        upiAmount: bill.upiAmount,
      },
      billItems,
      {
        storeName: settings.storeName || 'Vogue Prism',
        addressLine1: settings.addressLine1 || '',
        addressLine2: settings.addressLine2 || '',
        phone: settings.phone || '',
        gstNumber: settings.gstNumber || '',
      }
    );

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not created: ${pdfPath}`);
    }

    // Upload to Firebase
    console.log(`Uploading PDF for bill ${job.billNumber}`);
    const downloadUrl = await uploadBillPdfToFirebase(pdfPath, job.billNumber!);

    // Send SMS
    console.log(`Sending SMS to ${job.customerPhone}`);
    const smsId = await sendBillSms(job.customerPhone, job.billNumber!, downloadUrl);

    // Mark as sent
    updateJobStatus(job.id!, 'sent', {
      firebaseUrl: downloadUrl,
      smsId: smsId,
    });

    console.log(`Job ${job.id} completed successfully`);
    notifyUI(mainWindow, 'job-sent', { jobId: job.id, billNumber: job.billNumber });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Job ${job.id} failed:`, errorMessage);

    incrementJobAttempts(job.id!);
    const updatedJob = getJobById(job.id!);

    if (updatedJob && updatedJob.attempts >= MAX_RETRIES) {
      // Max retries reached, mark as failed
      updateJobStatus(job.id!, 'failed', {
        lastError: errorMessage,
      });
      console.log(`Job ${job.id} marked as failed after ${MAX_RETRIES} attempts`);
      notifyUI(mainWindow, 'job-failed', { jobId: job.id, error: errorMessage });
    } else {
      // Retry later
      console.log(`Job ${job.id} will be retried (attempt ${updatedJob?.attempts || 1}/${MAX_RETRIES})`);
      notifyUI(mainWindow, 'job-retry', { jobId: job.id, attempt: updatedJob?.attempts || 1 });
    }
  } finally {
    // Always delete PDF after processing (success or failure)
    if (pdfPath && job.billNumber) {
      try {
        deleteBillPdf(job.billNumber);
      } catch (error) {
        console.error('Error deleting PDF:', error);
      }
    }
  }
}

export async function manualRetryJob(jobId: number, mainWindow?: BrowserWindow) {
  try {
    const job = getJobById(jobId);
    if (!job) throw new Error('Job not found');

    // Reset attempts for manual retry
    updateJobStatus(jobId, 'pending');

    console.log(`Manual retry initiated for job ${jobId}`);
    notifyUI(mainWindow, 'job-retry-manual', { jobId });

    // Process immediately
    await processSingleJob(job, mainWindow);
  } catch (error) {
    console.error(`Error in manual retry for job ${jobId}:`, error);
    throw error;
  }
}

export async function manualSendJob(billId: number, customerPhone: string, mainWindow?: BrowserWindow) {
  try {
    const bill = getBillById(billId);
    if (!bill) throw new Error('Bill not found');

    // Create a temporary job
    const tempJob: BillSendJob = {
      billId,
      customerPhone,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      billAmount: bill.total,
    };

    await processSingleJob(tempJob, mainWindow);
  } catch (error) {
    console.error(`Error in manual send for bill ${billId}:`, error);
    throw error;
  }
}

function notifyUI(mainWindow: BrowserWindow | undefined, event: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bill-send-event', { event, data });
  }
}

export function getQueueStatus() {
  return {
    isProcessing,
    networkStatus: getNetworkStatus(),
  };
}

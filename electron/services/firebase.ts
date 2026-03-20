import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase() {
  if (firebaseApp) return firebaseApp;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      console.warn('Firebase credentials not configured. Bill sending will be disabled.');
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      } as admin.ServiceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    console.log('Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
}

export async function uploadBillPdfToFirebase(pdfPath: string, billNumber: string): Promise<string> {
  try {
    const app = initializeFirebase();
    if (!app) throw new Error('Firebase not initialized');

    const bucket = admin.storage().bucket();
    const fileName = `bills/${billNumber}-${Date.now()}.pdf`;

    // Upload file
    await bucket.upload(pdfPath, {
      destination: fileName,
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'public, max-age=3600',
      },
    });

    // Generate download URL
    const file = bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    console.log(`Bill PDF uploaded: ${fileName}`);
    return url;
  } catch (error) {
    console.error('Error uploading PDF to Firebase:', error);
    throw new Error(`Firebase upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteBillPdfFromFirebase(billNumber: string) {
  try {
    const app = initializeFirebase();
    if (!app) return;

    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({
      prefix: `bills/${billNumber}`,
    });

    for (const file of files) {
      await file.delete();
    }

    console.log(`Deleted bill PDFs for: ${billNumber}`);
  } catch (error) {
    console.error('Error deleting PDF from Firebase:', error);
  }
}

export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_STORAGE_BUCKET
  );
}

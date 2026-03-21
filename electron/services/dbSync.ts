import { getDatabase } from '../DB/connection';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { getConfig } from '../config';
import {
  getPendingSyncItems,
  markAsSynced,
  markSyncFailed,
  getPendingSyncCount,
  addToSyncQueue,
} from './syncQueue';
import {
  getTableMetadata,
  updateLastPullTime,
  updateLastPushTime,
  updatePendingCount,
  initTableMetadata,
} from './syncMetadata';

const config = getConfig();
const STORE_ID = config.storeId;
const BATCH_SIZE = config.sync.batchSize;

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: string;
  pendingCount: number;
  syncProgress: number; // 0-100
  error?: string;
}

let syncStatus: SyncStatus = {
  isOnline: false,
  isSyncing: false,
  pendingCount: 0,
  syncProgress: 0,
};

let syncInProgress = false;

// Initialize sync system
export async function initSync() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Sync disabled.');
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase client is null. Sync disabled.');
    return;
  }

  // Ensure store exists in Supabase
  try {
    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('id', STORE_ID)
      .single();

    if (!existingStore) {
      await supabase.from('stores').insert({
        id: STORE_ID,
        name: config.storeName,
      });
      console.log(`✓ Store registered: ${config.storeName} (${STORE_ID})`);
    }
  } catch (error) {
    console.error('Error initializing store:', error);
  }

  // Initialize metadata for all tables
  ['products', 'bills', 'bill_items'].forEach(table => {
    initTableMetadata(table);
  });
}

// Perform incremental pull (only changed records)
async function incrementalPull(tableName: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const metadata = getTableMetadata(tableName);
  const lastPullTime = metadata?.last_pull_at;

  let query = supabase
    .from(`${tableName}_sync`)
    .select('*')
    .eq('store_id', STORE_ID);

  // Only fetch records updated since last pull
  if (lastPullTime) {
    query = query.gt('updated_at', lastPullTime);
  }

  const { data, error } = await query.limit(BATCH_SIZE);

  if (error) {
    throw new Error(`Pull failed for ${tableName}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return 0;
  }

  const db = getDatabase();
  const transaction = db.transaction(() => {
    for (const record of data) {
      upsertLocalRecord(tableName, record);
    }
  });

  transaction();
  updateLastPullTime(tableName);

  return data.length;
}

// Perform incremental push (only pending changes)
async function incrementalPush(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const pendingItems = getPendingSyncItems();

  if (pendingItems.length === 0) {
    return 0;
  }

  console.log(`📤 Pushing ${pendingItems.length} pending items...`);
  let successCount = 0;

  for (const item of pendingItems) {
    try {
      console.log(`  Syncing ${item.table_name} #${item.record_id} (${item.operation})`);
      await pushSyncItem(item);
      markAsSynced(item.id!);
      successCount++;
      console.log(`  ✓ Synced ${item.table_name} #${item.record_id}`);
    } catch (error) {
      console.error(`  ✗ Failed to sync ${item.table_name} #${item.record_id}:`, error);
      markSyncFailed(item.id!, (error as Error).message);
    }
  }

  if (pendingItems.length > 0) {
    updatePendingCount(pendingItems[0].table_name, getPendingSyncCount());
  }
  
  console.log(`✓ Successfully pushed ${successCount}/${pendingItems.length} items`);
  return successCount;
}

// Push a single sync item to Supabase
async function pushSyncItem(item: any) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const tableName = `${item.table_name}_sync`;

  switch (item.operation) {
    case 'insert':
    case 'update': {
      const syncData: any = {
        id: item.record_id,
        store_id: STORE_ID,
        ...item.data,
      };
      
      // Only add updated_at for tables that have it
      if (item.table_name !== 'bill_items') {
        syncData.updated_at = new Date().toISOString();
      }
      
      const { error } = await supabase.from(tableName).upsert(syncData);

      if (error) throw error;
      break;
    }

    case 'delete': {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', item.record_id)
        .eq('store_id', STORE_ID);

      if (error) throw error;
      break;
    }
  }
}

// Upsert record into local database
function upsertLocalRecord(tableName: string, record: any) {
  const db = getDatabase();

  // Map from sync table format to local format
  const localRecord = mapFromSyncFormat(tableName, record);

  if (tableName === 'products') {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO products (
        id, name, category, size, barcode, costPrice, price, stock,
        lowStockThreshold, isActive, isDiscountLocked, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      localRecord.id,
      localRecord.name,
      localRecord.category,
      localRecord.size,
      localRecord.barcode,
      localRecord.costPrice,
      localRecord.price,
      localRecord.stock,
      localRecord.lowStockThreshold,
      localRecord.isActive ? 1 : 0,
      localRecord.isDiscountLocked ? 1 : 0,
      localRecord.createdAt,
      localRecord.updatedAt
    );
  } else if (tableName === 'bills') {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO bills (
        id, billNumber, subtotal, discountPercent, discountAmount, total,
        paymentMode, cashAmount, upiAmount, customerMobileNumber, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      localRecord.id,
      localRecord.billNumber,
      localRecord.subtotal,
      localRecord.discountPercent,
      localRecord.discountAmount,
      localRecord.total,
      localRecord.paymentMode,
      localRecord.cashAmount,
      localRecord.upiAmount,
      localRecord.customerMobileNumber,
      localRecord.status,
      localRecord.createdAt
    );
  } else if (tableName === 'bill_items') {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO bill_items (
        id, billId, productId, productName, size, quantity, unitPrice, totalPrice, discountLocked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      localRecord.id,
      localRecord.billId,
      localRecord.productId,
      localRecord.productName,
      localRecord.size,
      localRecord.quantity,
      localRecord.unitPrice,
      localRecord.totalPrice,
      localRecord.discountLocked ? 1 : 0
    );
  }
}

// Map from Supabase format to local format
function mapFromSyncFormat(tableName: string, record: any) {
  if (tableName === 'products') {
    return {
      id: record.id,
      name: record.name,
      category: record.category,
      size: record.size,
      barcode: record.barcode,
      costPrice: record.cost_price,
      price: record.price,
      stock: record.stock,
      lowStockThreshold: record.low_stock_threshold,
      isActive: record.is_active,
      isDiscountLocked: record.is_discount_locked,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  } else if (tableName === 'bills') {
    return {
      id: record.id,
      billNumber: record.bill_number,
      subtotal: record.subtotal,
      discountPercent: record.discount_percent,
      discountAmount: record.discount_amount,
      total: record.total,
      paymentMode: record.payment_mode,
      cashAmount: record.cash_amount,
      upiAmount: record.upi_amount,
      customerMobileNumber: record.customer_mobile_number,
      status: record.status,
      createdAt: record.created_at,
    };
  } else if (tableName === 'bill_items') {
    return {
      id: record.id,
      billId: record.bill_id,
      productId: record.product_id,
      productName: record.product_name,
      size: record.size,
      quantity: record.quantity,
      unitPrice: record.unit_price,
      totalPrice: record.total_price,
      discountLocked: record.discount_locked,
    };
  }
  return record;
}

// Main sync function (pull then push) - only sync if there are pending changes
export async function performSync(isOnline: boolean): Promise<SyncStatus> {
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase || syncInProgress) {
    return syncStatus;
  }

  // Check if there are any pending changes first
  const pendingCount = getPendingSyncCount();
  if (pendingCount === 0 && !syncStatus.error) {
    // No changes to sync, just update status
    syncStatus.isOnline = isOnline;
    syncStatus.lastSyncTime = new Date().toISOString();
    return syncStatus;
  }

  syncInProgress = true;
  syncStatus.isSyncing = true;
  syncStatus.isOnline = isOnline;
  syncStatus.syncProgress = 0;

  try {
    if (!isOnline) {
      syncStatus.error = 'No internet connection';
      return syncStatus;
    }

    // Step 1: Pull changes from server (incremental)
    syncStatus.syncProgress = 10;
    let pullCount = 0;

    for (const table of ['products', 'bills', 'bill_items']) {
      try {
        const count = await incrementalPull(table);
        pullCount += count;
      } catch (error) {
        console.error(`Pull error for ${table}:`, error);
      }
    }

    syncStatus.syncProgress = 50;

    // Step 2: Push pending changes (only if there are any)
    let pushCount = 0;
    if (pendingCount > 0) {
      pushCount = await incrementalPush();
    }

    syncStatus.syncProgress = 90;
    syncStatus.pendingCount = getPendingSyncCount();
    syncStatus.lastSyncTime = new Date().toISOString();
    syncStatus.error = undefined;

    syncStatus.syncProgress = 100;
    
    console.log(`✓ Sync completed: ${pullCount} pulled, ${pushCount} pushed, ${syncStatus.pendingCount} pending`);
  } catch (error) {
    syncStatus.error = (error as Error).message;
    console.error('Sync error:', error);
  } finally {
    syncInProgress = false;
    syncStatus.isSyncing = false;
  }

  return syncStatus;
}

// Get current sync status
export function getSyncStatus(): SyncStatus {
  return {
    ...syncStatus,
    pendingCount: getPendingSyncCount(),
  };
}

// Track local changes for sync
export function trackLocalChange(
  tableName: string,
  operation: 'insert' | 'update' | 'delete',
  recordId: number,
  data?: Record<string, any>
) {
  if (!isSupabaseConfigured()) return;

  addToSyncQueue(tableName, operation, recordId, data);
  updatePendingCount(tableName, getPendingSyncCount());
}

// Force full sync (push all existing data)
export async function forceFullSync() {
  if (!isSupabaseConfigured()) return;

  const db = getDatabase();
  
  console.log('🔄 Starting Force Full Sync...');
  
  // First, let's see what's currently in the queue
  const existingQueue = db.prepare('SELECT table_name, operation, COUNT(*) as count FROM sync_queue GROUP BY table_name, operation').all();
  console.log('📊 Current sync queue:', existingQueue);
  
  // Clear existing sync queue
  db.exec('DELETE FROM sync_queue');
  console.log('✓ Cleared sync queue');
  
  // Add all existing bills to sync queue
  const bills = db.prepare('SELECT * FROM bills').all() as any[];
  console.log(`📋 Found ${bills.length} bills to sync`);
  
  for (const bill of bills) {
    trackLocalChange('bills', 'insert', bill.id, {
      bill_number: bill.billNumber,
      subtotal: bill.subtotal,
      discount_percent: bill.discountPercent,
      discount_amount: bill.discountAmount,
      total: bill.total,
      payment_mode: bill.paymentMode,
      cash_amount: bill.cashAmount,
      upi_amount: bill.upiAmount,
      customer_mobile_number: bill.customerMobileNumber,
      status: bill.status,
      created_at: bill.createdAt,
    });
  }
  
  // Add all existing bill items to sync queue
  const billItems = db.prepare('SELECT * FROM bill_items').all() as any[];
  console.log(`📦 Found ${billItems.length} bill items to sync`);
  
  for (const item of billItems) {
    trackLocalChange('bill_items', 'insert', item.id, {
      bill_id: item.billId,
      product_id: item.productId,
      product_name: item.productName,
      size: item.size,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      discount_locked: item.discountLocked,
      created_at: new Date().toISOString(),
    });
  }
  
  // Add all existing products to sync queue
  const products = db.prepare('SELECT * FROM products').all() as any[];
  console.log(`🏷️  Found ${products.length} products to sync`);
  
  for (const product of products) {
    trackLocalChange('products', 'insert', product.id, {
      name: product.name,
      category: product.category,
      size: product.size,
      barcode: product.barcode,
      cost_price: product.costPrice,
      price: product.price,
      stock: product.stock,
      low_stock_threshold: product.lowStockThreshold,
      is_active: product.isActive,
      is_discount_locked: product.isDiscountLocked,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    });
  }
  
  const pendingCount = getPendingSyncCount();
  console.log(`✓ Added ${pendingCount} items to sync queue`);
  
  // Show breakdown
  const queueBreakdown = db.prepare('SELECT table_name, operation, status, COUNT(*) as count FROM sync_queue GROUP BY table_name, operation, status').all();
  console.log('📊 Queue breakdown:', queueBreakdown);
  
  // Reset metadata
  db.exec('DELETE FROM sync_metadata');
  ['products', 'bills', 'bill_items'].forEach(table => {
    initTableMetadata(table);
  });
  
  // Perform sync
  console.log('🚀 Starting sync...');
  return performSync(true);
}

// Get sync queue details for debugging
export function getSyncQueueDetails() {
  const db = getDatabase();
  
  const breakdown = db.prepare(`
    SELECT 
      table_name,
      operation,
      status,
      COUNT(*) as count
    FROM sync_queue
    GROUP BY table_name, operation, status
  `).all();
  
  const failedItems = db.prepare(`
    SELECT 
      table_name,
      operation,
      record_id,
      error_message,
      retry_count
    FROM sync_queue
    WHERE status = 'failed'
    LIMIT 10
  `).all();
  
  return {
    breakdown,
    failedItems,
    totalPending: getPendingSyncCount(),
  };
}


// Get DB statistics from Supabase
export async function getDBStatistics() {
  const supabase = getSupabase();
  
  if (!isSupabaseConfigured() || !supabase) {
    return {
      totalSize: 500,
      usedSize: 0,
      freeSize: 500,
      bandwidthUsed: 0,
      bandwidthLimit: 5000,
    };
  }

  try {
    // Get database size (approximate based on row counts)
    const { count: productsCount } = await supabase
      .from('products_sync')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID);

    const { count: billsCount } = await supabase
      .from('bills_sync')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID);

    const { count: billItemsCount } = await supabase
      .from('bill_items_sync')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID);

    // Estimate size (rough calculation: ~1KB per product, ~2KB per bill, ~0.5KB per bill item)
    const estimatedSize = 
      ((productsCount || 0) * 1) + 
      ((billsCount || 0) * 2) + 
      ((billItemsCount || 0) * 0.5);

    const usedSizeMB = estimatedSize / 1024; // Convert KB to MB
    const totalSizeMB = 500; // Free tier limit
    const freeSizeMB = totalSizeMB - usedSizeMB;

    // Estimate bandwidth (rough: same as data size for now)
    const bandwidthUsedMB = usedSizeMB * 2; // Assume 2x for read/write
    const bandwidthLimitMB = 5000; // 5GB free tier

    return {
      totalSize: totalSizeMB,
      usedSize: Math.max(0, usedSizeMB),
      freeSize: Math.max(0, freeSizeMB),
      bandwidthUsed: Math.max(0, bandwidthUsedMB),
      bandwidthLimit: bandwidthLimitMB,
    };
  } catch (error) {
    console.error('Error getting DB statistics:', error);
    return {
      totalSize: 500,
      usedSize: 0,
      freeSize: 500,
      bandwidthUsed: 0,
      bandwidthLimit: 5000,
    };
  }
}

// Get unsynced bills from sync queue
export function getUnsyncedBills() {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT 
      sq.id as queueId,
      sq.operation,
      sq.retry_count as retryCount,
      sq.error_message as errorMessage,
      b.id,
      b.billNumber,
      b.total,
      b.createdAt,
      b.paymentMode,
      (SELECT COUNT(*) FROM bill_items WHERE billId = b.id) as itemCount
    FROM sync_queue sq
    JOIN bills b ON sq.record_id = b.id
    WHERE sq.table_name = 'bills' AND sq.synced = 0
    ORDER BY b.createdAt DESC
  `);
  
  return stmt.all();
}

// Get synced bills (recently synced)
export function getSyncedBills() {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT 
      sq.id as queueId,
      sq.operation,
      b.id,
      b.billNumber,
      b.total,
      b.createdAt,
      b.paymentMode,
      (SELECT COUNT(*) FROM bill_items WHERE billId = b.id) as itemCount
    FROM sync_queue sq
    JOIN bills b ON sq.record_id = b.id
    WHERE sq.table_name = 'bills' AND sq.synced = 1
    ORDER BY b.createdAt DESC
    LIMIT 50
  `);
  
  return stmt.all();
}

// Sync a single bill by queue ID
export async function syncSingleBill(queueId: string) {
  const supabase = getSupabase();
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase not configured');
  }

  const db = getDatabase();
  
  // Get the sync queue item
  const queueStmt = db.prepare('SELECT * FROM sync_queue WHERE id = ?');
  const queueItem = queueStmt.get(queueId) as any;
  
  if (!queueItem) {
    throw new Error('Queue item not found');
  }

  // Parse the data
  const item = {
    ...queueItem,
    data: queueItem.data ? JSON.parse(queueItem.data) : undefined,
  };

  try {
    await pushSyncItem(item);
    markAsSynced(queueId);
    
    // Also sync bill items if this is a bill
    if (item.table_name === 'bills') {
      const billItemsStmt = db.prepare(`
        SELECT * FROM sync_queue 
        WHERE table_name = 'bill_items' 
        AND synced = 0 
        AND json_extract(data, '$.bill_id') = ?
      `);
      const billItems = billItemsStmt.all(item.record_id) as any[];
      
      for (const billItem of billItems) {
        const parsedItem = {
          ...billItem,
          data: billItem.data ? JSON.parse(billItem.data) : undefined,
        };
        await pushSyncItem(parsedItem);
        markAsSynced(billItem.id);
      }
    }
    
    return { success: true };
  } catch (error) {
    markSyncFailed(queueId, (error as Error).message);
    throw error;
  }
}

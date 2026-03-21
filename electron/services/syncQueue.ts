import { getDatabase } from '../DB/connection';

export interface SyncQueueItem {
  id?: string;
  table_name: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: number;
  data?: Record<string, any>;
  created_at?: string;
  synced?: boolean;
}

// Create sync queue table in local SQLite
export function initSyncQueue() {
  const db = getDatabase();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      synced INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      error_message TEXT
    )
  `);
}

// Add item to sync queue
export function addToSyncQueue(
  tableName: string,
  operation: 'insert' | 'update' | 'delete',
  recordId: number,
  data?: Record<string, any>
) {
  const db = getDatabase();
  const id = `${tableName}_${operation}_${recordId}_${Date.now()}`;
  
  const stmt = db.prepare(`
    INSERT INTO sync_queue (id, table_name, operation, record_id, data, synced)
    VALUES (?, ?, ?, ?, ?, 0)
  `);
  
  stmt.run(
    id,
    tableName,
    operation,
    recordId,
    data ? JSON.stringify(data) : null
  );
  
  return id;
}

// Get pending sync items
export function getPendingSyncItems(): SyncQueueItem[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC
  `);
  
  const items = stmt.all() as any[];
  
  return items.map(item => ({
    ...item,
    data: item.data ? JSON.parse(item.data) : undefined,
  }));
}

// Get pending count
export function getPendingSyncCount(): number {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0
  `);
  
  const result = stmt.get() as any;
  return result.count;
}

// Mark item as synced
export function markAsSynced(id: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    UPDATE sync_queue SET synced = 1 WHERE id = ?
  `);
  
  stmt.run(id);
}

// Mark item as failed
export function markSyncFailed(id: string, errorMessage: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    UPDATE sync_queue 
    SET retry_count = retry_count + 1, error_message = ?
    WHERE id = ?
  `);
  
  stmt.run(errorMessage, id);
}

// Get failed items (for retry)
export function getFailedSyncItems(maxRetries = 3): SyncQueueItem[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM sync_queue 
    WHERE synced = 0 AND retry_count < ? 
    ORDER BY created_at ASC
  `);
  
  const items = stmt.all(maxRetries) as any[];
  
  return items.map(item => ({
    ...item,
    data: item.data ? JSON.parse(item.data) : undefined,
  }));
}

// Clear old synced items (older than 30 days)
export function clearOldSyncedItems() {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    DELETE FROM sync_queue 
    WHERE synced = 1 AND created_at < datetime('now', '-30 days')
  `);
  
  stmt.run();
}

// Get sync queue stats
export function getSyncQueueStats() {
  const db = getDatabase();
  
  const pendingStmt = db.prepare(`
    SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0
  `);
  
  const failedStmt = db.prepare(`
    SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0 AND retry_count > 0
  `);
  
  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count FROM sync_queue
  `);
  
  return {
    pending: (pendingStmt.get() as any).count,
    failed: (failedStmt.get() as any).count,
    total: (totalStmt.get() as any).count,
  };
}

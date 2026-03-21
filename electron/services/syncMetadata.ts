import { getDatabase } from '../DB/connection';

export interface SyncMetadata {
  table_name: string;
  last_sync_at: string;
  last_pull_at?: string;
  last_push_at?: string;
  pending_count: number;
}

// Create sync metadata table in local SQLite
export function initSyncMetadata() {
  const db = getDatabase();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      table_name TEXT PRIMARY KEY,
      last_sync_at TEXT DEFAULT (datetime('now', 'localtime')),
      last_pull_at TEXT,
      last_push_at TEXT,
      pending_count INTEGER DEFAULT 0
    )
  `);
}

// Initialize metadata for a table
export function initTableMetadata(tableName: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO sync_metadata (table_name, last_sync_at)
    VALUES (?, datetime('now', 'localtime'))
  `);
  
  stmt.run(tableName);
}

// Get metadata for a table
export function getTableMetadata(tableName: string): SyncMetadata | null {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM sync_metadata WHERE table_name = ?
  `);
  
  return stmt.get(tableName) as SyncMetadata | null;
}

// Update last pull time
export function updateLastPullTime(tableName: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    UPDATE sync_metadata 
    SET last_pull_at = datetime('now', 'localtime')
    WHERE table_name = ?
  `);
  
  stmt.run(tableName);
}

// Update last push time
export function updateLastPushTime(tableName: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    UPDATE sync_metadata 
    SET last_push_at = datetime('now', 'localtime')
    WHERE table_name = ?
  `);
  
  stmt.run(tableName);
}

// Update pending count
export function updatePendingCount(tableName: string, count: number) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    UPDATE sync_metadata 
    SET pending_count = ?
    WHERE table_name = ?
  `);
  
  stmt.run(count, tableName);
}

// Get all metadata
export function getAllMetadata(): SyncMetadata[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM sync_metadata ORDER BY table_name
  `);
  
  return stmt.all() as SyncMetadata[];
}

// Reset metadata (for full sync)
export function resetMetadata(tableName: string) {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    UPDATE sync_metadata 
    SET last_pull_at = NULL, last_push_at = NULL, pending_count = 0
    WHERE table_name = ?
  `);
  
  stmt.run(tableName);
}

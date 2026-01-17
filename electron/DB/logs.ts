import { getDatabase } from './connection';

export interface ActivityLog {
  id: number;
  action: string;
  entityType: 'product' | 'bill' | 'setting' | 'system';
  entityId?: number;
  details: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  createdAt: string;
}

// CREATE - Add activity log
export function addActivityLog(
  action: string,
  entityType: 'product' | 'bill' | 'setting' | 'system',
  details: string,
  entityId?: number,
  oldValue?: string,
  newValue?: string,
  userId?: string
) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO activity_logs (action, entityType, entityId, details, oldValue, newValue, userId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);
  
  const result = stmt.run(
    action,
    entityType,
    entityId || null,
    details,
    oldValue || null,
    newValue || null,
    userId || 'system'
  );
  
  return result.lastInsertRowid;
}

// READ - Get activity logs with pagination
export function getActivityLogs(
  limit: number = 100,
  offset: number = 0,
  entityType?: string,
  dateFrom?: string,
  dateTo?: string
) {
  const db = getDatabase();
  
  let query = 'SELECT * FROM activity_logs';
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (entityType) {
    conditions.push('entityType = ?');
    params.push(entityType);
  }
  
  if (dateFrom) {
    conditions.push('date(createdAt) >= ?');
    params.push(dateFrom);
  }
  
  if (dateTo) {
    conditions.push('date(createdAt) <= ?');
    params.push(dateTo);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const stmt = db.prepare(query);
  return stmt.all(...params);
}

// READ - Get logs count
export function getLogsCount(
  entityType?: string,
  dateFrom?: string,
  dateTo?: string
) {
  const db = getDatabase();
  
  let query = 'SELECT COUNT(*) as count FROM activity_logs';
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (entityType) {
    conditions.push('entityType = ?');
    params.push(entityType);
  }
  
  if (dateFrom) {
    conditions.push('date(createdAt) >= ?');
    params.push(dateFrom);
  }
  
  if (dateTo) {
    conditions.push('date(createdAt) <= ?');
    params.push(dateTo);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  const stmt = db.prepare(query);
  return stmt.get(...params) as { count: number };
}

// UTILITY - Clear old logs (keep last 1000 entries)
export function cleanupOldLogs() {
  const db = getDatabase();
  const stmt = db.prepare(`
    DELETE FROM activity_logs 
    WHERE id NOT IN (
      SELECT id FROM activity_logs 
      ORDER BY createdAt DESC 
      LIMIT 1000
    )
  `);
  
  const result = stmt.run();
  return result.changes;
}
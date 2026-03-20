import { getDatabase } from './connection';

export interface BillSendJob {
  id?: number;
  billId: number;
  customerPhone: string;
  status: 'pending' | 'sent' | 'failed';
  firebaseUrl?: string;
  smsId?: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
  billNumber?: string;
  customerName?: string;
  billAmount?: number;
}

export function initializeBillSendJobsTable() {
  const db = getDatabase();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS bill_send_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      billId INTEGER NOT NULL,
      customerPhone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      firebaseUrl TEXT,
      smsId TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sentAt DATETIME,
      FOREIGN KEY(billId) REFERENCES bills(id),
      UNIQUE(billId)
    );
  `);
}

export function createBillSendJob(job: Omit<BillSendJob, 'id' | 'createdAt'>): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO bill_send_jobs (billId, customerPhone, status, attempts, createdAt)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);
  
  const result = stmt.run(job.billId, job.customerPhone, job.status, job.attempts);
  return result.lastInsertRowid as number;
}

export function getPendingJobs(): BillSendJob[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      bsj.id,
      bsj.billId,
      bsj.customerPhone,
      bsj.status,
      bsj.firebaseUrl,
      bsj.smsId,
      bsj.attempts,
      bsj.lastError,
      bsj.createdAt,
      bsj.sentAt,
      b.billNumber,
      b.total as billAmount
    FROM bill_send_jobs bsj
    JOIN bills b ON bsj.billId = b.id
    WHERE bsj.status = 'pending'
    ORDER BY bsj.createdAt ASC
  `);
  
  const jobs = stmt.all() as any[];
  return jobs.map(job => ({
    ...job,
    customerName: 'Customer'
  }));
}

export function getJobsByStatus(status: 'pending' | 'sent' | 'failed'): BillSendJob[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      bsj.id,
      bsj.billId,
      bsj.customerPhone,
      bsj.status,
      bsj.firebaseUrl,
      bsj.smsId,
      bsj.attempts,
      bsj.lastError,
      bsj.createdAt,
      bsj.sentAt,
      b.billNumber,
      b.total as billAmount
    FROM bill_send_jobs bsj
    JOIN bills b ON bsj.billId = b.id
    WHERE bsj.status = ?
    ORDER BY bsj.createdAt DESC
    LIMIT 100
  `);
  
  const jobs = stmt.all(status) as any[];
  return jobs.map(job => ({
    ...job,
    customerName: 'Customer'
  }));
}

export function getAllJobs(): BillSendJob[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      bsj.id,
      bsj.billId,
      bsj.customerPhone,
      bsj.status,
      bsj.firebaseUrl,
      bsj.smsId,
      bsj.attempts,
      bsj.lastError,
      bsj.createdAt,
      bsj.sentAt,
      b.billNumber,
      b.total as billAmount
    FROM bill_send_jobs bsj
    JOIN bills b ON bsj.billId = b.id
    ORDER BY bsj.createdAt DESC
    LIMIT 200
  `);
  
  const jobs = stmt.all() as any[];
  return jobs.map(job => ({
    ...job,
    customerName: 'Customer'
  }));
}

export function updateJobStatus(jobId: number, status: 'pending' | 'sent' | 'failed', data?: { firebaseUrl?: string; smsId?: string; lastError?: string }) {
  const db = getDatabase();
  
  let query = `UPDATE bill_send_jobs SET status = ?`;
  const params: any[] = [status];
  
  if (status === 'sent') {
    query += `, sentAt = datetime('now')`;
  }
  
  if (data?.firebaseUrl) {
    query += `, firebaseUrl = ?`;
    params.push(data.firebaseUrl);
  }
  
  if (data?.smsId) {
    query += `, smsId = ?`;
    params.push(data.smsId);
  }
  
  if (data?.lastError) {
    query += `, lastError = ?`;
    params.push(data.lastError);
  }
  
  query += ` WHERE id = ?`;
  params.push(jobId);
  
  const stmt = db.prepare(query);
  stmt.run(...params);
}

export function incrementJobAttempts(jobId: number) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE bill_send_jobs 
    SET attempts = attempts + 1 
    WHERE id = ?
  `);
  
  stmt.run(jobId);
}

export function getJobById(jobId: number): BillSendJob | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      bsj.id,
      bsj.billId,
      bsj.customerPhone,
      bsj.status,
      bsj.firebaseUrl,
      bsj.smsId,
      bsj.attempts,
      bsj.lastError,
      bsj.createdAt,
      bsj.sentAt,
      b.billNumber,
      b.total as billAmount
    FROM bill_send_jobs bsj
    JOIN bills b ON bsj.billId = b.id
    WHERE bsj.id = ?
  `);
  
  const job = stmt.get(jobId) as any;
  if (!job) return null;
  
  return {
    ...job,
    customerName: 'Customer'
  };
}

export function getJobStats() {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      status,
      COUNT(*) as count
    FROM bill_send_jobs
    GROUP BY status
  `);
  
  const results = stmt.all() as Array<{ status: string; count: number }>;
  
  return {
    pending: results.find(r => r.status === 'pending')?.count || 0,
    sent: results.find(r => r.status === 'sent')?.count || 0,
    failed: results.find(r => r.status === 'failed')?.count || 0,
    total: results.reduce((sum, r) => sum + r.count, 0)
  };
}

export function deleteJob(jobId: number) {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM bill_send_jobs WHERE id = ?`);
  stmt.run(jobId);
}

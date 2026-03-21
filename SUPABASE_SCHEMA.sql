-- Supabase Schema for Multi-Store DB Sync
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores table (master list of all stores)
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync metadata table (tracks last sync per store per table)
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id TEXT NOT NULL REFERENCES stores(id),
  table_name TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_pull_at TIMESTAMP WITH TIME ZONE,
  last_push_at TIMESTAMP WITH TIME ZONE,
  pending_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, table_name)
);

-- Products sync table (master copy)
CREATE TABLE IF NOT EXISTS products_sync (
  id INTEGER NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  size TEXT,
  barcode TEXT,
  cost_price REAL DEFAULT 0,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  is_discount_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (store_id, id)
);

-- Bills sync table (master copy)
CREATE TABLE IF NOT EXISTS bills_sync (
  id INTEGER NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  bill_number TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_mode TEXT NOT NULL,
  cash_amount REAL DEFAULT 0,
  upi_amount REAL DEFAULT 0,
  customer_mobile_number TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (store_id, id)
);

-- Bill items sync table
CREATE TABLE IF NOT EXISTS bill_items_sync (
  id INTEGER NOT NULL,
  store_id TEXT NOT NULL,
  bill_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  size TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  discount_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (store_id, id),
  FOREIGN KEY (store_id, bill_id) REFERENCES bills_sync(store_id, id)
);

-- Sync queue table (tracks pending operations)
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id TEXT NOT NULL REFERENCES stores(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'insert', 'update', 'delete'
  record_id INTEGER NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_products_sync_store_updated ON products_sync(store_id, updated_at);
CREATE INDEX idx_bills_sync_store_created ON bills_sync(store_id, created_at);
CREATE INDEX idx_bill_items_sync_store_bill ON bill_items_sync(store_id, bill_id);
CREATE INDEX idx_sync_queue_store_synced ON sync_queue(store_id, synced_at);
CREATE INDEX idx_sync_metadata_store ON sync_metadata(store_id);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now, restrict later based on store_id)
CREATE POLICY "Allow all for authenticated users" ON stores FOR ALL USING (TRUE);
CREATE POLICY "Allow all for authenticated users" ON sync_metadata FOR ALL USING (TRUE);
CREATE POLICY "Allow all for authenticated users" ON products_sync FOR ALL USING (TRUE);
CREATE POLICY "Allow all for authenticated users" ON bills_sync FOR ALL USING (TRUE);
CREATE POLICY "Allow all for authenticated users" ON bill_items_sync FOR ALL USING (TRUE);
CREATE POLICY "Allow all for authenticated users" ON sync_queue FOR ALL USING (TRUE);

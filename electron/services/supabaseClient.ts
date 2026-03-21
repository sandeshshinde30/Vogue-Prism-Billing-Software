import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
let initialized = false;

function initSupabase() {
  if (initialized) return;
  initialized = true;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Supabase credentials not configured. DB Sync will be disabled.');
    console.warn('   VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.warn('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
    supabase = null;
  } else {
    console.log('✓ Supabase client initialized successfully');
    console.log('  URL:', supabaseUrl);
    console.log('  Store ID:', process.env.VITE_STORE_ID || 'Not set');
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
}

export function getSupabase(): SupabaseClient | null {
  if (!initialized) {
    initSupabase();
  }
  return supabase;
}

export const isSupabaseConfigured = () => {
  if (!initialized) {
    initSupabase();
  }
  return !!supabase;
};


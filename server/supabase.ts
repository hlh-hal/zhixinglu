import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars only in local development
if (!process.env.VERCEL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('WARNING: SUPABASE_URL is not defined.');
}
if (!supabaseServiceKey) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is not defined.');
}

// Create a Supabase client with the service role key.
// This allows the backend to bypass RLS and perform admin actions if needed,
// but usually we will act on behalf of the user using their JWT token where appropriate.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量（仅本地）
if (!process.env.VERCEL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.error('CRITICAL ERROR: SUPABASE_URL is not defined.');
}
if (!supabaseServiceKey) {
  console.error('CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined.');
}

// Create a Supabase client with the service role key.
// 使用空字符串作为回退，createClient 通常会抛出更具体的 URL 解析错误
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

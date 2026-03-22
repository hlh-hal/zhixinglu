import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 仅在本地开发环境中加载 .env 文件，防止 Vercel 环境中的干扰
if (!process.env.VERCEL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// 基础校验，防止 createClient 传入空值导致崩溃
if (!supabaseUrl) {
  console.error('CRITICAL ERROR: VITE_SUPABASE_URL is not defined in environment variables.');
}

// Extend the Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Global anonymous supabase client for verifying tokens
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // 验证 Token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized', details: error?.message });
    }

    req.user = user;
    next();
  } catch (err: any) {
    // 捕获异步错误并传递给 Express 的全局错误处理器
    console.error('Auth Middleware Error:', err);
    next(err);
  }
};

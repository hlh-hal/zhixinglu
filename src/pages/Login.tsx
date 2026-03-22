import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isSignApp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // If already logged in, redirect
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignApp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Assume auto sign-in or check email verification
        setErrorMsg('Registered successfully! If email confirmation is enabled, please check your inbox.');
        // Briefly switch to login to allow them to login if auto login fails
        setTimeout(() => setIsSignUp(false), 2000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 bg-gradient-to-br from-surface to-surface-container">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-slate-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold font-headline text-slate-900 tracking-tight">知行录</h1>
          <p className="text-sm font-medium text-slate-500 tracking-widest uppercase mt-3">Digital Scholar Sanctuary</p>
        </div>

        {errorMsg && (
          <div className={`p-4 mb-6 text-sm rounded-xl ${errorMsg.includes('success') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">邮箱</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">密码</label>
            <input 
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {loading ? '处理中...' : (isSignApp ? '注册' : '登录')}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-slate-500">
          {isSignApp ? '已有账号？' : '还没有账号？'}{' '}
          <button 
            onClick={() => { setIsSignUp(!isSignApp); setErrorMsg(''); }} 
            className="text-primary hover:text-primary/80 transition-colors"
          >
            {isSignApp ? '直接登录' : '立即注册'}
          </button>
        </div>
      </div>
    </div>
  );
}

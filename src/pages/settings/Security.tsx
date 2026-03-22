import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import { del, get } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

type ProfileInfo = {
  joined_at?: string | null;
};

function InfoRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 pb-6 border-b border-surface-container/50">
      <div>
        <p className="text-on-surface-variant text-sm font-medium mb-1">{label}</p>
        <p className="text-base font-semibold text-on-surface">{value}</p>
      </div>
      {action}
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-[0_40px_100px_rgba(15,23,42,0.18)]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-headline text-2xl font-black text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Security() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [email, setEmail] = useState('');
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [{ data: authData }, profileData] = await Promise.all([
          supabase.auth.getUser(),
          get<ProfileInfo>('/api/settings/profile'),
        ]);

        if (!active) return;

        setProfile(profileData);
        setEmail(authData.user?.email || '');
        setNewEmail(authData.user?.email || '');
        setLastSignInAt(authData.user?.last_sign_in_at || null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载账号信息失败');
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const joinedAtText = useMemo(() => {
    if (!profile?.joined_at) return '暂无记录';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(profile.joined_at));
  }, [profile?.joined_at]);

  const lastSignInText = useMemo(() => {
    if (!lastSignInAt) return '暂无记录';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(lastSignInAt));
  }, [lastSignInAt]);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      toast.error('密码至少8位，且必须包含字母和数字');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('密码修改成功');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '密码修改失败');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('请输入新邮箱');
      return;
    }

    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success('验证邮件已发送到新邮箱，请查收确认');
      setEmailModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '邮箱修改失败');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await del<{ success: true }>('/api/settings/account');
      await signOut();
      toast.success('账号已注销');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '注销账号失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">账号安全</h1>
        <p className="text-on-surface-variant mt-2 text-lg">保护你的登录信息和账户归属权</p>
      </header>

      <section className="bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-outline-variant/10">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-primary-fixed rounded-full flex items-center justify-center mr-4">
            <span className="material-symbols-outlined text-primary">verified_user</span>
          </div>
          <h2 className="font-headline text-xl font-bold text-on-surface">账号信息</h2>
        </div>

        <div className="space-y-6">
          <InfoRow
            label="登录邮箱"
            value={email || '暂无邮箱'}
            action={
              <button onClick={() => setEmailModalOpen(true)} className="text-primary font-semibold hover:bg-primary/5 px-4 py-2 rounded-xl transition-all">
                修改邮箱
              </button>
            }
          />
          <InfoRow
            label="登录密码"
            value="已设置"
            action={
              <button onClick={() => setPasswordModalOpen(true)} className="text-primary font-semibold hover:bg-primary/5 px-4 py-2 rounded-xl transition-all">
                修改密码
              </button>
            }
          />
          <InfoRow label="注册时间" value={joinedAtText} />
          <div className="pb-2">
            <p className="text-on-surface-variant text-sm font-medium mb-1">最近登录时间</p>
            <p className="text-base font-semibold text-on-surface">{lastSignInText}</p>
          </div>
        </div>
      </section>

      <section className="bg-error-container/20 rounded-xl p-8 border border-error/20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-headline text-xl font-bold text-error">危险操作</h2>
            <p className="text-sm text-on-error-container mt-2">
              注销账号后，个人资料、日志、复盘和社群数据都会被永久删除，无法恢复。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-error text-white font-bold hover:opacity-90 transition-all"
          >
            注销账号
          </button>
        </div>
      </section>

      <Modal open={passwordModalOpen} title="修改密码" onClose={() => setPasswordModalOpen(false)}>
        <div className="space-y-4">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
          <p className="text-xs leading-6 text-slate-400">密码至少 8 位，且必须包含字母和数字。</p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setPasswordModalOpen(false)} className="px-5 py-3 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition">
              取消
            </button>
            <button onClick={handleChangePassword} disabled={savingPassword} className="px-5 py-3 rounded-full bg-primary text-white font-bold hover:opacity-90 transition disabled:opacity-60">
              {savingPassword ? '提交中...' : '确认修改'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={emailModalOpen} title="修改邮箱" onClose={() => setEmailModalOpen(false)}>
        <div className="space-y-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="请输入新邮箱"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
          <p className="text-xs leading-6 text-slate-400">
            提交后，Supabase 会向新邮箱发送验证邮件。确认前，旧邮箱仍会继续生效。
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEmailModalOpen(false)} className="px-5 py-3 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition">
              取消
            </button>
            <button onClick={handleChangeEmail} disabled={savingEmail} className="px-5 py-3 rounded-full bg-primary text-white font-bold hover:opacity-90 transition disabled:opacity-60">
              {savingEmail ? '提交中...' : '发送验证邮件'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModalOpen} title="确认注销账号" onClose={() => setDeleteModalOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-600">
            确定要永久删除账号吗？此操作不可恢复。请输入“确认注销”四个字后才能继续。
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="请输入：确认注销"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeleteModalOpen(false)} className="px-5 py-3 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition">
              取消
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== '确认注销' || deleting}
              className="px-5 py-3 rounded-full bg-error text-white font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? '注销中...' : '永久删除账号'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

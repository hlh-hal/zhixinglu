import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { get, post, put } from '../../lib/apiClient';

type ProfileData = {
  nickname?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const data = await get<ProfileData>('/api/settings/profile');
        if (!active) return;
        setProfile(data);
        setNickname(data?.nickname || '');
        setBio(data?.bio || '');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载个人信息失败');
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const currentAvatar = avatarPreview || profile?.avatar_url || null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await put<ProfileData>('/api/settings/profile', {
        nickname,
        bio,
        avatar_url: profile?.avatar_url || null,
      });
      setProfile(updated);
      toast.success('个人信息已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片不能超过2MB');
      event.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const result = await post<{ avatar_url: string }>('/api/settings/avatar', formData);

      setProfile((prev) => ({
        ...(prev || {}),
        avatar_url: result.avatar_url,
      }));
      setAvatarPreview(null);
      toast.success('头像更新成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '头像上传失败');
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">个人信息</h1>
        <p className="text-on-surface-variant mt-2 text-lg">管理你的基础资料与展示形象</p>
      </header>

      <div className="bg-surface-container-lowest shadow-[0px_20px_40px_rgba(26,28,28,0.06)] rounded-xl p-8 border border-outline-variant/10 space-y-8">
        <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
          <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface shadow-xl transition-transform group-hover:scale-105 bg-slate-100">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary bg-primary/10">
                  {(nickname || user?.email || '知').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-primary/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
            </div>
            {uploadingAvatar ? (
              <div className="absolute inset-0 rounded-full bg-slate-950/35 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">用户昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-5 py-3 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 transition-all font-medium text-on-surface outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">注册邮箱</label>
                <div className="w-full px-5 py-3 rounded-xl bg-surface-container border-none text-slate-500 font-medium">
                  {user?.email || '未获取到邮箱'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">个人简介</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="分享一下你最近在坚持什么，或者你想成为怎样的人。"
                className="w-full px-5 py-3 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/30 transition-all font-medium text-on-surface outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-surface-container-low flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
}

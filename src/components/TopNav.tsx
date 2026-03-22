import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useMarkAllRead, useNotifications, useRespondFriendRequestFromNotification, useUnreadCount } from '../hooks/community/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { get, put } from '../lib/apiClient';

export default function TopNav({ path }: { path: string }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAllRead = useMarkAllRead();
  const respondFromNotification = useRespondFriendRequestFromNotification();
  const { data: profile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => get<{ role?: string }>('/api/settings/profile'),
    enabled: Boolean(user),
  });

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notifications],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReadAll = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success('已全部标记为已读');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleNotificationClick = async (notificationId: string, actionUrl?: string | null) => {
    try {
      await put(`/api/notifications/${notificationId}/read`);
    } catch {}

    if (actionUrl) {
      navigate(actionUrl);
      setIsNotificationsOpen(false);
    }
  };

  const handleFriendRequestAction = async (friendshipId: string, notificationId: string, action: 'accept' | 'reject') => {
    try {
      await respondFromNotification.mutateAsync({ friendshipId, notificationId, action });
      toast.success(action === 'accept' ? '已通过好友申请' : '已拒绝好友申请');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '处理好友申请失败');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-white border-b border-slate-100 h-16 flex items-center px-8 shadow-sm">
      <div className="flex items-center gap-16">
        <span className="text-2xl font-bold text-slate-900 font-headline">知行录</span>
        <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2 h-full">
          <NavItem to="/daily" current={path} label="每日日志" />
          <NavItem to="/monthly" current={path} label="月度复盘" />
          <NavItem to="/half-year" current={path} label="半年复盘" />
          <NavItem to="/dashboard" current={path} label="数据看板" />
          <NavItem to="/community/challenges" current={path} label="社群" />
          {profile?.role === 'admin' ? <NavItem to="/admin/challenges" current={path} label="管理后台" /> : null}
        </nav>
      </div>

      <div className="ml-auto flex items-center gap-6">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="relative cursor-pointer text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => setIsNotificationsOpen((value) => !value)}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-[10px] text-white flex items-center justify-center rounded-full font-bold">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <div className="absolute right-0 mt-4 w-[360px] bg-white rounded-2xl shadow-[0px_20px_40px_rgba(26,28,28,0.12)] border border-slate-100 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <span className="font-bold text-slate-800">通知中心</span>
                <div className="flex items-center gap-3">
                  <Link
                    to="/settings/notifications"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    设置
                  </Link>
                  <button type="button" onClick={handleReadAll} className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                    全部标为已读
                  </button>
                </div>
              </div>

              <div className="max-h-[460px] overflow-y-auto">
                {sortedNotifications.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {sortedNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 transition-colors ${notification.is_read ? 'bg-white' : 'bg-blue-50/50'}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(notification.id, notification.action_url)}
                          className="block w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={`text-sm font-bold ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                              {notification.title}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(notification.created_at))}
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed ${notification.is_read ? 'text-slate-500' : 'text-slate-700'}`}>
                            {notification.content}
                          </p>
                        </button>

                        {notification.type === 'friend_request' && notification.related_id ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleFriendRequestAction(notification.related_id!, notification.id, 'accept')}
                              className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                            >
                              接受
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFriendRequestAction(notification.related_id!, notification.id, 'reject')}
                              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                            >
                              拒绝
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                    <p className="text-sm">暂无新通知</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <Link to="/settings" className="text-slate-500 hover:text-slate-900 transition-colors" title="设置">
          <span className="material-symbols-outlined">settings</span>
        </Link>
        <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 transition-colors" title="登出">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}

function NavItem({ to, current, label }: { to: string; current: string; label: string }) {
  const isActive = current.startsWith(to);
  return (
    <Link
      to={to}
      className={`relative flex items-center h-full text-sm font-medium transition-colors ${
        isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
      }`}
    >
      {label}
      {isActive ? <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" /> : null}
    </Link>
  );
}

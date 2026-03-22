import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import { get } from '../../lib/apiClient';

function AdminNavItem({ to, label, icon, active }: { to: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
        active
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
        {icon}
      </span>
      <span className="font-semibold">{label}</span>
    </Link>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const { data, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => get<{ role?: string }>('/api/settings/profile'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav path={location.pathname} />
        <div className="flex h-screen items-center justify-center pt-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        </div>
      </div>
    );
  }

  if (data?.role !== 'admin') {
    return <Navigate to="/community/challenges" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav path={location.pathname} />
      <div className="flex h-screen overflow-hidden pt-16">
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-white px-6 py-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-500">Admin Console</p>
            <h1 className="mt-2 font-headline text-2xl font-black text-slate-900">社群管理后台</h1>
          </div>
          <nav className="space-y-2">
            <AdminNavItem to="/admin/challenges" label="挑战管理" icon="emoji_events" active={location.pathname.startsWith('/admin/challenges')} />
            <AdminNavItem to="/admin/badges" label="勋章管理" icon="workspace_premium" active={location.pathname.startsWith('/admin/badges')} />
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

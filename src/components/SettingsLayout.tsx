import { Outlet, useLocation, Link } from 'react-router-dom';
import TopNav from './TopNav';

export default function SettingsLayout() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      <TopNav path={path} />
      <div className="flex flex-1 pt-16 h-screen overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-full md:w-64 bg-surface-container-lowest md:bg-transparent border-b md:border-b-0 md:border-r border-outline-variant/20 p-6 md:py-8 md:px-6 shrink-0 z-40">
          <div className="mb-8 hidden md:block">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Settings Sanctuary</h2>
            <p className="text-xl font-bold text-primary font-headline">设置中心</p>
          </div>
          <nav className="flex md:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <SettingsNavItem icon="person" label="个人信息" to="/settings/profile" active={path === '/settings/profile'} />
            <SettingsNavItem icon="security" label="账号安全" to="/settings/security" active={path === '/settings/security'} />
            <SettingsNavItem icon="database" label="数据管理" to="/settings/data" active={path === '/settings/data'} />
            <SettingsNavItem icon="notifications" label="通知设置" to="/settings/notifications" active={path === '/settings/notifications'} />
            <SettingsNavItem icon="info" label="关于" to="/settings/about" active={path === '/settings/about'} />
          </nav>
        </aside>

        {/* Settings Content Area */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto no-scrollbar bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SettingsNavItem({ icon, label, to, active }: { icon: string, label: string, to: string, active?: boolean }) {
  return (
    <Link 
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
        active 
          ? 'bg-white shadow-sm text-primary font-bold border-l-4 border-primary' 
          : 'text-on-surface-variant hover:bg-surface-container-low font-medium border-l-4 border-transparent'
      }`}
    >
      <span className="material-symbols-outlined text-[20px]" style={active ? {fontVariationSettings: "'FILL' 1"} : {}}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

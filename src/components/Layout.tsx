import { Link, useLocation, Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import SideNav from './SideNav';

export default function Layout() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      <TopNav path={path} />
      <div className="flex flex-1 pt-16 h-screen overflow-hidden">
        <SideNav path={path} />
        <main className="flex-1 ml-64 overflow-y-auto no-scrollbar bg-surface p-8 md:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

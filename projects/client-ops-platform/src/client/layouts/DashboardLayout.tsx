import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import {
  LayoutDashboard,
  Palette,
  FileText,
  Server,
  Activity,
  LifeBuoy,
  Rocket,
  Plug,
  Archive,
  Shield,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/branding', label: 'Branding', icon: Palette },
  { to: '/content', label: 'Content Blocks', icon: FileText },
  { to: '/services', label: 'Services', icon: Server },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/deployments', label: 'Deployments', icon: Rocket },
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/backups', label: 'Backups', icon: Archive },
  { to: '/audit', label: 'Audit Log', icon: Shield },
];

export function DashboardLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-lg font-semibold tracking-tight">Oopuo</h1>
          <p className="text-xs text-gray-400 mt-1">Operations Platform</p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white border-r-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}

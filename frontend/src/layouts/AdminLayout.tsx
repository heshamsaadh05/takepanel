import { Outlet } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Users, Boxes, Database, Globe, Mail, HardDrive, ServerCog, Bell, Search, Settings } from 'lucide-react';
import { AppShell } from './AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';

const adminNav = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Accounts', href: '/admin/accounts', icon: Users },
  { label: 'Packages', href: '/admin/packages', icon: Boxes },
  { label: 'DNS', href: '/admin/dns', icon: Globe },
  { label: 'Email', href: '/admin/email', icon: Mail },
  { label: 'Databases', href: '/admin/databases', icon: Database },
  { label: 'Backups', href: '/admin/backups', icon: HardDrive },
  { label: 'Security', href: '/admin/security', icon: ShieldCheck },
  { label: 'Server', href: '/admin/server/status', icon: ServerCog },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Settings', href: '/admin/settings', icon: Settings }
];

export function AdminLayout() {
  const { user, logout, setLocale, setTheme } = useAuth();

  return (
    <AppShell>
      <div className="grid min-h-screen grid-cols-[280px_1fr] bg-slate-100 dark:bg-slate-950">
        <Sidebar brand="HostMaster" subtitle="Admin / Server Panel" nav={adminNav} accent="panel" />
        <div className="flex min-h-screen flex-col">
          <Topbar
            user={user}
            onLogout={logout}
            onLocaleChange={setLocale}
            onThemeToggle={setTheme}
            searchPlaceholder="Search tools, accounts, domains..."
            searchIcon={Search}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AppShell>
  );
}

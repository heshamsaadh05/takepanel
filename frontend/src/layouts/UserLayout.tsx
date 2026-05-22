import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Files, Globe, Mail, Database, HardDrive, Shield, Code2, Settings } from 'lucide-react';
import { AppShell } from './AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { useAuth } from '../context/AuthContext';

const userNav = [
  { label: 'Dashboard', href: '/panel/dashboard', icon: LayoutDashboard },
  { label: 'Files', href: '/panel/files', icon: Files },
  { label: 'Domains', href: '/panel/domains', icon: Globe },
  { label: 'Email', href: '/panel/email', icon: Mail },
  { label: 'Databases', href: '/panel/databases', icon: Database },
  { label: 'Backups', href: '/panel/backups', icon: HardDrive },
  { label: 'SSL', href: '/panel/ssl', icon: Shield },
  { label: 'Software', href: '/panel/software', icon: Code2 },
  { label: 'Preferences', href: '/panel/preferences', icon: Settings }
];

export function UserLayout() {
  const { user, logout, setLocale, setTheme } = useAuth();

  return (
    <AppShell>
      <div className="grid min-h-screen grid-cols-[280px_1fr] bg-slate-100 dark:bg-slate-950">
        <Sidebar brand="HostMaster" subtitle="User Hosting Panel" nav={userNav} accent="emerald" />
        <div className="flex min-h-screen flex-col">
          <Topbar
            user={user}
            onLogout={logout}
            onLocaleChange={setLocale}
            onThemeToggle={setTheme}
            searchPlaceholder="Search files, domains, emails..."
            searchIcon={Code2}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AppShell>
  );
}

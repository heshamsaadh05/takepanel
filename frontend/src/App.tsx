import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { AdminAccountsPage } from './pages/admin/AccountsPage';
import { AdminPackagesPage } from './pages/admin/PackagesPage';
import { AdminDnsPage } from './pages/admin/DnsPage';
import { UserDashboardPage } from './pages/panel/DashboardPage';
import { UserFilesPage } from './pages/panel/FilesPage';
import { UserDomainsPage } from './pages/panel/DomainsPage';
import { UserEmailPage } from './pages/panel/EmailPage';
import { UserDatabasesPage } from './pages/panel/DatabasesPage';
import { UserBackupsPage } from './pages/panel/BackupsPage';
import { UserSslPage } from './pages/panel/SslPage';
import { UserSoftwarePage } from './pages/panel/SoftwarePage';
import { AppShell } from './layouts/AppLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { UserLayout } from './layouts/UserLayout';
import { FeaturePage } from './pages/common/FeaturePage';
import { HardDrive, Bell, ServerCog, ShieldCheck, Mail, Database, Settings, Server } from 'lucide-react';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/admin" element={<ProtectedRoute roles={['super_admin', 'server_admin', 'reseller']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="accounts/new" element={<AdminAccountsPage mode="create" />} />
        <Route path="packages" element={<AdminPackagesPage />} />
        <Route path="dns" element={<AdminDnsPage />} />
        <Route path="email" element={<FeaturePage title="Email Administration" description="Mail queue, delivery reports, routing, deliverability, and domain policy settings." breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Email' }]} icon={<Mail className="h-5 w-5" />} />} />
        <Route path="databases" element={<FeaturePage title="Database Administration" description="Manage MariaDB/MySQL and PostgreSQL databases, users, privileges, and backups." breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Databases' }]} icon={<Database className="h-5 w-5" />} />} />
        <Route path="backups" element={<FeaturePage title="Backup Center" description="Account backups, schedules, retention, destinations, and restore workflows." breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Backups' }]} icon={<HardDrive className="h-5 w-5" />} />} />
        <Route path="security" element={<FeaturePage title="Security Center" description="2FA enforcement, firewall policy, brute-force protection, audit trails, and advisories." breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Security' }]} icon={<ShieldCheck className="h-5 w-5" />} />} />
        <Route path="server/status" element={<FeaturePage title="Server Status" description="Service state, processes, queue jobs, and real-time resource tracking." breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Server Status' }]} icon={<Server className="h-5 w-5" />} />} />
        <Route path="notifications" element={<FeaturePage title="Notifications" description="System alerts, user alerts, backup failures, SSL expiry reminders, and service warnings." breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Notifications' }]} icon={<Bell className="h-5 w-5" />} />} />
        <Route path="settings" element={<FeaturePage title="Settings" description="Branding, default locale/theme, and global platform behavior." breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Settings' }]} icon={<Settings className="h-5 w-5" />} />} />
      </Route>

      <Route path="/panel" element={<ProtectedRoute roles={['account_owner', 'team_member', 'read_only']}><UserLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/panel/dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboardPage />} />
        <Route path="files" element={<UserFilesPage />} />
        <Route path="domains" element={<UserDomainsPage />} />
        <Route path="email" element={<UserEmailPage />} />
        <Route path="databases" element={<UserDatabasesPage />} />
        <Route path="backups" element={<UserBackupsPage />} />
        <Route path="ssl" element={<UserSslPage />} />
        <Route path="software" element={<UserSoftwarePage />} />
        <Route path="preferences" element={<FeaturePage title="Preferences" description="Account contact details, language, theme, teams, and notification preferences." breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'Preferences' }]} icon={<Settings className="h-5 w-5" />} />} />
      </Route>

      <Route path="*" element={<AppShell><Navigate to="/login" replace /></AppShell>} />
    </Routes>
  );
}

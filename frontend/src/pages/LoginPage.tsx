import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Server, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('admin@hostmaster.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'account_owner' || user.role === 'team_member' || user.role === 'read_only' ? '/panel/dashboard' : '/admin/dashboard'} replace />;
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(identifier, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      toast.success('Welcome back to HostMaster');
      navigate(from ?? '/admin/dashboard', { replace: true });
    } catch (error) {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-panel-950 to-panel-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-slate-400">
            <Server className="h-4 w-4" /> HostMaster Panel
          </div>
          <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight">
            A modern hosting control center built for real server operators.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Manage accounts, websites, DNS, email, databases, backups, security, and resources from a single modern interface.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            ['Accounts', 'Lifecycle management'],
            ['Security', 'RBAC + audit logs'],
            ['Automation', 'Jobs + queue + agent']
          ].map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="text-sm font-medium text-slate-100">{title}</div>
              <div className="mt-2 text-sm text-slate-300">{text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-100 px-6 py-10 dark:bg-slate-950">
        <Card className="w-full max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-panel-500 to-cyan-500 text-white shadow-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{t('login')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Use your HostMaster admin or user credentials.</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{t('email')} or {t('username')}</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-panel-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  placeholder="admin@hostmaster.local"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{t('password')}</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm outline-none focus:border-panel-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow((current) => !current)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              The first boot account is seeded automatically. Default demo credentials are updated by the installer and can be changed from the admin console later.
            </div>

            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? 'Signing in…' : t('login')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, ExternalLink, Loader2, Rocket, Server, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { ServiceStatusBadge } from '../components/ui/ServiceStatusBadge';

type BootstrapService = {
  key: string;
  name: string;
  status: string;
  description: string;
  version?: string | null;
  port?: number | null;
};

type BootstrapSummary = {
  generatedAt: string;
  panelUrl: string;
  loginUrl: string;
  login: {
    username: string;
    email: string;
    password: string;
  };
  counts: {
    users: number;
    roles: number;
    services: number;
  };
  services: BootstrapService[];
  nextSteps: string[];
};

export function SetupCompletePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [summary, setSummary] = useState<BootstrapSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      if (!token) {
        setError('The installation summary token is missing. Use the exact URL printed by the installer.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/bootstrap/summary', { params: { token } });
        if (isMounted) {
          setSummary(response.data.data);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError('The installation summary could not be loaded. Please run the one-command installer again and use the printed setup link.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const runningServices = useMemo(() => summary?.services.filter((service) => service.status === 'running').length ?? 0, [summary]);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 dark:bg-slate-950">
        <Card className="flex w-full max-w-lg flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-panel-500" />
          <div>
            <h1 className="text-2xl font-semibold">Loading installation summary</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Checking the bootstrap token and loading the freshly installed services.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-panel-950 to-panel-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.14),transparent_30%)]" />
          <div className="relative">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-slate-400">
              <Sparkles className="h-4 w-4" />
              HostMaster Panel
            </div>
            <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight">
              Installation summary unavailable.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              The installer normally prints a one-time summary link after provisioning. Use that exact link to view credentials and system status.
            </p>
          </div>

          <div className="relative grid grid-cols-2 gap-4">
            {[
              ['1', 'Run the one-command installer'],
              ['2', 'Open the printed setup URL'],
              ['3', 'Sign in and change the password'],
              ['4', 'Review services and modules']
            ].map(([step, text]) => (
              <div key={step} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-sm font-medium text-slate-100">Step {step}</div>
                <div className="mt-2 text-sm text-slate-300">{text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-100 px-6 py-10 dark:bg-slate-950">
          <Card className="w-full max-w-xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">Bootstrap token missing or invalid</span>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => (window.location.href = '/login')}>Open login</Button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Continue to login
              </Link>
            </div>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-panel-950 to-panel-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.14),transparent_30%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-slate-400">
            <Sparkles className="h-4 w-4" />
            HostMaster Panel
          </div>
          <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight">
            Installation completed successfully.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            The server is ready. Use the credentials below to open the dashboard, then change the administrator password immediately.
          </p>
        </div>

        <div className="relative grid grid-cols-2 gap-4">
          {[
            ['Ready', 'Backend, worker, and agent are running'],
            ['Secure', 'Bootstrap access is token-based'],
            ['Login', 'Open the panel and sign in'],
            ['Next', 'Review services and create accounts']
          ].map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="text-sm font-medium text-slate-100">{title}</div>
              <div className="mt-2 text-sm text-slate-300">{text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-start justify-center bg-slate-100 px-6 py-10 dark:bg-slate-950">
        <div className="w-full max-w-4xl space-y-6">
          <Card className="border-0 bg-white/90 shadow-xl dark:bg-slate-900/95">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Installation summary</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">HostMaster is ready</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              These credentials were created by the unattended installer. Keep the setup URL private until you sign in and update the administrator password.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Users" value={summary.counts.users} tone="blue" />
              <StatCard label="Roles" value={summary.counts.roles} tone="emerald" />
              <StatCard label="Services" value={summary.counts.services} tone="amber" />
              <StatCard label="Running services" value={runningServices} tone="rose" />
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="space-y-5">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-panel-500" />
                <h3 className="text-lg font-semibold">Login details</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Panel URL</div>
                  <div className="mt-2 break-all font-mono text-sm text-slate-900 dark:text-slate-100">{summary.loginUrl}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Generated at</div>
                  <div className="mt-2 font-mono text-sm text-slate-900 dark:text-slate-100">{new Date(summary.generatedAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Username</div>
                  <div className="mt-2 font-mono text-sm">{summary.login.username}</div>
                  <Button className="mt-4 w-full" variant="secondary" onClick={() => void copyToClipboard(summary.login.username, 'Username')}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy username
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</div>
                  <div className="mt-2 font-mono text-sm">{summary.login.email}</div>
                  <Button className="mt-4 w-full" variant="secondary" onClick={() => void copyToClipboard(summary.login.email, 'Email')}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy email
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Password</div>
                      <div className="mt-2 font-mono text-sm">{summary.login.password}</div>
                    </div>
                    <Button variant="secondary" onClick={() => void copyToClipboard(summary.login.password, 'Password')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy password
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl bg-panel-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-panel-500"
                >
                  Open login
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
                <Button variant="secondary" onClick={() => void copyToClipboard(summary.loginUrl, 'Login URL')}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy login URL
                </Button>
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-panel-500" />
                <h3 className="text-lg font-semibold">Services status</h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {summary.services.map((service) => (
                  <div key={service.key} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{service.description}</div>
                      </div>
                      <ServiceStatusBadge status={service.status} />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{service.version ?? 'n/a'}</span>
                      <span>{service.port ? `Port ${service.port}` : 'Managed'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-panel-500" />
              <h3 className="text-lg font-semibold">Recommended next steps</h3>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {summary.nextSteps.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-panel-500/10 text-xs font-semibold text-panel-600 dark:text-panel-300">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>
    </div>
  );
}

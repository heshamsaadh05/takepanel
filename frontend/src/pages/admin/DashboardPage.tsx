import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { UsageMeter } from '../../components/ui/UsageMeter';
import { ServiceStatusBadge } from '../../components/ui/ServiceStatusBadge';
import { ResourceChart } from '../../components/ui/ResourceChart';
import { DataTable } from '../../components/ui/DataTable';
import { Card } from '../../components/ui/Card';
import { SectionPage } from '../common/SectionPage';

type Overview = {
  counters: { activeAccounts: number; suspendedAccounts: number };
  services: Array<{ name: string; status: string; version?: string | null }>;
  alerts: Array<{ id: string; title: string; message: string }>;
  tasks: Array<{ id: string; type: string; status: string; progress: number }>;
  topAccounts: Array<{ id: string; username: string; primaryDomain: string; diskUsed: number; package?: { name: string } | null }>;
  charts: { bandwidth: number[]; disk: number[] };
};

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    void api.get('/dashboard/overview').then((response) => setOverview(response.data.data));
  }, []);

  const bandwidth = overview?.charts.bandwidth ?? [10, 24, 18, 33, 25, 42, 31];
  const disk = overview?.charts.disk ?? [22, 30, 28, 35, 40, 45, 48];

  return (
    <SectionPage
      title="Dashboard"
      description="Server overview, service state, alerts, and the most active accounts at a glance."
      breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Dashboard' }]}
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Active Accounts" value={overview?.counters.activeAccounts ?? 0} change="+12% this month" tone="emerald" />
        <StatCard label="Suspended Accounts" value={overview?.counters.suspendedAccounts ?? 0} tone="amber" />
        <StatCard label="Services Online" value={overview?.services.filter((service) => service.status === 'running').length ?? 0} tone="blue" />
        <StatCard label="Open Alerts" value={overview?.alerts.length ?? 0} tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-5 text-lg font-semibold">Server health</div>
          <div className="space-y-4">
            <UsageMeter label="CPU usage" value={42} max={100} tone="blue" />
            <UsageMeter label="Memory usage" value={61} max={100} tone="emerald" />
            <UsageMeter label="Disk usage" value={67} max={100} tone="amber" />
            <UsageMeter label="Load average" value={21} max={100} tone="rose" />
          </div>
        </Card>

        <Card>
          <div className="mb-5 text-lg font-semibold">Services</div>
          <div className="space-y-3">
            {(overview?.services ?? []).map((service) => (
              <div key={service.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                <div>
                  <div className="font-medium">{service.name}</div>
                  <div className="text-xs text-slate-500">{service.version ?? 'n/a'}</div>
                </div>
                <ServiceStatusBadge status={service.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ResourceChart title="Bandwidth usage" points={bandwidth} />
        <ResourceChart title="Disk usage" points={disk} />
      </div>

      <DataTable
        title="Top Accounts"
        subtitle="Accounts consuming the most disk space right now."
        headers={['Account', 'Domain', 'Package', 'Disk Used']}
      >
        {(overview?.topAccounts ?? []).map((account) => (
          <tr key={account.id} className="text-slate-700 dark:text-slate-200">
            <td className="px-3 py-3 font-medium">{account.username}</td>
            <td className="px-3 py-3">{account.primaryDomain}</td>
            <td className="px-3 py-3">{account.package?.name ?? '-'}</td>
            <td className="px-3 py-3">{account.diskUsed} MB</td>
          </tr>
        ))}
      </DataTable>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-5 text-lg font-semibold">Latest alerts</div>
          <div className="space-y-3">
            {(overview?.alerts ?? []).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="font-medium">{alert.title}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{alert.message}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-5 text-lg font-semibold">Recent tasks</div>
          <div className="space-y-3">
            {(overview?.tasks ?? []).map((task) => (
              <div key={task.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{task.type}</div>
                  <ServiceStatusBadge status={task.status} />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-panel-500" style={{ width: `${task.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SectionPage>
  );
}

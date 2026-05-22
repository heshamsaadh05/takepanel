import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { UsageMeter } from '../../components/ui/UsageMeter';
import { ResourceChart } from '../../components/ui/ResourceChart';
import { SectionPage } from '../common/SectionPage';

export function UserDashboardPage() {
  return (
    <SectionPage
      title="Dashboard"
      description="Your hosting summary, resource usage, and quick actions."
      breadcrumbs={[{ label: 'Home', href: '/panel/dashboard' }, { label: 'Dashboard' }]}
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Disk Usage" value="6.8 GB" change="of 10 GB" tone="blue" />
        <StatCard label="Bandwidth" value="28 GB" change="of 100 GB" tone="emerald" />
        <StatCard label="Emails" value="4 / 20" tone="amber" />
        <StatCard label="Databases" value="2 / 10" tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-5 text-lg font-semibold">Account summary</div>
          <div className="space-y-4">
            <UsageMeter label="Disk usage" value={68} max={100} tone="blue" />
            <UsageMeter label="Bandwidth usage" value={28} max={100} tone="emerald" />
            <UsageMeter label="Email usage" value={20} max={100} tone="amber" />
            <UsageMeter label="Database usage" value={22} max={100} tone="rose" />
          </div>
        </Card>
        <ResourceChart title="Resource trend" points={[20, 25, 18, 30, 27, 40, 35]} />
      </div>

      <Card>
        <div className="mb-5 text-lg font-semibold">Quick actions</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            'File Manager',
            'Email Accounts',
            'Domains',
            'Databases',
            'Backups',
            'SSL',
            'PHP Settings',
            'Preferences'
          ].map((action) => (
            <div key={action} className="rounded-2xl border border-slate-200 p-4 text-sm font-medium dark:border-white/10">{action}</div>
          ))}
        </div>
      </Card>
    </SectionPage>
  );
}

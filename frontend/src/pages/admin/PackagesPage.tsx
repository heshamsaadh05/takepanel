import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/ui/DataTable';

export function AdminPackagesPage() {
  return (
    <SectionPage
      title="Packages"
      description="Define resource tiers, feature flags, and limits for hosting plans."
      breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Packages' }]}
      hero={
        <Card>
          <div className="grid gap-4 md:grid-cols-3">
            {['Disk limit', 'Bandwidth limit', 'Inodes'].map((field) => (
              <div key={field}>
                <div className="text-sm font-medium">{field}</div>
                <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900" />
              </div>
            ))}
          </div>
        </Card>
      }
    >
      <DataTable title="Package catalog" headers={['Name', 'Disk', 'Bandwidth', 'Domains']}>
        <tr>
          <td className="px-3 py-3">starter</td>
          <td className="px-3 py-3">10 GB</td>
          <td className="px-3 py-3">100 GB</td>
          <td className="px-3 py-3">3</td>
        </tr>
      </DataTable>
    </SectionPage>
  );
}

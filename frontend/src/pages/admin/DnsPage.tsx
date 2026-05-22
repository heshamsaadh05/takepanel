import { SectionPage } from '../common/SectionPage';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/ui/DataTable';

export function AdminDnsPage() {
  return (
    <SectionPage
      title="DNS Functions"
      description="Manage zones, records, templates, and validation before changes are applied."
      breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'DNS' }]}
      hero={
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium">Zone name</div>
              <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900" placeholder="example.com" />
            </div>
            <div>
              <div className="text-sm font-medium">Record type</div>
              <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900">
                <option>A</option>
                <option>AAAA</option>
                <option>CNAME</option>
                <option>MX</option>
                <option>TXT</option>
              </select>
            </div>
          </div>
        </Card>
      }
    >
      <DataTable title="Zone records" headers={['Type', 'Name', 'Value', 'TTL']}>
        <tr>
          <td className="px-3 py-3">A</td>
          <td className="px-3 py-3">@</td>
          <td className="px-3 py-3">127.0.0.1</td>
          <td className="px-3 py-3">3600</td>
        </tr>
      </DataTable>
    </SectionPage>
  );
}

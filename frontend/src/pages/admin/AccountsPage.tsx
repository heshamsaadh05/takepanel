import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PasswordGenerator } from '../../components/ui/PasswordGenerator';
import { DataTable } from '../../components/ui/DataTable';
import { SectionPage } from '../common/SectionPage';

export function AdminAccountsPage({ mode = 'list' }: { mode?: 'list' | 'create' }) {
  const [generatedPassword, setGeneratedPassword] = useState('ChangeMe123!');

  return (
    <SectionPage
      title="Account Functions"
      description="Create, modify, suspend, and terminate hosting accounts from one workspace."
      breadcrumbs={[{ label: 'Home', href: '/admin/dashboard' }, { label: 'Account Functions' }]}
      hero={
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <div className="mb-5 text-lg font-semibold">{mode === 'create' ? 'Create a New Account' : 'Quick Actions'}</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="text-sm font-medium">Domain</div>
                <input className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900" placeholder="example.com" />
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="text-sm font-medium">Username</div>
                <input className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900" placeholder="auto-generated" />
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 md:col-span-2">
                <div className="text-sm font-medium">Password Generator</div>
                <div className="mt-3">
                  <PasswordGenerator onGenerate={setGeneratedPassword} />
                </div>
                <div className="mt-3 text-xs text-slate-500">Current generated password: {generatedPassword}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="text-sm font-medium">Package</div>
                <select className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900">
                  <option>starter</option>
                  <option>business</option>
                  <option>pro</option>
                </select>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="text-sm font-medium">Contact Email</div>
                <input className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900" placeholder="owner@example.com" />
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 md:col-span-2">
                <div className="grid gap-3 md:grid-cols-3">
                  {['Create system user', 'Create home directory', 'Attempt SSL'].map((item) => (
                    <label key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button>Create</Button>
              <Button variant="secondary">Reset</Button>
            </div>
          </Card>
          <Card>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow</div>
            <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Domain & username',
                'Package & limits',
                'Owner / reseller',
                'DNS & IP settings',
                'Mail / SSL options',
                'Review & create'
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-panel-600 text-xs font-semibold text-white">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      }
    >
      <DataTable
        title="Managed Hosting Accounts"
        subtitle="Accounts created through HostMaster will appear here for review and lifecycle actions."
        headers={['Username', 'Domain', 'Package', 'Status']}
      >
        <tr>
          <td className="px-3 py-3">demo</td>
          <td className="px-3 py-3">demo.hostmaster.local</td>
          <td className="px-3 py-3">starter</td>
          <td className="px-3 py-3">active</td>
        </tr>
      </DataTable>
    </SectionPage>
  );
}

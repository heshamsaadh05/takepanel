import { ReactNode } from 'react';
import { Card } from '../../components/ui/Card';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

export function FeaturePage({
  title,
  description,
  breadcrumbs,
  icon
}: {
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      <Card>
        <div className="flex items-start gap-4">
          {icon ? <div className="rounded-2xl bg-panel-500/10 p-3 text-panel-600">{icon}</div> : null}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          This section is scaffolded and intentionally shared across multiple modules until the full service integration lands.
        </div>
      </Card>
    </div>
  );
}

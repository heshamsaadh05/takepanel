import type { ReactNode } from 'react';
import { Card } from '../../components/ui/Card';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

export function SectionPage({
  title,
  description,
  breadcrumbs,
  children,
  hero
}: {
  title: string;
  description?: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  children?: ReactNode;
  hero?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {hero ? <div>{hero}</div> : null}
      {children}
      {!children ? (
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">This section is scaffolded and ready for feature-by-feature expansion.</div>
        </Card>
      ) : null}
    </div>
  );
}

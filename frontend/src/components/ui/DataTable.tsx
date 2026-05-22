import type { ReactNode } from 'react';
import { Card } from './Card';

export function DataTable({
  title,
  subtitle,
  headers,
  children,
  actions
}: {
  title: string;
  subtitle?: string;
  headers: string[];
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-white/10">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="overflow-x-auto">
        <table className="mt-4 min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400">
              {headers.map((header) => (
                <th key={header} className="px-3 py-3 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {children}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

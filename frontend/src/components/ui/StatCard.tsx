import { ArrowUpRight } from 'lucide-react';
import { Card } from './Card';

export function StatCard({
  label,
  value,
  change,
  tone = 'blue'
}: {
  label: string;
  value: string | number;
  change?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    blue: 'from-panel-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500'
  } as const;

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tones[tone]}`} />
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {change ? (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight className="h-3.5 w-3.5" />
          {change}
        </div>
      ) : null}
    </Card>
  );
}

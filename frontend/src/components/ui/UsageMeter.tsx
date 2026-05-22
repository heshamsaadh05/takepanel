export function UsageMeter({ label, value, max, tone = 'blue' }: { label: string; value: number; max: number; tone?: 'blue' | 'emerald' | 'amber' | 'rose' }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const classes = {
    blue: 'bg-panel-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500'
  } as const;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">{Math.round(percent)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div className={`${classes[tone]} h-full rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

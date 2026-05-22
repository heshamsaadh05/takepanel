export function ServiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    stopped: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    degraded: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    unknown: 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? map.unknown}`}>
      {status}
    </span>
  );
}

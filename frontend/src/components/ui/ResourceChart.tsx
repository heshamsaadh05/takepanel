export function ResourceChart({
  title,
  points
}: {
  title: string;
  points: number[];
}) {
  const max = Math.max(1, ...points);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900">
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <div className="flex h-32 items-end gap-2">
        {points.map((point, index) => (
          <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-panel-600 to-cyan-400" style={{ height: `${Math.max(8, (point / max) * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}

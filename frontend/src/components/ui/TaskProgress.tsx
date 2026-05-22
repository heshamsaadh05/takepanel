export function TaskProgress({ label, progress }: { label: string; progress: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
        <div className="h-2 rounded-full bg-panel-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    </div>
  );
}

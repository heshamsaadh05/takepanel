export function ConfirmDialog({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm">{description}</div>
    </div>
  );
}

import { Link } from 'react-router-dom';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {children}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft dark:border-white/10 dark:bg-slate-900">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      <Link to="/" className="mt-6 inline-flex rounded-2xl bg-panel-600 px-4 py-2 text-sm font-medium text-white">
        Go home
      </Link>
    </div>
  );
}

import { Bell } from 'lucide-react';

export function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
      <Bell className="h-4 w-4" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}

import { Bell, LogOut, MoonStar, Search, SunMedium } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { AuthUser } from '../../context/AuthContext';

export function Topbar({
  user,
  onLogout,
  onLocaleChange,
  onThemeToggle,
  searchPlaceholder,
  searchIcon: SearchIcon = Search
}: {
  user: AuthUser | null;
  onLogout: () => Promise<void>;
  onLocaleChange: (locale: string) => void;
  onThemeToggle: (theme: 'dark' | 'light') => void;
  searchPlaceholder: string;
  searchIcon?: typeof Search;
}) {
  const { i18n } = useTranslation();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/90 sm:px-6 xl:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{user?.email ?? 'guest@hostmaster.local'}</div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">({user?.role ?? 'guest'})</div>
        </div>

        <div className="flex flex-1 items-center gap-3 xl:justify-end">
          <div className="relative w-full max-w-2xl">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-panel-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              placeholder={searchPlaceholder}
            />
          </div>

          <Button variant="ghost" onClick={() => onThemeToggle(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')}>
            {document.documentElement.dataset.theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" onClick={() => onLocaleChange(i18n.language === 'ar' ? 'en' : 'ar')}>
            {i18n.language === 'ar' ? 'EN' : 'AR'}
          </Button>

          <Button variant="ghost" title="Notifications">
            <Bell className="h-4 w-4" />
          </Button>

          <Button onClick={() => void onLogout()} className={cn('gap-2')}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

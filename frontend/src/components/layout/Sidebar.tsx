import { Link, NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Sidebar({
  brand,
  subtitle,
  nav,
  accent
}: {
  brand: string;
  subtitle: string;
  nav: Array<{ label: string; href: string; icon: LucideIcon }>;
  accent: 'panel' | 'emerald';
}) {
  return (
    <aside className={cn('hidden min-h-screen border-r border-white/10 bg-slate-950 text-slate-100 shadow-2xl lg:flex lg:flex-col', accent === 'emerald' && 'bg-slate-950')}>
      <div className="border-b border-white/10 px-6 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-lg', accent === 'emerald' ? 'from-emerald-500 to-cyan-600' : 'from-panel-500 to-panel-800')}>
            HM
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">{brand}</div>
            <div className="text-xs text-slate-400">{subtitle}</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                  isActive ? 'bg-white/10 text-white shadow-soft' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

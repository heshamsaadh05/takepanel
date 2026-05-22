import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const variants = {
    primary: 'bg-panel-600 text-white hover:bg-panel-500',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
  } as const;

  return (
    <button
      type={props.type ?? 'button'}
      {...props}
      className={cn('inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition', variants[variant], className)}
    />
  );
}

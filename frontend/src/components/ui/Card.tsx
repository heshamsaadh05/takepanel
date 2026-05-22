import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-slate-900', className)} />;
}

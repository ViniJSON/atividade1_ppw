import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'destructive' | 'warning';

const dot: Record<Tone, string> = {
  default: 'bg-[var(--ink-soft)]',
  success: 'bg-[var(--forest)]',
  destructive: 'bg-[var(--oxblood)]',
  warning: 'bg-[var(--amber)]',
};

const text: Record<Tone, string> = {
  default: 'text-[var(--ink-soft)]',
  success: 'text-[var(--forest)]',
  destructive: 'text-[var(--oxblood)]',
  warning: 'text-[var(--amber)]',
};

export function Badge({
  className,
  tone = 'default',
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', text[tone], className)}
      {...props}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot[tone])} />
      {children}
    </span>
  );
}

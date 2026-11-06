import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Alert({
  tone = 'error',
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { tone?: 'error' | 'success' }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'border-l-2 pl-3 text-sm',
        tone === 'error'
          ? 'border-[var(--oxblood)] text-[var(--oxblood)]'
          : 'border-[var(--forest)] text-[var(--ink)]',
        className,
      )}
      {...props}
    />
  );
}

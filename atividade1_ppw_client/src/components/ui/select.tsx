import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus-visible:outline-2',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';

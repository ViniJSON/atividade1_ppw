import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'outline' | 'destructive' | 'ghost';
type Size = 'default' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  default:
    'bg-[var(--oxblood)] text-[var(--card)] border border-[var(--oxblood)] hover:bg-[#5a2129]',
  outline:
    'bg-transparent text-[var(--ink)] border border-[var(--line)] hover:border-[var(--ink)]',
  destructive:
    'bg-transparent text-[var(--oxblood)] border border-[var(--oxblood)] hover:bg-[var(--oxblood)] hover:text-[var(--card)]',
  ghost: 'bg-transparent text-[var(--ink-soft)] border border-transparent hover:text-[var(--ink)]',
};

const sizes: Record<Size, string> = {
  default: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
};

export function buttonClasses(variant: Variant = 'default', size: Size = 'default', className?: string) {
  return cn(
    'inline-flex items-center justify-center font-medium tracking-tight transition-colors disabled:opacity-40 disabled:pointer-events-none',
    sizes[size],
    variants[variant],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button ref={ref} className={buttonClasses(variant, size, className)} {...props} />
  ),
);
Button.displayName = 'Button';

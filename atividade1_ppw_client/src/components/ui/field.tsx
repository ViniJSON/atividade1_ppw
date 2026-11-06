import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[var(--ink-soft)]">{hint}</p>}
    </div>
  );
}

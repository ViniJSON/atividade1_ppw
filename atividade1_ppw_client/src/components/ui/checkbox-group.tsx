import { cn } from '@/lib/utils';

export interface CheckboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  hint?: string;
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  emptyText = 'Nenhuma opção disponível.',
}: {
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  emptyText?: string;
}) {
  if (options.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">{emptyText}</p>;
  }

  function alternar(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            'flex items-start gap-2 border border-[var(--line)] px-3 py-2 text-sm has-[:checked]:border-[var(--oxblood)]',
            o.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 accent-[var(--oxblood)]"
            checked={value.includes(o.value)}
            disabled={o.disabled}
            onChange={() => alternar(o.value)}
          />
          <span>
            {o.label}
            {o.hint && <span className="block text-xs text-[var(--ink-soft)]">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

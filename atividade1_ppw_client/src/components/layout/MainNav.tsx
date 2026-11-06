'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const itens = [
  { href: '/solicitacoes', rotulo: 'Solicitações' },
  { href: '/alunos', rotulo: 'Alunos' },
  { href: '/disciplinas', rotulo: 'Disciplinas' },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className="mt-8 flex gap-6 border-b border-[var(--line)]">
      {itens.map((item) => {
        const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
              ativo
                ? 'border-[var(--oxblood)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]',
            )}
          >
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

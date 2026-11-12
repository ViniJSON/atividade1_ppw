import type { Metadata } from 'next';
import './globals.css';
import { MainNav } from '@/components/layout/MainNav';
import { PerfilProvider } from '@/components/layout/PerfilProvider';

export const metadata: Metadata = {
  title: 'Matrícula / Trancamento de Disciplinas',
  description: 'Pedido do aluno, checagem de pré-requisitos, validação da coordenação e efetivação da vaga.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Work+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="mx-auto max-w-3xl px-6 py-14">
          <PerfilProvider>
          <header>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Secretaria acadêmica
            </p>
            <h1 className="font-display mt-2 text-3xl font-medium text-[var(--ink)]">
              Matrícula e trancamento de disciplinas
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ink-soft)]">
              Pedido do aluno, análise e aprovação da coordenação, efetivação pela secretaria —
              cada mudança de estado passa por uma máquina de estados e fica registrada na trilha de auditoria.
            </p>
            <MainNav />
          </header>
          <main className="mt-8">{children}</main>
          </PerfilProvider>
        </div>
      </body>
    </html>
  );
}

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export function ListaCard({
  titulo,
  acao,
  carregando,
  erro,
  vazio,
  textoVazio,
  avisos,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  carregando: boolean;
  erro: string | null;
  vazio: boolean;
  textoVazio: string;
  avisos?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-4">
        <CardTitle>{titulo}</CardTitle>
        {acao}
      </CardHeader>
      <CardContent className="p-0">
        {avisos && <div className="space-y-2 border-b border-[var(--line)] px-5 py-3">{avisos}</div>}
        {carregando && <p className="px-5 py-6 text-sm text-[var(--ink-soft)]">Carregando…</p>}
        {!carregando && erro && <Alert className="m-5">{erro}</Alert>}
        {!carregando && !erro && vazio && (
          <p className="px-5 py-6 text-sm text-[var(--ink-soft)]">{textoVazio}</p>
        )}
        {!carregando && !erro && !vazio && children}
      </CardContent>
    </Card>
  );
}

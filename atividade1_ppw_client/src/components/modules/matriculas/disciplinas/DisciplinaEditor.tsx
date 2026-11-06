'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { DisciplinaForm } from '@/components/modules/matriculas/disciplinas/DisciplinaForm';

export function DisciplinaEditor({ id }: { id: string }) {
  const carregar = useCallback(
    () => Promise.all([api.disciplinas.buscar(id), api.disciplinas.listar()]),
    [id],
  );
  const { data, erro, carregando } = useLoad(carregar);

  if (carregando) return <p className="text-sm text-[var(--ink-soft)]">Carregando…</p>;
  if (erro || !data) {
    return (
      <div className="space-y-4">
        <Alert>{erro ?? 'Disciplina não encontrada'}</Alert>
        <Link href="/disciplinas" className={buttonClasses('outline')}>
          Voltar para disciplinas
        </Link>
      </div>
    );
  }
  return <DisciplinaForm disciplina={data[0]} disciplinas={data[1]} />;
}

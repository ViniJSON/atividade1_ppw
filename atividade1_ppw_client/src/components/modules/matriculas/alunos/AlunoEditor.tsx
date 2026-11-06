'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { AlunoForm } from '@/components/modules/matriculas/alunos/AlunoForm';

export function AlunoEditor({ id }: { id: string }) {
  const carregar = useCallback(
    () => Promise.all([api.alunos.buscar(id), api.disciplinas.listar()]),
    [id],
  );
  const { data, erro, carregando } = useLoad(carregar);

  if (carregando) return <p className="text-sm text-[var(--ink-soft)]">Carregando…</p>;
  if (erro || !data) {
    return (
      <div className="space-y-4">
        <Alert>{erro ?? 'Aluno não encontrado'}</Alert>
        <Link href="/alunos" className={buttonClasses('outline')}>
          Voltar para alunos
        </Link>
      </div>
    );
  }
  return <AlunoForm aluno={data[0]} disciplinas={data[1]} />;
}

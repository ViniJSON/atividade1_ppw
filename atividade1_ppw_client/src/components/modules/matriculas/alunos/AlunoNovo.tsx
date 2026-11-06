'use client';

import { api } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { Alert } from '@/components/ui/alert';
import { AlunoForm } from '@/components/modules/matriculas/alunos/AlunoForm';

export function AlunoNovo() {
  const { data, erro, carregando } = useLoad(api.disciplinas.listar);

  if (carregando) return <p className="text-sm text-[var(--ink-soft)]">Carregando…</p>;
  if (erro || !data) return <Alert>{erro ?? 'Erro ao carregar disciplinas'}</Alert>;
  return <AlunoForm disciplinas={data} />;
}

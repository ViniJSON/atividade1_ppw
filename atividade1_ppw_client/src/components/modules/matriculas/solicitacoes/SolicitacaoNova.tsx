'use client';

import { api } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { Alert } from '@/components/ui/alert';
import { SolicitacaoForm } from '@/components/modules/matriculas/solicitacoes/SolicitacaoForm';

const carregar = () => Promise.all([api.alunos.listar(), api.disciplinas.listar()]);

export function SolicitacaoNova() {
  const { data, erro, carregando } = useLoad(carregar);

  if (carregando) return <p className="text-sm text-[var(--ink-soft)]">Carregando…</p>;
  if (erro || !data) return <Alert>{erro ?? 'Erro ao carregar dados'}</Alert>;
  return <SolicitacaoForm alunos={data[0]} disciplinas={data[1]} />;
}

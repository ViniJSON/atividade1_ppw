'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { SolicitacaoForm } from '@/components/modules/matriculas/solicitacoes/SolicitacaoForm';

export function SolicitacaoEditor({ id }: { id: string }) {
  const carregar = useCallback(
    () =>
      Promise.all([api.solicitacoes.buscar(id), api.alunos.listar(), api.disciplinas.listar()]),
    [id],
  );
  const { data, erro, carregando } = useLoad(carregar);

  if (carregando) return <p className="text-sm text-[var(--ink-soft)]">Carregando…</p>;

  const voltar = (
    <Link href="/solicitacoes" className={buttonClasses('outline')}>
      Voltar para solicitações
    </Link>
  );

  if (erro || !data) {
    return (
      <div className="space-y-4">
        <Alert>{erro ?? 'Solicitação não encontrada'}</Alert>
        {voltar}
      </div>
    );
  }

  const [solicitacao, alunos, disciplinas] = data;
  if (solicitacao.status !== 'PENDENTE') {
    return (
      <div className="space-y-4">
        <Alert>
          Só é possível alterar solicitações pendentes; esta já foi{' '}
          {solicitacao.status === 'APROVADA' ? 'aprovada' : 'rejeitada'}.
        </Alert>
        {voltar}
      </div>
    );
  }

  return <SolicitacaoForm solicitacao={solicitacao} alunos={alunos} disciplinas={disciplinas} />;
}

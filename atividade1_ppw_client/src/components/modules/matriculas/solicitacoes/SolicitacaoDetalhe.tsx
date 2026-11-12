'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { formatarData, ROTULO_STATUS, toneDoStatus } from '@/lib/solicitacao-ui';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AcoesSolicitacao } from './AcoesSolicitacao';
import { useAcaoSolicitacao } from './useAcaoSolicitacao';

export function SolicitacaoDetalhe({ id }: { id: string }) {
  const carregar = useCallback(
    () =>
      Promise.all([
        api.solicitacoes.buscar(id),
        api.solicitacoes.historico(id),
        api.alunos.listar(),
        api.disciplinas.listar(),
      ]),
    [id],
  );
  const { data, erro, carregando, recarregar } = useLoad(carregar);
  const acao = useAcaoSolicitacao(recarregar);

  const voltar = (
    <Link href="/solicitacoes" className={buttonClasses('outline')}>
      Voltar para solicitações
    </Link>
  );

  if (carregando) return <p className="text-sm text-[var(--ink-soft)]">Carregando…</p>;
  if (erro || !data) {
    return (
      <div className="space-y-4">
        <Alert>{erro ?? 'Solicitação não encontrada'}</Alert>
        {voltar}
      </div>
    );
  }

  const [s, historico, alunos, disciplinas] = data;
  const aluno = alunos.find((a) => a.id === s.alunoId)?.nome ?? s.alunoId;
  const disciplina = disciplinas.find((d) => d.id === s.disciplinaId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between gap-4">
          <CardTitle>
            {s.tipo === 'MATRICULA' ? 'Matrícula' : 'Trancamento'} · {aluno}
          </CardTitle>
          <Badge tone={toneDoStatus(s.status)}>{ROTULO_STATUS[s.status]}</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-[var(--ink-soft)]">Disciplina: </span>
            {disciplina ? `${disciplina.codigo} — ${disciplina.nome}` : s.disciplinaId}
          </p>
          <p className="text-[var(--ink-soft)]">
            Aberta em {formatarData(s.criadoEm)} · prazo (SLA) {formatarData(s.prazoLimite)}
            {s.escalonadaEm ? ` · escalonada em ${formatarData(s.escalonadaEm)}` : ''}
          </p>
          {(acao.sucesso || acao.erro) && (
            <div className="space-y-2">
              {acao.sucesso && <Alert tone="success">{acao.sucesso}</Alert>}
              {acao.erro && <Alert>{acao.erro}</Alert>}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <AcoesSolicitacao
              solicitacao={s}
              desabilitado={acao.processando === s.id}
              onAcao={(a) => acao.executar(s.id, a)}
            />
            {voltar}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trilha de auditoria</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ol>
            {historico.map((h, i) => (
              <li
                key={h.id}
                className={`px-5 py-3 text-sm ${i > 0 ? 'border-t border-[var(--line)]' : ''}`}
              >
                <p className="font-medium text-[var(--ink)]">
                  {h.evento.toLowerCase().replace(/_/g, ' ')}
                  <span className="font-normal text-[var(--ink-soft)]">
                    {' '}
                    · {h.estadoAnterior ? `${ROTULO_STATUS[h.estadoAnterior]} → ` : ''}
                    {ROTULO_STATUS[h.novoEstado]}
                  </span>
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {formatarData(h.timestamp)} · {h.autorPapel.toLowerCase()} ({h.autorId})
                </p>
                {h.justificativa && (
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">“{h.justificativa}”</p>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

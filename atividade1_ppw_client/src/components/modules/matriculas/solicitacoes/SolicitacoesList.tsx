'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { Solicitacao } from '@/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { ListaCard } from '@/components/modules/matriculas/ListaCard';

const carregar = () =>
  Promise.all([api.solicitacoes.listar(), api.alunos.listar(), api.disciplinas.listar()]);

function statusTone(status: Solicitacao['status']) {
  if (status === 'APROVADA') return 'success' as const;
  if (status === 'REJEITADA') return 'destructive' as const;
  return 'warning' as const;
}

export function SolicitacoesList({ aviso }: { aviso?: string }) {
  const { data, erro, carregando, recarregar } = useLoad(carregar);
  const [sucesso, setSucesso] = useState<string | null>(aviso ?? null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const solicitacoes = data?.[0] ?? [];
  const alunos = data?.[1] ?? [];
  const disciplinas = data?.[2] ?? [];
  const pendentes = solicitacoes.filter((s) => s.status === 'PENDENTE').length;

  const nomeAluno = (id: string) => alunos.find((a) => a.id === id)?.nome ?? id;
  const nomeDisciplina = (id: string) => disciplinas.find((d) => d.id === id)?.nome ?? id;

  async function executar(id: string, acao: () => Promise<unknown>, ok: string, padrao: string) {
    setErroAcao(null);
    setSucesso(null);
    setProcessando(id);
    try {
      await acao();
      setSucesso(ok);
      await recarregar();
    } catch (err) {
      setErroAcao(mensagemDeErro(err, padrao));
    } finally {
      setProcessando(null);
    }
  }

  const aprovar = (s: Solicitacao) =>
    executar(s.id, () => api.solicitacoes.aprovar(s.id), 'Solicitação aprovada.', 'Erro ao aprovar');

  function rejeitar(s: Solicitacao) {
    const motivo = window.prompt('Motivo da rejeição (opcional):');
    if (motivo === null) return;
    return executar(
      s.id,
      () => api.solicitacoes.rejeitar(s.id, motivo || undefined),
      'Solicitação rejeitada.',
      'Erro ao rejeitar',
    );
  }

  function excluir(s: Solicitacao) {
    if (!window.confirm('Excluir esta solicitação? Esta ação não pode ser desfeita.')) return;
    return executar(
      s.id,
      () => api.solicitacoes.excluir(s.id),
      'Solicitação excluída.',
      'Erro ao excluir',
    );
  }

  return (
    <ListaCard
      titulo={`Solicitações${pendentes > 0 ? ` · ${pendentes} pendente${pendentes > 1 ? 's' : ''}` : ''}`}
      acao={
        <Link href="/solicitacoes/novo" className={buttonClasses('default', 'sm')}>
          Nova solicitação
        </Link>
      }
      carregando={carregando}
      erro={erro}
      vazio={solicitacoes.length === 0}
      textoVazio="Nenhuma solicitação registrada ainda."
      avisos={
        (sucesso || erroAcao) && (
          <>
            {sucesso && <Alert tone="success">{sucesso}</Alert>}
            {erroAcao && <Alert>{erroAcao}</Alert>}
          </>
        )
      }
    >
      {solicitacoes.map((s, i) => {
        const ocupada = processando === s.id;
        return (
          <div
            key={s.id}
            className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
              i > 0 ? 'border-t border-[var(--line)]' : ''
            }`}
          >
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                {s.tipo === 'MATRICULA' ? 'Matrícula' : 'Trancamento'} · {nomeAluno(s.alunoId)}
              </p>
              <p className="text-sm text-[var(--ink-soft)]">{nomeDisciplina(s.disciplinaId)}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Badge tone={statusTone(s.status)}>{s.status.toLowerCase()}</Badge>
                {s.tipo === 'MATRICULA' && (
                  <>
                    <Badge tone={s.preRequisitosOk ? 'success' : 'destructive'}>
                      pré-requisitos {s.preRequisitosOk ? 'ok' : 'pendentes'}
                    </Badge>
                    <Badge tone={s.vagaDisponivel ? 'success' : 'destructive'}>
                      {s.vagaDisponivel ? 'vaga disponível' : 'sem vaga'}
                    </Badge>
                  </>
                )}
              </div>
              {s.status === 'REJEITADA' && s.motivoRejeicao && (
                <p className="mt-1.5 text-xs text-[var(--ink-soft)]">Motivo: {s.motivoRejeicao}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {s.status === 'PENDENTE' && (
                <>
                  <Button size="sm" onClick={() => aprovar(s)} disabled={ocupada}>
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejeitar(s)}
                    disabled={ocupada}
                  >
                    Rejeitar
                  </Button>
                  <Link
                    href={`/solicitacoes/${s.id}/editar`}
                    className={buttonClasses('outline', 'sm')}
                  >
                    Alterar
                  </Link>
                </>
              )}
              {s.status !== 'APROVADA' && (
                <Button size="sm" variant="ghost" onClick={() => excluir(s)} disabled={ocupada}>
                  Excluir
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </ListaCard>
  );
}

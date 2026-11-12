'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { formatarData, ROTULO_STATUS, toneDoStatus } from '@/lib/solicitacao-ui';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { usePerfil } from '@/components/layout/PerfilProvider';
import { ListaCard } from '@/components/modules/matriculas/ListaCard';
import { AcoesSolicitacao } from './AcoesSolicitacao';
import { useAcaoSolicitacao } from './useAcaoSolicitacao';

const carregar = () =>
  Promise.all([api.solicitacoes.listar(), api.alunos.listar(), api.disciplinas.listar()]);

export function SolicitacoesList({ aviso }: { aviso?: string }) {
  const perfil = usePerfil();
  const { data, erro, carregando, recarregar } = useLoad(carregar);
  const acao = useAcaoSolicitacao(recarregar);
  const [avisoSla, setAvisoSla] = useState<string | null>(null);

  const solicitacoes = data?.[0] ?? [];
  const alunos = data?.[1] ?? [];
  const disciplinas = data?.[2] ?? [];
  const emAtendimento = solicitacoes.filter((s) =>
    ['PENDENTE', 'EM_ANALISE', 'AJUSTE_SOLICITADO'].includes(s.status),
  ).length;

  const nomeAluno = (id: string) => alunos.find((a) => a.id === id)?.nome ?? id;
  const nomeDisciplina = (id: string) => disciplinas.find((d) => d.id === id)?.nome ?? id;

  async function varrerSla() {
    acao.setErro(null);
    try {
      const r = await api.solicitacoes.processarSla();
      setAvisoSla(
        `Varredura de SLA: ${r.expiradas.length} expirada(s), ${r.escalonadas.length} escalonada(s)` +
          (r.falhas.length ? `, ${r.falhas.length} falha(s)` : '') +
          '.',
      );
      await recarregar();
    } catch (err) {
      acao.setErro(mensagemDeErro(err, 'Erro na varredura de SLA'));
    }
  }

  const mensagemOk = acao.sucesso ?? avisoSla ?? aviso ?? null;

  return (
    <ListaCard
      titulo={`Solicitações${emAtendimento > 0 ? ` · ${emAtendimento} em atendimento` : ''}`}
      acao={
        <div className="flex gap-2">
          {perfil.papel === 'COORDENADOR' && (
            <Button size="sm" variant="outline" onClick={varrerSla}>
              Varrer SLA
            </Button>
          )}
          {perfil.papel !== 'COORDENADOR' && (
            <Link href="/solicitacoes/novo" className={buttonClasses('default', 'sm')}>
              Nova solicitação
            </Link>
          )}
        </div>
      }
      carregando={carregando}
      erro={erro}
      vazio={solicitacoes.length === 0}
      textoVazio="Nenhuma solicitação registrada ainda."
      avisos={
        (mensagemOk || acao.erro) && (
          <>
            {mensagemOk && <Alert tone="success">{mensagemOk}</Alert>}
            {acao.erro && <Alert>{acao.erro}</Alert>}
          </>
        )
      }
    >
      {solicitacoes.map((s, i) => (
        <div
          key={s.id}
          className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
            i > 0 ? 'border-t border-[var(--line)]' : ''
          }`}
        >
          <div>
            <Link
              href={`/solicitacoes/${s.id}`}
              className="text-sm font-medium text-[var(--ink)] underline-offset-2 hover:underline"
            >
              {s.tipo === 'MATRICULA' ? 'Matrícula' : 'Trancamento'} · {nomeAluno(s.alunoId)}
            </Link>
            <p className="text-sm text-[var(--ink-soft)]">{nomeDisciplina(s.disciplinaId)}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Badge tone={toneDoStatus(s.status)}>{ROTULO_STATUS[s.status]}</Badge>
              {s.tipo === 'MATRICULA' && (
                <>
                  <Badge tone={s.preRequisitosOk ? 'success' : 'destructive'}>
                    pré-requisitos {s.preRequisitosOk ? 'ok' : 'pendentes'}
                  </Badge>
                  <Badge tone={s.vagaDisponivel ? 'success' : 'destructive'}>
                    {s.vagaDisponivel ? 'vaga disponível' : 'sem vaga'}
                  </Badge>
                  <Badge tone={s.semConflitoHorario ? 'success' : 'destructive'}>
                    {s.semConflitoHorario ? 'sem choque de horário' : 'choque de horário'}
                  </Badge>
                </>
              )}
              {s.escalonadaEm && <Badge tone="warning">escalonada</Badge>}
            </div>
            {['PENDENTE', 'EM_ANALISE', 'AJUSTE_SOLICITADO'].includes(s.status) && (
              <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
                Prazo (SLA): {formatarData(s.prazoLimite)}
              </p>
            )}
            {s.ultimaJustificativa && (
              <p className="mt-1.5 text-xs text-[var(--ink-soft)]">Justificativa: {s.ultimaJustificativa}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <AcoesSolicitacao
              solicitacao={s}
              desabilitado={acao.processando === s.id}
              onAcao={(a) => acao.executar(s.id, a)}
            />
          </div>
        </div>
      ))}
    </ListaCard>
  );
}

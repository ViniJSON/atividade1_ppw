'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { DIAS } from '@/lib/solicitacao-ui';
import { Disciplina } from '@/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { ListaCard } from '@/components/modules/matriculas/ListaCard';

export function DisciplinasList({ aviso }: { aviso?: string }) {
  const { data, erro, carregando, recarregar } = useLoad(api.disciplinas.listar);
  const [sucesso, setSucesso] = useState<string | null>(aviso ?? null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const disciplinas = data ?? [];
  const nomeDisciplina = (id: string) => disciplinas.find((d) => d.id === id)?.nome ?? id;

  async function excluir(disciplina: Disciplina) {
    if (
      !window.confirm(
        `Excluir a disciplina "${disciplina.codigo} — ${disciplina.nome}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setErroAcao(null);
    setSucesso(null);
    setRemovendo(disciplina.id);
    try {
      await api.disciplinas.excluir(disciplina.id);
      setSucesso(`Disciplina "${disciplina.codigo}" excluída.`);
      await recarregar();
    } catch (err) {
      setErroAcao(mensagemDeErro(err, 'Erro ao excluir disciplina'));
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <ListaCard
      titulo="Disciplinas"
      acao={
        <Link href="/disciplinas/novo" className={buttonClasses('default', 'sm')}>
          Nova disciplina
        </Link>
      }
      carregando={carregando}
      erro={erro}
      vazio={disciplinas.length === 0}
      textoVazio="Nenhuma disciplina cadastrada ainda."
      avisos={
        (sucesso || erroAcao) && (
          <>
            {sucesso && <Alert tone="success">{sucesso}</Alert>}
            {erroAcao && <Alert>{erroAcao}</Alert>}
          </>
        )
      }
    >
      {disciplinas.map((d, i) => (
        <div
          key={d.id}
          className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
            i > 0 ? 'border-t border-[var(--line)]' : ''
          }`}
        >
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-[var(--ink)]">
                {d.codigo} — {d.nome}
              </p>
              <Badge tone={d.vagasOcupadas < d.vagasTotais ? 'success' : 'destructive'}>
                {d.vagasOcupadas}/{d.vagasTotais}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
              Pré-requisitos: {d.preRequisitos.map(nomeDisciplina).join(', ') || 'nenhum'}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Horários:{' '}
              {d.horarios.map((h) => `${DIAS[h.dia]} ${h.inicio}–${h.fim}`).join(' · ') || 'não informados'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href={`/disciplinas/${d.id}/editar`} className={buttonClasses('outline', 'sm')}>
              Alterar
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => excluir(d)}
              disabled={removendo === d.id}
            >
              {removendo === d.id ? 'Excluindo…' : 'Excluir'}
            </Button>
          </div>
        </div>
      ))}
    </ListaCard>
  );
}

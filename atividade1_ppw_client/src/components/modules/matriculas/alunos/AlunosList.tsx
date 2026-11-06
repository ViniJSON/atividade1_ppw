'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { useLoad } from '@/hooks/useLoad';
import { Aluno } from '@/types';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { ListaCard } from '@/components/modules/matriculas/ListaCard';

const carregar = () => Promise.all([api.alunos.listar(), api.disciplinas.listar()]);

export function AlunosList({ aviso }: { aviso?: string }) {
  const { data, erro, carregando, recarregar } = useLoad(carregar);
  const [sucesso, setSucesso] = useState<string | null>(aviso ?? null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const alunos = data?.[0] ?? [];
  const disciplinas = data?.[1] ?? [];
  const nomeDisciplina = (id: string) => disciplinas.find((d) => d.id === id)?.nome ?? id;

  async function excluir(aluno: Aluno) {
    if (!window.confirm(`Excluir o aluno "${aluno.nome}"? Esta ação não pode ser desfeita.`)) return;
    setErroAcao(null);
    setSucesso(null);
    setRemovendo(aluno.id);
    try {
      await api.alunos.excluir(aluno.id);
      setSucesso(`Aluno "${aluno.nome}" excluído.`);
      await recarregar();
    } catch (err) {
      setErroAcao(mensagemDeErro(err, 'Erro ao excluir aluno'));
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <ListaCard
      titulo="Alunos"
      acao={
        <Link href="/alunos/novo" className={buttonClasses('default', 'sm')}>
          Novo aluno
        </Link>
      }
      carregando={carregando}
      erro={erro}
      vazio={alunos.length === 0}
      textoVazio="Nenhum aluno cadastrado ainda."
      avisos={
        (sucesso || erroAcao) && (
          <>
            {sucesso && <Alert tone="success">{sucesso}</Alert>}
            {erroAcao && <Alert>{erroAcao}</Alert>}
          </>
        )
      }
    >
      {alunos.map((a, i) => (
        <div
          key={a.id}
          className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
            i > 0 ? 'border-t border-[var(--line)]' : ''
          }`}
        >
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">{a.nome}</p>
            <p className="text-xs text-[var(--ink-soft)]">matrícula {a.matricula}</p>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Concluídas: {a.disciplinasConcluidas.map(nomeDisciplina).join(', ') || '—'}
            </p>
            <p className="text-xs text-[var(--ink-soft)]">
              Ativas: {a.disciplinasAtivas.map(nomeDisciplina).join(', ') || '—'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href={`/alunos/${a.id}/editar`} className={buttonClasses('outline', 'sm')}>
              Alterar
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => excluir(a)}
              disabled={removendo === a.id}
            >
              {removendo === a.id ? 'Excluindo…' : 'Excluir'}
            </Button>
          </div>
        </div>
      ))}
    </ListaCard>
  );
}

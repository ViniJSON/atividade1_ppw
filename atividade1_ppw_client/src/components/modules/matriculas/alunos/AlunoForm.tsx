'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { Aluno, Disciplina } from '@/types';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function AlunoForm({ aluno, disciplinas }: { aluno?: Aluno; disciplinas: Disciplina[] }) {
  const router = useRouter();
  const editando = Boolean(aluno);

  const [nome, setNome] = useState(aluno?.nome ?? '');
  const [matricula, setMatricula] = useState(aluno?.matricula ?? '');
  const [concluidas, setConcluidas] = useState<string[]>(aluno?.disciplinasConcluidas ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const ativas = aluno?.disciplinasAtivas ?? [];
  const opcoes = disciplinas.map((d) => ({
    value: d.id,
    label: `${d.codigo} — ${d.nome}`,
    disabled: ativas.includes(d.id),
    hint: ativas.includes(d.id) ? 'em andamento' : undefined,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const dados = { nome, matricula, disciplinasConcluidas: concluidas };
      if (aluno) await api.alunos.atualizar(aluno.id, dados);
      else await api.alunos.criar(dados);
      router.push(`/alunos?ok=${editando ? 'alterado' : 'incluido'}`);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao salvar aluno'));
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editando ? 'Alterar aluno' : 'Novo aluno'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Nome" htmlFor="nome">
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              required
            />
          </Field>

          <Field label="Matrícula" htmlFor="matricula">
            <Input
              id="matricula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field
            label="Disciplinas concluídas"
            hint="Usadas na checagem de pré-requisitos das matrículas."
          >
            <CheckboxGroup
              options={opcoes}
              value={concluidas}
              onChange={setConcluidas}
              emptyText="Cadastre disciplinas para poder marcá-las como concluídas."
            />
          </Field>

          {erro && <Alert>{erro}</Alert>}

          <div className="flex gap-3">
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Incluir aluno'}
            </Button>
            <Link href="/alunos" className={buttonClasses('outline')}>
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { dependentesDe } from '@/lib/pre-requisitos';
import { Disciplina } from '@/types';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function DisciplinaForm({
  disciplina,
  disciplinas,
}: {
  disciplina?: Disciplina;
  disciplinas: Disciplina[];
}) {
  const router = useRouter();
  const editando = Boolean(disciplina);

  const [codigo, setCodigo] = useState(disciplina?.codigo ?? '');
  const [nome, setNome] = useState(disciplina?.nome ?? '');
  const [vagasTotais, setVagasTotais] = useState(String(disciplina?.vagasTotais ?? 30));
  const [preRequisitos, setPreRequisitos] = useState<string[]>(disciplina?.preRequisitos ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const vagasOcupadas = disciplina?.vagasOcupadas ?? 0;
  const dependentes = disciplina ? dependentesDe(disciplina.id, disciplinas) : new Set<string>();

  const opcoes = disciplinas
    .filter((d) => d.id !== disciplina?.id)
    .map((d) => ({
      value: d.id,
      label: `${d.codigo} — ${d.nome}`,
      disabled: dependentes.has(d.id),
      hint: dependentes.has(d.id) ? 'depende desta disciplina' : undefined,
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const dados = {
        codigo,
        nome,
        vagasTotais: Number(vagasTotais),
        preRequisitos,
      };
      if (disciplina) await api.disciplinas.atualizar(disciplina.id, dados);
      else await api.disciplinas.criar(dados);
      router.push(`/disciplinas?ok=${editando ? 'alterada' : 'incluida'}`);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao salvar disciplina'));
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editando ? 'Alterar disciplina' : 'Nova disciplina'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
            <Field label="Código" htmlFor="codigo">
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                maxLength={20}
                placeholder="ALG101"
                required
              />
            </Field>
            <Field label="Nome" htmlFor="nome">
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
                required
              />
            </Field>
          </div>

          <Field
            label="Vagas totais"
            htmlFor="vagas"
            hint={
              editando
                ? `${vagasOcupadas} vaga(s) ocupada(s) — o total não pode ser menor que isso.`
                : undefined
            }
          >
            <Input
              id="vagas"
              type="number"
              min={Math.max(1, vagasOcupadas)}
              step={1}
              value={vagasTotais}
              onChange={(e) => setVagasTotais(e.target.value)}
              required
            />
          </Field>

          <Field label="Pré-requisitos">
            <CheckboxGroup
              options={opcoes}
              value={preRequisitos}
              onChange={setPreRequisitos}
              emptyText="Não há outras disciplinas para usar como pré-requisito."
            />
          </Field>

          {erro && <Alert>{erro}</Alert>}

          <div className="flex gap-3">
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Incluir disciplina'}
            </Button>
            <Link href="/disciplinas" className={buttonClasses('outline')}>
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

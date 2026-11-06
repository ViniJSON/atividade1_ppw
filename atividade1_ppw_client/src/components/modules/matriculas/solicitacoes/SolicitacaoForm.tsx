'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { Aluno, Disciplina, Solicitacao, TipoSolicitacao } from '@/types';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';

export function SolicitacaoForm({
  solicitacao,
  alunos,
  disciplinas,
}: {
  solicitacao?: Solicitacao;
  alunos: Aluno[];
  disciplinas: Disciplina[];
}) {
  const router = useRouter();
  const editando = Boolean(solicitacao);

  const [alunoId, setAlunoId] = useState(solicitacao?.alunoId ?? alunos[0]?.id ?? '');
  const [disciplinaId, setDisciplinaId] = useState(
    solicitacao?.disciplinaId ?? disciplinas[0]?.id ?? '',
  );
  const [tipo, setTipo] = useState<TipoSolicitacao>(solicitacao?.tipo ?? 'MATRICULA');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const semDados = alunos.length === 0 || disciplinas.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const dados = { alunoId, disciplinaId, tipo };
      if (solicitacao) await api.solicitacoes.atualizar(solicitacao.id, dados);
      else await api.solicitacoes.criar(dados);
      router.push(`/solicitacoes?ok=${editando ? 'alterada' : 'incluida'}`);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao salvar solicitação'));
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editando ? 'Alterar solicitação' : 'Registrar solicitação'}</CardTitle>
      </CardHeader>
      <CardContent>
        {semDados ? (
          <p className="text-sm text-[var(--ink-soft)]">
            É preciso ter ao menos um aluno e uma disciplina cadastrados para registrar uma
            solicitação.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {(['MATRICULA', 'TRANCAMENTO'] as const).map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 border border-[var(--line)] px-3 py-2 text-sm has-[:checked]:border-[var(--oxblood)] has-[:checked]:text-[var(--oxblood)]"
                >
                  <input
                    type="radio"
                    name="tipo"
                    className="accent-[var(--oxblood)]"
                    checked={tipo === t}
                    onChange={() => setTipo(t)}
                  />
                  {t === 'MATRICULA' ? 'Matrícula' : 'Trancamento'}
                </label>
              ))}
            </div>

            <Field label="Aluno" htmlFor="aluno">
              <Select id="aluno" value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} — matrícula {a.matricula}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Disciplina" htmlFor="disciplina">
              <Select
                id="disciplina"
                value={disciplinaId}
                onChange={(e) => setDisciplinaId(e.target.value)}
              >
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.codigo} — {d.nome} ({d.vagasOcupadas}/{d.vagasTotais} vagas)
                  </option>
                ))}
              </Select>
            </Field>

            {erro && <Alert>{erro}</Alert>}

            <div className="flex gap-3">
              <Button type="submit" disabled={enviando}>
                {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Enviar solicitação'}
              </Button>
              <Link href="/solicitacoes" className={buttonClasses('outline')}>
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

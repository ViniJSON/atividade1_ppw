'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { Aluno, Disciplina, TipoSolicitacao } from '@/types';
import { usePerfil } from '@/components/layout/PerfilProvider';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';

export function SolicitacaoForm({
  alunos,
  disciplinas,
}: {
  alunos: Aluno[];
  disciplinas: Disciplina[];
}) {
  const router = useRouter();
  const perfil = usePerfil();
  // Aluno só abre pedido para si; a secretaria escolhe o aluno. O servidor valida de novo.
  const souAluno = perfil.papel === 'ALUNO';

  const [alunoId, setAlunoId] = useState(souAluno ? perfil.id : (alunos[0]?.id ?? ''));
  const [disciplinaId, setDisciplinaId] = useState(disciplinas[0]?.id ?? '');
  const [tipo, setTipo] = useState<TipoSolicitacao>('MATRICULA');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const semDados = alunos.length === 0 || disciplinas.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.solicitacoes.criar({ alunoId, disciplinaId, tipo });
      router.push('/solicitacoes?ok=incluida');
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao salvar solicitação'));
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar solicitação</CardTitle>
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
              <Select
                id="aluno"
                value={alunoId}
                disabled={souAluno}
                onChange={(e) => setAlunoId(e.target.value)}
              >
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
                {enviando ? 'Enviando…' : 'Enviar solicitação'}
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

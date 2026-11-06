import { AlunosList } from '@/components/modules/matriculas/alunos/AlunosList';

const avisos: Record<string, string> = {
  incluido: 'Aluno incluído com sucesso.',
  alterado: 'Aluno alterado com sucesso.',
};

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  return <AlunosList aviso={ok ? avisos[ok] : undefined} />;
}

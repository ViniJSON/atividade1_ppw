import { DisciplinasList } from '@/components/modules/matriculas/disciplinas/DisciplinasList';

const avisos: Record<string, string> = {
  incluida: 'Disciplina incluída com sucesso.',
  alterada: 'Disciplina alterada com sucesso.',
};

export default async function DisciplinasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  return <DisciplinasList aviso={ok ? avisos[ok] : undefined} />;
}

import { DisciplinaEditor } from '@/components/modules/matriculas/disciplinas/DisciplinaEditor';

export default async function EditarDisciplinaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DisciplinaEditor id={id} />;
}

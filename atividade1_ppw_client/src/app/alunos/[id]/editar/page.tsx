import { AlunoEditor } from '@/components/modules/matriculas/alunos/AlunoEditor';

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AlunoEditor id={id} />;
}

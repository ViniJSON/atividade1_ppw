import { SolicitacaoEditor } from '@/components/modules/matriculas/solicitacoes/SolicitacaoEditor';

export default async function EditarSolicitacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SolicitacaoEditor id={id} />;
}

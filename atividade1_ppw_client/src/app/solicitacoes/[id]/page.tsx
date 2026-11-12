import { SolicitacaoDetalhe } from '@/components/modules/matriculas/solicitacoes/SolicitacaoDetalhe';

export default async function SolicitacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SolicitacaoDetalhe id={id} />;
}

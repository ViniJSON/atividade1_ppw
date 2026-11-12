import { SolicitacoesList } from '@/components/modules/matriculas/solicitacoes/SolicitacoesList';

const avisos: Record<string, string> = {
  incluida: 'Solicitação registrada, aguardando validação da coordenação.',
};

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  return <SolicitacoesList aviso={ok ? avisos[ok] : undefined} />;
}

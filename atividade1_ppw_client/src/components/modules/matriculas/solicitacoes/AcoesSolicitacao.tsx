'use client';

import { Button } from '@/components/ui/button';
import { ACOES, ORDEM_ACOES } from '@/lib/solicitacao-ui';
import { AcaoSolicitacao, Solicitacao } from '@/types';

/** Mostra apenas as ações que a máquina de estados permite ao perfil atual neste estado. */
export function AcoesSolicitacao({
  solicitacao,
  desabilitado,
  onAcao,
}: {
  solicitacao: Solicitacao;
  desabilitado: boolean;
  onAcao: (acao: AcaoSolicitacao) => void;
}) {
  const acoes = ORDEM_ACOES.filter((a) => solicitacao.acoesPermitidas.includes(a));
  if (acoes.length === 0) return null;
  return (
    <>
      {acoes.map((a) => (
        <Button
          key={a}
          size="sm"
          variant={ACOES[a].variante}
          onClick={() => onAcao(a)}
          disabled={desabilitado}
        >
          {ACOES[a].rotulo}
        </Button>
      ))}
    </>
  );
}

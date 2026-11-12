'use client';

import { useState } from 'react';
import { api, mensagemDeErro } from '@/lib/api';
import { ACOES } from '@/lib/solicitacao-ui';
import { AcaoSolicitacao } from '@/types';

/**
 * Executa uma ação da máquina de estados. Pergunta a justificativa quando a ação a exige
 * (o servidor valida de novo: a UI é só conveniência) e devolve mensagens de sucesso/erro.
 */
export function useAcaoSolicitacao(aoConcluir: () => Promise<unknown> | void) {
  const [processando, setProcessando] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(id: string, acao: AcaoSolicitacao) {
    const cfg = ACOES[acao];
    let justificativa: string | undefined;
    if (cfg.justificativa === 'obrigatoria') {
      const resposta = window.prompt(cfg.pergunta ?? 'Justificativa:');
      if (resposta === null) return; // usuário cancelou
      if (!resposta.trim()) {
        setSucesso(null);
        setErro('Esta ação exige uma justificativa.');
        return;
      }
      justificativa = resposta.trim();
    }
    setErro(null);
    setSucesso(null);
    setProcessando(id);
    try {
      await api.solicitacoes.acao(id, acao, justificativa);
      setSucesso(cfg.sucesso);
      await aoConcluir();
    } catch (err) {
      setErro(mensagemDeErro(err, `Erro ao executar "${cfg.rotulo}"`));
    } finally {
      setProcessando(null);
    }
  }

  return { executar, processando, sucesso, erro, setSucesso, setErro };
}

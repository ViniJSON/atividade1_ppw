import { AcaoSolicitacao, StatusSolicitacao } from '@/types';

export const ROTULO_STATUS: Record<StatusSolicitacao, string> = {
  PENDENTE: 'pendente',
  EM_ANALISE: 'em análise',
  AJUSTE_SOLICITADO: 'ajuste solicitado',
  APROVADA: 'aprovada (aguarda efetivação)',
  CONCLUIDA: 'concluída',
  REJEITADA: 'rejeitada',
  CANCELADA: 'cancelada',
  EXPIRADA: 'expirada (SLA)',
  ESTORNADA: 'estornada',
};

export function toneDoStatus(status: StatusSolicitacao) {
  switch (status) {
    case 'CONCLUIDA':
      return 'success' as const;
    case 'REJEITADA':
    case 'EXPIRADA':
    case 'CANCELADA':
    case 'ESTORNADA':
      return 'destructive' as const;
    case 'APROVADA':
      return 'default' as const;
    default:
      return 'warning' as const;
  }
}

export interface ConfigAcao {
  rotulo: string;
  sucesso: string;
  variante: 'default' | 'outline' | 'destructive' | 'ghost';
  justificativa: 'obrigatoria' | 'nenhuma';
  pergunta?: string;
}

export const ACOES: Record<AcaoSolicitacao, ConfigAcao> = {
  INICIAR_ANALISE: { rotulo: 'Iniciar análise', sucesso: 'Análise iniciada.', variante: 'outline', justificativa: 'nenhuma' },
  SOLICITAR_AJUSTE: { rotulo: 'Solicitar ajuste', sucesso: 'Ajuste solicitado ao aluno.', variante: 'outline', justificativa: 'obrigatoria', pergunta: 'O que o aluno precisa ajustar?' },
  REENVIAR: { rotulo: 'Reenviar', sucesso: 'Solicitação reenviada.', variante: 'default', justificativa: 'obrigatoria', pergunta: 'O que foi ajustado?' },
  APROVAR: { rotulo: 'Aprovar', sucesso: 'Solicitação aprovada; aguarda efetivação pela secretaria.', variante: 'default', justificativa: 'nenhuma' },
  REJEITAR: { rotulo: 'Rejeitar', sucesso: 'Solicitação rejeitada.', variante: 'destructive', justificativa: 'obrigatoria', pergunta: 'Motivo da rejeição:' },
  CONCLUIR: { rotulo: 'Efetivar', sucesso: 'Solicitação efetivada: vaga e grade atualizadas.', variante: 'default', justificativa: 'nenhuma' },
  CANCELAR: { rotulo: 'Cancelar', sucesso: 'Solicitação cancelada.', variante: 'ghost', justificativa: 'obrigatoria', pergunta: 'Motivo do cancelamento:' },
  ESTORNAR: { rotulo: 'Estornar', sucesso: 'Solicitação estornada: efeitos desfeitos.', variante: 'destructive', justificativa: 'obrigatoria', pergunta: 'Motivo do estorno:' },
};

export const ORDEM_ACOES: AcaoSolicitacao[] = [
  'INICIAR_ANALISE', 'APROVAR', 'CONCLUIR', 'SOLICITAR_AJUSTE', 'REENVIAR', 'REJEITAR', 'ESTORNAR', 'CANCELAR',
];

export const formatarData = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const DIAS = ['', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

import { EventoSolicitacao, PapelUsuario, StatusSolicitacao } from '../enums/solicitacao.enums';

export interface HistoricoSolicitacao {
  readonly id: string;
  readonly idRegistro: string;
  readonly evento: EventoSolicitacao;
  readonly estadoAnterior: StatusSolicitacao | null;
  readonly novoEstado: StatusSolicitacao;
  readonly autorId: string;
  readonly autorPapel: PapelUsuario;
  readonly justificativa: string | null;
  readonly metadados: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

export type NovoHistorico = Omit<HistoricoSolicitacao, 'id'>;

import { EventoSolicitacao, PapelUsuario, StatusSolicitacao } from '../enums/solicitacao.enums';

/**
 * Linha da trilha de auditoria. Somente leitura: não há método de update/delete
 * no repositório e, no Postgres, um trigger bloqueia UPDATE/DELETE na tabela.
 * Mapeamento para o enunciado: id_registro = idRegistro, estado_anterior, novo_estado,
 * autor_id, justificativa, timestamp.
 */
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

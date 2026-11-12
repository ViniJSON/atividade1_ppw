import { HistoricoSolicitacao, NovoHistorico } from '../entities/historico-solicitacao';

/** Append-only: propositalmente sem update/delete. */
export abstract class HistoricoRepository {
  abstract registrar(entrada: NovoHistorico): Promise<HistoricoSolicitacao>;
  abstract listarPorSolicitacao(idRegistro: string): Promise<HistoricoSolicitacao[]>;
}

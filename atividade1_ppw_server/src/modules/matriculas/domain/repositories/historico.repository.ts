import { HistoricoSolicitacao, NovoHistorico } from '../entities/historico-solicitacao';

export abstract class HistoricoRepository {
  abstract registrar(entrada: NovoHistorico): Promise<HistoricoSolicitacao>;
  abstract listarPorSolicitacao(idRegistro: string): Promise<HistoricoSolicitacao[]>;
}

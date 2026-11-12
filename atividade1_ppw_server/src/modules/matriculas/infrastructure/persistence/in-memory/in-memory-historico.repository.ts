import { Injectable } from '@nestjs/common';
import { HistoricoSolicitacao, NovoHistorico } from '../../../domain/entities/historico-solicitacao';
import { HistoricoRepository } from '../../../domain/repositories/historico.repository';
import { Restaurar } from './clonar';

@Injectable()
export class InMemoryHistoricoRepository extends HistoricoRepository {
  private items: HistoricoSolicitacao[] = [];
  private seq = 0;

  registrar(entrada: NovoHistorico): Promise<HistoricoSolicitacao> {
    const linha: HistoricoSolicitacao = Object.freeze({
      ...entrada,
      metadados: Object.freeze({ ...entrada.metadados }),
      id: `h-${++this.seq}`,
    });
    this.items.push(linha);
    return Promise.resolve(linha);
  }

  listarPorSolicitacao(idRegistro: string): Promise<HistoricoSolicitacao[]> {
    return Promise.resolve(this.items.filter((h) => h.idRegistro === idRegistro));
  }

  snapshot(): Restaurar {
    const copia = [...this.items];
    return () => {
      this.items = [...copia];
    };
  }
}

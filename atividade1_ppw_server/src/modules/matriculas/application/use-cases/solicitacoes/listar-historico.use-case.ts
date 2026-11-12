import { Injectable } from '@nestjs/common';
import { HistoricoSolicitacao } from '../../../domain/entities/historico-solicitacao';
import { HistoricoRepository } from '../../../domain/repositories/historico.repository';
import { Actor } from '../../../domain/workflow/types';
import { BuscarSolicitacaoUseCase } from './buscar-solicitacao.use-case';

@Injectable()
export class ListarHistoricoUseCase {
  constructor(
    private readonly buscar: BuscarSolicitacaoUseCase,
    private readonly historico: HistoricoRepository,
  ) {}

  async execute(id: string, actor: Actor): Promise<HistoricoSolicitacao[]> {
    await this.buscar.execute(id, actor); // 404/403 reaproveitados
    return this.historico.listarPorSolicitacao(id);
  }
}

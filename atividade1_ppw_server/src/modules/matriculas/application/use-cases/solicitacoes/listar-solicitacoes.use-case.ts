import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';

@Injectable()
export class ListarSolicitacoesUseCase {
  constructor(private readonly solicitacoes: SolicitacaoRepository) {}

  async execute(): Promise<Solicitacao[]> {
    const todas = await this.solicitacoes.findAll();
    return [...todas].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }
}

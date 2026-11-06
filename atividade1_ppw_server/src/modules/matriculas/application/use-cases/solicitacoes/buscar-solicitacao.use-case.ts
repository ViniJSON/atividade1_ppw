import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { NotFoundError } from '../../../domain/errors/domain.errors';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';

@Injectable()
export class BuscarSolicitacaoUseCase {
  constructor(private readonly solicitacoes: SolicitacaoRepository) {}

  async execute(id: string): Promise<Solicitacao> {
    const solicitacao = await this.solicitacoes.findById(id);
    if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');
    return solicitacao;
  }
}

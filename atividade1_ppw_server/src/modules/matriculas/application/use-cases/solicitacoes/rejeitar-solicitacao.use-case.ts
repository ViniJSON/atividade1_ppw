import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { NotFoundError } from '../../../domain/errors/domain.errors';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';

@Injectable()
export class RejeitarSolicitacaoUseCase {
  constructor(private readonly solicitacoes: SolicitacaoRepository) {}

  async execute(id: string, motivo?: string): Promise<Solicitacao> {
    const solicitacao = await this.solicitacoes.findById(id);
    if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');

    solicitacao.rejeitar(motivo);
    await this.solicitacoes.save(solicitacao);
    return solicitacao;
  }
}

import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../domain/errors/domain.errors';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';

@Injectable()
export class ExcluirSolicitacaoUseCase {
  constructor(private readonly solicitacoes: SolicitacaoRepository) {}

  async execute(id: string): Promise<void> {
    const solicitacao = await this.solicitacoes.findById(id);
    if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');
    solicitacao.garantirPodeSerExcluida();
    await this.solicitacoes.delete(id);
  }
}

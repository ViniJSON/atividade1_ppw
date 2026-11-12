import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { PapelUsuario } from '../../../domain/enums/solicitacao.enums';
import { ForbiddenError, NotFoundError } from '../../../domain/errors/domain.errors';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';
import { Actor } from '../../../domain/workflow/types';

@Injectable()
export class BuscarSolicitacaoUseCase {
  constructor(private readonly solicitacoes: SolicitacaoRepository) {}

  async execute(id: string, actor: Actor): Promise<Solicitacao> {
    const solicitacao = await this.solicitacoes.findById(id);
    if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');
    if (actor.papel === PapelUsuario.ALUNO && solicitacao.alunoId !== actor.id) {
      throw new ForbiddenError('Um aluno só pode consultar as próprias solicitações');
    }
    return solicitacao;
  }
}

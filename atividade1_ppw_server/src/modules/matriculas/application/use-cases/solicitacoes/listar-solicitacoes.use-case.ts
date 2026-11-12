import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { PapelUsuario } from '../../../domain/enums/solicitacao.enums';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';
import { Actor } from '../../../domain/workflow/types';

@Injectable()
export class ListarSolicitacoesUseCase {
  constructor(private readonly solicitacoes: SolicitacaoRepository) {}

  /** Aluno enxerga só as próprias; coordenação e secretaria enxergam todas. */
  async execute(actor: Actor): Promise<Solicitacao[]> {
    const todas =
      actor.papel === PapelUsuario.ALUNO
        ? await this.solicitacoes.findByAlunoId(actor.id)
        : await this.solicitacoes.findAll();
    return [...todas].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }
}

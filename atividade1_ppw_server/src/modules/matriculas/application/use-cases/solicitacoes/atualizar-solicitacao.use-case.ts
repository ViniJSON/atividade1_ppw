import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';
import { avaliarSolicitacao } from '../../../domain/services/avaliar-solicitacao';

export interface AtualizarSolicitacaoInput {
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
}

@Injectable()
export class AtualizarSolicitacaoUseCase {
  constructor(
    private readonly solicitacoes: SolicitacaoRepository,
    private readonly alunos: AlunoRepository,
    private readonly disciplinas: DisciplinaRepository,
  ) {}

  async execute(
    id: string,
    input: AtualizarSolicitacaoInput,
  ): Promise<Solicitacao> {
    const solicitacao = await this.solicitacoes.findById(id);
    if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');
    if (!solicitacao.estaPendente()) {
      throw new BusinessRuleError(
        'Só é possível alterar solicitações pendentes',
      );
    }

    const aluno = await this.alunos.findById(input.alunoId);
    if (!aluno) throw new NotFoundError('Aluno não encontrado');
    const disciplina = await this.disciplinas.findById(input.disciplinaId);
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');

    const { preRequisitosOk, vagaDisponivel } = avaliarSolicitacao(
      aluno,
      disciplina,
      input.tipo,
    );

    solicitacao.atualizar({
      alunoId: aluno.id,
      disciplinaId: disciplina.id,
      tipo: input.tipo,
      preRequisitosOk,
      vagaDisponivel,
    });
    await this.solicitacoes.save(solicitacao);
    return solicitacao;
  }
}

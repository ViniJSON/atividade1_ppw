import { Injectable } from '@nestjs/common';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';

@Injectable()
export class ExcluirAlunoUseCase {
  constructor(
    private readonly alunos: AlunoRepository,
    private readonly solicitacoes: SolicitacaoRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const aluno = await this.alunos.findById(id);
    if (!aluno) throw new NotFoundError('Aluno não encontrado');

    if (aluno.disciplinasAtivas.length > 0) {
      throw new BusinessRuleError(
        'Não é possível excluir: o aluno está matriculado em disciplinas',
      );
    }
    const doAluno = await this.solicitacoes.findByAlunoId(id);
    if (doAluno.length > 0) {
      throw new BusinessRuleError(
        doAluno.some((s) => s.estaAberta())
          ? 'Não é possível excluir: o aluno possui solicitações em aberto'
          : 'Não é possível excluir: o aluno possui histórico de solicitações (trilha de auditoria preservada)',
      );
    }
    await this.alunos.delete(id);
  }
}

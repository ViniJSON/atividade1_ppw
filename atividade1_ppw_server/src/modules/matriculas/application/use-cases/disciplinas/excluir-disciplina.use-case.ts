import { Injectable } from '@nestjs/common';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';

@Injectable()
export class ExcluirDisciplinaUseCase {
  constructor(
    private readonly disciplinas: DisciplinaRepository,
    private readonly alunos: AlunoRepository,
    private readonly solicitacoes: SolicitacaoRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const disciplina = await this.disciplinas.findById(id);
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');

    const todas = await this.disciplinas.findAll();
    const dependente = todas.find((d) => d.preRequisitos.includes(id));
    if (dependente) {
      throw new BusinessRuleError(
        `Não é possível excluir: ${dependente.codigo} tem esta disciplina como pré-requisito`,
      );
    }

    const alunos = await this.alunos.findAll();
    if (disciplina.vagasOcupadas > 0 || alunos.some((a) => a.estaMatriculadoEm(id))) {
      throw new BusinessRuleError(
        'Não é possível excluir: há alunos matriculados nesta disciplina',
      );
    }

    const doDisciplina = await this.solicitacoes.findByDisciplinaId(id);
    if (doDisciplina.length > 0) {
      throw new BusinessRuleError(
        doDisciplina.some((s) => s.estaAberta())
          ? 'Não é possível excluir: há solicitações em aberto para esta disciplina'
          : 'Não é possível excluir: há histórico de solicitações desta disciplina (trilha de auditoria preservada)',
      );
    }

    for (const aluno of alunos) {
      if (aluno.disciplinasConcluidas.includes(id)) {
        aluno.removerConcluida(id);
        await this.alunos.save(aluno);
      }
    }
    await this.disciplinas.delete(id);
  }
}

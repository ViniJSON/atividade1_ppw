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

@Injectable()
export class AprovarSolicitacaoUseCase {
  constructor(
    private readonly solicitacoes: SolicitacaoRepository,
    private readonly alunos: AlunoRepository,
    private readonly disciplinas: DisciplinaRepository,
  ) {}

  async execute(id: string): Promise<Solicitacao> {
    const solicitacao = await this.solicitacoes.findById(id);
    if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');
    if (!solicitacao.estaPendente()) {
      throw new BusinessRuleError('Solicitação já foi avaliada');
    }

    const aluno = await this.alunos.findById(solicitacao.alunoId);
    if (!aluno) throw new NotFoundError('Aluno não encontrado');
    const disciplina = await this.disciplinas.findById(
      solicitacao.disciplinaId,
    );
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');

    if (solicitacao.tipo === TipoSolicitacao.MATRICULA) {
      if (aluno.estaMatriculadoEm(disciplina.id)) {
        throw new BusinessRuleError(
          'Aluno já está matriculado nesta disciplina',
        );
      }
      if (!aluno.cumprePreRequisitosDe(disciplina)) {
        throw new BusinessRuleError(
          'Coordenação não pode aprovar: aluno não cumpre os pré-requisitos',
        );
      }
      if (!disciplina.temVaga()) {
        throw new BusinessRuleError(
          'Coordenação não pode aprovar: não há vaga disponível',
        );
      }
      disciplina.ocuparVaga();
      aluno.matricularEm(disciplina.id);
    } else {
      if (!aluno.estaMatriculadoEm(disciplina.id)) {
        throw new BusinessRuleError(
          'Aluno não está matriculado nesta disciplina, não é possível trancar',
        );
      }
      aluno.trancar(disciplina.id);
      disciplina.liberarVaga();
    }

    solicitacao.aprovar();

    await this.disciplinas.save(disciplina);
    await this.alunos.save(aluno);
    await this.solicitacoes.save(solicitacao);
    return solicitacao;
  }
}

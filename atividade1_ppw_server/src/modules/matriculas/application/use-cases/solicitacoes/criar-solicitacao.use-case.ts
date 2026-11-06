import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import { NotFoundError } from '../../../domain/errors/domain.errors';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';
import { avaliarSolicitacao } from '../../../domain/services/avaliar-solicitacao';

export interface CriarSolicitacaoInput {
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
}

@Injectable()
export class CriarSolicitacaoUseCase {
  constructor(
    private readonly solicitacoes: SolicitacaoRepository,
    private readonly alunos: AlunoRepository,
    private readonly disciplinas: DisciplinaRepository,
  ) {}

  async execute(input: CriarSolicitacaoInput): Promise<Solicitacao> {
    const aluno = await this.alunos.findById(input.alunoId);
    if (!aluno) throw new NotFoundError('Aluno não encontrado');
    const disciplina = await this.disciplinas.findById(input.disciplinaId);
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');

    const { preRequisitosOk, vagaDisponivel } = avaliarSolicitacao(
      aluno,
      disciplina,
      input.tipo,
    );

    const solicitacao = new Solicitacao({
      id: randomUUID(),
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

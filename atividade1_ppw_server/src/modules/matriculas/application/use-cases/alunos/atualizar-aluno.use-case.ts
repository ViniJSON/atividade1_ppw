import { Injectable } from '@nestjs/common';
import { Aluno } from '../../../domain/entities/aluno.entity';
import {
  ConflictError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { garantirDisciplinasExistem } from '../../shared/garantir-disciplinas-existem';

export interface AtualizarAlunoInput {
  nome: string;
  matricula: string;
  disciplinasConcluidas?: string[];
}

@Injectable()
export class AtualizarAlunoUseCase {
  constructor(
    private readonly alunos: AlunoRepository,
    private readonly disciplinas: DisciplinaRepository,
  ) {}

  async execute(id: string, input: AtualizarAlunoInput): Promise<Aluno> {
    const aluno = await this.alunos.findById(id);
    if (!aluno) throw new NotFoundError('Aluno não encontrado');

    const matricula = input.matricula.trim();
    const existente = await this.alunos.findByMatricula(matricula);
    if (existente && existente.id !== id) {
      throw new ConflictError(`Já existe um aluno com a matrícula ${matricula}`);
    }
    const concluidas = input.disciplinasConcluidas ?? [];
    await garantirDisciplinasExistem(this.disciplinas, concluidas);

    aluno.atualizar({
      nome: input.nome,
      matricula,
      disciplinasConcluidas: concluidas,
    });
    await this.alunos.save(aluno);
    return aluno;
  }
}

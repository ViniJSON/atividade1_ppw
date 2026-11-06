import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Aluno } from '../../../domain/entities/aluno.entity';
import { ConflictError } from '../../../domain/errors/domain.errors';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { garantirDisciplinasExistem } from '../../shared/garantir-disciplinas-existem';

export interface CriarAlunoInput {
  nome: string;
  matricula: string;
  disciplinasConcluidas?: string[];
}

@Injectable()
export class CriarAlunoUseCase {
  constructor(
    private readonly alunos: AlunoRepository,
    private readonly disciplinas: DisciplinaRepository,
  ) {}

  async execute(input: CriarAlunoInput): Promise<Aluno> {
    const matricula = input.matricula.trim();
    if (await this.alunos.findByMatricula(matricula)) {
      throw new ConflictError(`Já existe um aluno com a matrícula ${matricula}`);
    }
    const concluidas = input.disciplinasConcluidas ?? [];
    await garantirDisciplinasExistem(this.disciplinas, concluidas);

    const aluno = new Aluno({
      id: randomUUID(),
      nome: input.nome,
      matricula,
      disciplinasConcluidas: concluidas,
    });
    await this.alunos.save(aluno);
    return aluno;
  }
}

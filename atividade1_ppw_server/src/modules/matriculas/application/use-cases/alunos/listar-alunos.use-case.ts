import { Injectable } from '@nestjs/common';
import { Aluno } from '../../../domain/entities/aluno.entity';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';

@Injectable()
export class ListarAlunosUseCase {
  constructor(private readonly alunos: AlunoRepository) {}

  execute(): Promise<Aluno[]> {
    return this.alunos.findAll();
  }
}

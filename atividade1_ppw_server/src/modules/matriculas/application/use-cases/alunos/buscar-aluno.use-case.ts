import { Injectable } from '@nestjs/common';
import { Aluno } from '../../../domain/entities/aluno.entity';
import { NotFoundError } from '../../../domain/errors/domain.errors';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';

@Injectable()
export class BuscarAlunoUseCase {
  constructor(private readonly alunos: AlunoRepository) {}

  async execute(id: string): Promise<Aluno> {
    const aluno = await this.alunos.findById(id);
    if (!aluno) throw new NotFoundError('Aluno não encontrado');
    return aluno;
  }
}

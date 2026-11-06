import { Injectable } from '@nestjs/common';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import { NotFoundError } from '../../../domain/errors/domain.errors';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';

@Injectable()
export class BuscarDisciplinaUseCase {
  constructor(private readonly disciplinas: DisciplinaRepository) {}

  async execute(id: string): Promise<Disciplina> {
    const disciplina = await this.disciplinas.findById(id);
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');
    return disciplina;
  }
}

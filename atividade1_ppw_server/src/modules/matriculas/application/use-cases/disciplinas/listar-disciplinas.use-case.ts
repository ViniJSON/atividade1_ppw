import { Injectable } from '@nestjs/common';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';

@Injectable()
export class ListarDisciplinasUseCase {
  constructor(private readonly disciplinas: DisciplinaRepository) {}

  execute(): Promise<Disciplina[]> {
    return this.disciplinas.findAll();
  }
}

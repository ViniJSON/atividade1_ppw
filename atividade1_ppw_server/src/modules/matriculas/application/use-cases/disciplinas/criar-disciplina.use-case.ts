import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import { ConflictError } from '../../../domain/errors/domain.errors';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { garantirDisciplinasExistem } from '../../shared/garantir-disciplinas-existem';

export interface CriarDisciplinaInput {
  codigo: string;
  nome: string;
  vagasTotais: number;
  preRequisitos?: string[];
}

@Injectable()
export class CriarDisciplinaUseCase {
  constructor(private readonly disciplinas: DisciplinaRepository) {}

  async execute(input: CriarDisciplinaInput): Promise<Disciplina> {
    const codigo = Disciplina.normalizarCodigo(input.codigo);
    if (await this.disciplinas.findByCodigo(codigo)) {
      throw new ConflictError(`Já existe uma disciplina com o código ${codigo}`);
    }
    const preRequisitos = input.preRequisitos ?? [];
    await garantirDisciplinasExistem(this.disciplinas, preRequisitos);

    const disciplina = new Disciplina({
      id: randomUUID(),
      codigo,
      nome: input.nome,
      vagasTotais: input.vagasTotais,
      preRequisitos,
    });
    await this.disciplinas.save(disciplina);
    return disciplina;
  }
}

import { Injectable } from '@nestjs/common';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { Horario } from '../../../domain/value-objects/horario';
import { garantirDisciplinasExistem } from '../../shared/garantir-disciplinas-existem';

export interface AtualizarDisciplinaInput {
  codigo: string;
  nome: string;
  vagasTotais: number;
  preRequisitos?: string[];
  horarios?: Horario[];
}

@Injectable()
export class AtualizarDisciplinaUseCase {
  constructor(private readonly disciplinas: DisciplinaRepository) {}

  async execute(
    id: string,
    input: AtualizarDisciplinaInput,
  ): Promise<Disciplina> {
    const disciplina = await this.disciplinas.findById(id);
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');

    const codigo = Disciplina.normalizarCodigo(input.codigo);
    const existente = await this.disciplinas.findByCodigo(codigo);
    if (existente && existente.id !== id) {
      throw new ConflictError(`Já existe uma disciplina com o código ${codigo}`);
    }

    const preRequisitos = input.preRequisitos ?? [];
    await garantirDisciplinasExistem(this.disciplinas, preRequisitos);

    const alcancaveis = await this.disciplinas.preRequisitosTransitivos(preRequisitos);
    if (alcancaveis.has(id)) {
      throw new BusinessRuleError(
        'Os pré-requisitos informados criam uma dependência circular',
      );
    }

    disciplina.atualizar({
      codigo,
      nome: input.nome,
      vagasTotais: input.vagasTotais,
      preRequisitos,
      horarios: input.horarios ?? disciplina.horarios,
    });
    await this.disciplinas.save(disciplina);
    return disciplina;
  }
}

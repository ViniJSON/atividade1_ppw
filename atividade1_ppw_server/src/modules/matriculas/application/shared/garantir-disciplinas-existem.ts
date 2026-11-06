import { BusinessRuleError } from '../../domain/errors/domain.errors';
import { DisciplinaRepository } from '../../domain/repositories/disciplina.repository';

export async function garantirDisciplinasExistem(
  repo: DisciplinaRepository,
  ids: string[],
): Promise<void> {
  for (const id of new Set(ids)) {
    if (!(await repo.findById(id))) {
      throw new BusinessRuleError(`Disciplina "${id}" não existe`);
    }
  }
}

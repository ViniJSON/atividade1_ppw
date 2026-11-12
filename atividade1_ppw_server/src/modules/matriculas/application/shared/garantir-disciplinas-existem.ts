import { BusinessRuleError } from '../../domain/errors/domain.errors';
import { DisciplinaRepository } from '../../domain/repositories/disciplina.repository';

/**
 * Uma única consulta (`findByIds`) em vez de um `findById` por disciplina:
 * a versão anterior fazia N consultas para N ids (N+1).
 */
export async function garantirDisciplinasExistem(
  repo: DisciplinaRepository,
  ids: string[],
): Promise<void> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return;
  const achadas = new Set((await repo.findByIds(unicos)).map((d) => d.id));
  const faltando = unicos.find((id) => !achadas.has(id));
  if (faltando) throw new BusinessRuleError(`Disciplina "${faltando}" não existe`);
}

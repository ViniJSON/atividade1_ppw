import { Disciplina } from '../entities/disciplina.entity';

export abstract class DisciplinaRepository {
  abstract findAll(): Promise<Disciplina[]>;
  abstract findById(id: string): Promise<Disciplina | null>;
  /** Dentro de uma transação, trava a linha até o commit (SELECT … FOR UPDATE). */
  abstract findByIdForUpdate(id: string): Promise<Disciplina | null>;
  /** Busca em lote: UMA consulta para N ids. Ids inexistentes são simplesmente omitidos. */
  abstract findByIds(ids: string[]): Promise<Disciplina[]>;
  abstract findByCodigo(codigo: string): Promise<Disciplina | null>;
  /**
   * Fecho transitivo: os ids informados + todos os pré-requisitos alcançáveis a partir deles.
   * No Postgres é uma única CTE recursiva; serve para detectar ciclos sem carregar o grafo inteiro.
   */
  abstract preRequisitosTransitivos(ids: string[]): Promise<Set<string>>;
  abstract save(disciplina: Disciplina): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

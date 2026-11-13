import { Disciplina } from '../entities/disciplina.entity';

export abstract class DisciplinaRepository {
  abstract findAll(): Promise<Disciplina[]>;
  abstract findById(id: string): Promise<Disciplina | null>;
  abstract findByIdForUpdate(id: string): Promise<Disciplina | null>;
  abstract findByIds(ids: string[]): Promise<Disciplina[]>;
  abstract findByCodigo(codigo: string): Promise<Disciplina | null>;
  abstract preRequisitosTransitivos(ids: string[]): Promise<Set<string>>;
  abstract save(disciplina: Disciplina): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

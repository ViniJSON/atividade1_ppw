import { Disciplina } from '../entities/disciplina.entity';

export abstract class DisciplinaRepository {
  abstract findAll(): Promise<Disciplina[]>;
  abstract findById(id: string): Promise<Disciplina | null>;
  abstract findByCodigo(codigo: string): Promise<Disciplina | null>;
  abstract save(disciplina: Disciplina): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

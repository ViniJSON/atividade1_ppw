import { Aluno } from '../entities/aluno.entity';

export abstract class AlunoRepository {
  abstract findAll(): Promise<Aluno[]>;
  abstract findById(id: string): Promise<Aluno | null>;
  /** Dentro de uma transação, trava a linha até o commit (SELECT … FOR UPDATE). */
  abstract findByIdForUpdate(id: string): Promise<Aluno | null>;
  abstract findByMatricula(matricula: string): Promise<Aluno | null>;
  abstract save(aluno: Aluno): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

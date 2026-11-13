import { Injectable } from '@nestjs/common';
import { Aluno } from '../../../domain/entities/aluno.entity';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';
import { clonar, Restaurar } from './clonar';
import { criarAlunosSeed } from './seed';

@Injectable()
export class InMemoryAlunoRepository extends AlunoRepository {
  private readonly items = new Map<string, Aluno>();

  constructor() {
    super();
    criarAlunosSeed().forEach((a) => this.items.set(a.id, a));
  }

  findAll(): Promise<Aluno[]> {
    return Promise.resolve([...this.items.values()]);
  }

  findById(id: string): Promise<Aluno | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findByIdForUpdate(id: string): Promise<Aluno | null> {
    return this.findById(id);
  }

  findByMatricula(matricula: string): Promise<Aluno | null> {
    const alvo = matricula.trim();
    const achado = [...this.items.values()].find((a) => a.matricula === alvo);
    return Promise.resolve(achado ?? null);
  }

  save(aluno: Aluno): Promise<void> {
    this.items.set(aluno.id, aluno);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.items.delete(id);
    return Promise.resolve();
  }

  snapshot(): Restaurar {
    const copia = new Map([...this.items].map(([k, v]) => [k, clonar(v)] as const));
    return () => {
      this.items.clear();
      copia.forEach((v, k) => this.items.set(k, v));
    };
  }
}

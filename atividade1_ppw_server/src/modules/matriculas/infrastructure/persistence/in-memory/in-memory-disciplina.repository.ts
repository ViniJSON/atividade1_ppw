import { Injectable } from '@nestjs/common';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { criarDisciplinasSeed } from './seed';

@Injectable()
export class InMemoryDisciplinaRepository extends DisciplinaRepository {
  private readonly items = new Map<string, Disciplina>();

  constructor() {
    super();
    criarDisciplinasSeed().forEach((d) => this.items.set(d.id, d));
  }

  findAll(): Promise<Disciplina[]> {
    return Promise.resolve([...this.items.values()]);
  }

  findById(id: string): Promise<Disciplina | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findByCodigo(codigo: string): Promise<Disciplina | null> {
    const alvo = Disciplina.normalizarCodigo(codigo);
    const achada = [...this.items.values()].find((d) => d.codigo === alvo);
    return Promise.resolve(achada ?? null);
  }

  save(disciplina: Disciplina): Promise<void> {
    this.items.set(disciplina.id, disciplina);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.items.delete(id);
    return Promise.resolve();
  }
}

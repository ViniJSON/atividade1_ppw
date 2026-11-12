import { Injectable } from '@nestjs/common';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { clonar, Restaurar } from './clonar';
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

  findByIdForUpdate(id: string): Promise<Disciplina | null> {
    return this.findById(id);
  }

  findByIds(ids: string[]): Promise<Disciplina[]> {
    const achadas: Disciplina[] = [];
    for (const id of new Set(ids)) {
      const d = this.items.get(id);
      if (d) achadas.push(d);
    }
    return Promise.resolve(achadas);
  }

  findByCodigo(codigo: string): Promise<Disciplina | null> {
    const alvo = Disciplina.normalizarCodigo(codigo);
    const achada = [...this.items.values()].find((d) => d.codigo === alvo);
    return Promise.resolve(achada ?? null);
  }

  preRequisitosTransitivos(ids: string[]): Promise<Set<string>> {
    const alcancados = new Set<string>();
    const pilha = [...ids];
    while (pilha.length > 0) {
      const atual = pilha.pop()!;
      if (alcancados.has(atual)) continue;
      alcancados.add(atual);
      pilha.push(...(this.items.get(atual)?.preRequisitos ?? []));
    }
    return Promise.resolve(alcancados);
  }

  save(disciplina: Disciplina): Promise<void> {
    this.items.set(disciplina.id, disciplina);
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

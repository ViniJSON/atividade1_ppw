import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';

@Injectable()
export class InMemorySolicitacaoRepository extends SolicitacaoRepository {
  private readonly items = new Map<string, Solicitacao>();

  findAll(): Promise<Solicitacao[]> {
    return Promise.resolve([...this.items.values()]);
  }

  findById(id: string): Promise<Solicitacao | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findByAlunoId(alunoId: string): Promise<Solicitacao[]> {
    return Promise.resolve(
      [...this.items.values()].filter((s) => s.alunoId === alunoId),
    );
  }

  findByDisciplinaId(disciplinaId: string): Promise<Solicitacao[]> {
    return Promise.resolve(
      [...this.items.values()].filter((s) => s.disciplinaId === disciplinaId),
    );
  }

  save(solicitacao: Solicitacao): Promise<void> {
    this.items.set(solicitacao.id, solicitacao);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.items.delete(id);
    return Promise.resolve();
  }
}

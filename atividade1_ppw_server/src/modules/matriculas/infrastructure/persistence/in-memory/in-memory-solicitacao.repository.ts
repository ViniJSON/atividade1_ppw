import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { STATUS_ABERTOS, STATUS_EM_ATENDIMENTO, StatusSolicitacao, TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';
import { clonar, Restaurar } from './clonar';

@Injectable()
export class InMemorySolicitacaoRepository extends SolicitacaoRepository {
  private readonly items = new Map<string, Solicitacao>();

  findAll(): Promise<Solicitacao[]> {
    return Promise.resolve([...this.items.values()]);
  }

  findById(id: string): Promise<Solicitacao | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findByIdForUpdate(id: string): Promise<Solicitacao | null> {
    return this.findById(id);
  }

  findByAlunoId(alunoId: string): Promise<Solicitacao[]> {
    return Promise.resolve([...this.items.values()].filter((s) => s.alunoId === alunoId));
  }

  findByDisciplinaId(disciplinaId: string): Promise<Solicitacao[]> {
    return Promise.resolve([...this.items.values()].filter((s) => s.disciplinaId === disciplinaId));
  }

  existeAberta(alunoId: string, disciplinaId: string, tipo: TipoSolicitacao): Promise<boolean> {
    return Promise.resolve(
      [...this.items.values()].some(
        (s) =>
          s.alunoId === alunoId &&
          s.disciplinaId === disciplinaId &&
          s.tipo === tipo &&
          STATUS_ABERTOS.includes(s.status),
      ),
    );
  }

  findParaExpirar(agora: Date): Promise<Solicitacao[]> {
    return Promise.resolve(
      [...this.items.values()].filter(
        (s) => STATUS_EM_ATENDIMENTO.includes(s.status) && s.prazoVencido(agora),
      ),
    );
  }

  findParaEscalonar(agora: Date): Promise<Solicitacao[]> {
    const elegiveis = [StatusSolicitacao.PENDENTE, StatusSolicitacao.EM_ANALISE];
    return Promise.resolve(
      [...this.items.values()].filter(
        (s) => elegiveis.includes(s.status) && s.escalonamentoDevido(agora) && !s.prazoVencido(agora),
      ),
    );
  }

  save(solicitacao: Solicitacao): Promise<void> {
    solicitacao.versao += 1;
    this.items.set(solicitacao.id, solicitacao);
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

import { Solicitacao } from '../entities/solicitacao.entity';

export abstract class SolicitacaoRepository {
  abstract findAll(): Promise<Solicitacao[]>;
  abstract findById(id: string): Promise<Solicitacao | null>;
  abstract findByAlunoId(alunoId: string): Promise<Solicitacao[]>;
  abstract findByDisciplinaId(disciplinaId: string): Promise<Solicitacao[]>;
  abstract save(solicitacao: Solicitacao): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

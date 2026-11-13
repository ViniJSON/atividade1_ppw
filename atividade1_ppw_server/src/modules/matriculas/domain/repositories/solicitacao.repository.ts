import { Solicitacao } from '../entities/solicitacao.entity';
import { TipoSolicitacao } from '../enums/solicitacao.enums';

export abstract class SolicitacaoRepository {
  abstract findAll(): Promise<Solicitacao[]>;
  abstract findById(id: string): Promise<Solicitacao | null>;
  abstract findByIdForUpdate(id: string): Promise<Solicitacao | null>;
  abstract findByAlunoId(alunoId: string): Promise<Solicitacao[]>;
  abstract findByDisciplinaId(disciplinaId: string): Promise<Solicitacao[]>;
  abstract existeAberta(alunoId: string, disciplinaId: string, tipo: TipoSolicitacao): Promise<boolean>;
  abstract findParaExpirar(agora: Date): Promise<Solicitacao[]>;
  abstract findParaEscalonar(agora: Date): Promise<Solicitacao[]>;
  abstract save(solicitacao: Solicitacao): Promise<void>;
}

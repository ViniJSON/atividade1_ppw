import { Solicitacao } from '../entities/solicitacao.entity';
import { TipoSolicitacao } from '../enums/solicitacao.enums';

/** Sem `delete`: solicitações têm trilha de auditoria e nunca são apagadas (use CANCELAR). */
export abstract class SolicitacaoRepository {
  abstract findAll(): Promise<Solicitacao[]>;
  abstract findById(id: string): Promise<Solicitacao | null>;
  /** Dentro de uma transação, trava a linha: serializa dois atores agindo na mesma solicitação. */
  abstract findByIdForUpdate(id: string): Promise<Solicitacao | null>;
  abstract findByAlunoId(alunoId: string): Promise<Solicitacao[]>;
  abstract findByDisciplinaId(disciplinaId: string): Promise<Solicitacao[]>;
  /** Existe solicitação aberta (não terminal) para o mesmo aluno/disciplina/tipo? */
  abstract existeAberta(alunoId: string, disciplinaId: string, tipo: TipoSolicitacao): Promise<boolean>;
  /** Em atendimento (PENDENTE/EM_ANALISE/AJUSTE) com `prazoLimite` anterior a `agora`. */
  abstract findParaExpirar(agora: Date): Promise<Solicitacao[]>;
  /** PENDENTE/EM_ANALISE ainda não escalonadas, com `escalonarEm` já passado e prazo ainda válido. */
  abstract findParaEscalonar(agora: Date): Promise<Solicitacao[]>;
  /** Persiste. Lança ConflictError se outra transação alterou a linha (versão desatualizada). */
  abstract save(solicitacao: Solicitacao): Promise<void>;
}

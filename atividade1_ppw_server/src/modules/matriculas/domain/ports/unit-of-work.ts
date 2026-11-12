import { AlunoRepository } from '../repositories/aluno.repository';
import { DisciplinaRepository } from '../repositories/disciplina.repository';
import { HistoricoRepository } from '../repositories/historico.repository';
import { SolicitacaoRepository } from '../repositories/solicitacao.repository';

/** Repositórios vinculados à MESMA transação. */
export interface Repositorios {
  alunos: AlunoRepository;
  disciplinas: DisciplinaRepository;
  solicitacoes: SolicitacaoRepository;
  historico: HistoricoRepository;
}

/**
 * Fronteira transacional (ACID). Tudo que acontece dentro de `run` — mudança de estado,
 * efeito em vaga/matrícula e linha de auditoria — é confirmado junto ou desfeito junto.
 * Se `work` lançar, a transação sofre ROLLBACK e o erro é repropagado.
 */
export abstract class UnitOfWork {
  abstract run<T>(work: (repos: Repositorios) => Promise<T>): Promise<T>;
}

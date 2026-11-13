import { AlunoRepository } from '../repositories/aluno.repository';
import { DisciplinaRepository } from '../repositories/disciplina.repository';
import { HistoricoRepository } from '../repositories/historico.repository';
import { SolicitacaoRepository } from '../repositories/solicitacao.repository';

export interface Repositorios {
  alunos: AlunoRepository;
  disciplinas: DisciplinaRepository;
  solicitacoes: SolicitacaoRepository;
  historico: HistoricoRepository;
}


export abstract class UnitOfWork {
  abstract run<T>(work: (repos: Repositorios) => Promise<T>): Promise<T>;
}

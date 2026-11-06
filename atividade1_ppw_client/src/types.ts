export type TipoSolicitacao = 'MATRICULA' | 'TRANCAMENTO';
export type StatusSolicitacao = 'PENDENTE' | 'APROVADA' | 'REJEITADA';

export interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  disciplinasConcluidas: string[];
  disciplinasAtivas: string[];
}

export interface Disciplina {
  id: string;
  codigo: string;
  nome: string;
  vagasTotais: number;
  vagasOcupadas: number;
  preRequisitos: string[];
}

export interface Solicitacao {
  id: string;
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
  motivoRejeicao?: string;
  criadoEm: string;
  avaliadoEm?: string;
}

export interface AlunoInput {
  nome: string;
  matricula: string;
  disciplinasConcluidas: string[];
}

export interface DisciplinaInput {
  codigo: string;
  nome: string;
  vagasTotais: number;
  preRequisitos: string[];
}

export interface SolicitacaoInput {
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
}

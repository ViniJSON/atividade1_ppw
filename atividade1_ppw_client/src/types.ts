export type TipoSolicitacao = 'MATRICULA' | 'TRANCAMENTO';
export type StatusSolicitacao =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'AJUSTE_SOLICITADO'
  | 'APROVADA'
  | 'CONCLUIDA'
  | 'REJEITADA'
  | 'CANCELADA'
  | 'EXPIRADA'
  | 'ESTORNADA';

/** Eventos que o usuário pode disparar (CRIAR/ESCALONAR/EXPIRAR são internos). */
export type AcaoSolicitacao =
  | 'INICIAR_ANALISE'
  | 'SOLICITAR_AJUSTE'
  | 'REENVIAR'
  | 'APROVAR'
  | 'REJEITAR'
  | 'CONCLUIR'
  | 'CANCELAR'
  | 'ESTORNAR';

export type Papel = 'ALUNO' | 'COORDENADOR' | 'SECRETARIA';

export interface Horario {
  /** 1 = segunda … 7 = domingo */
  dia: number;
  inicio: string;
  fim: string;
}

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
  horarios: Horario[];
}

export interface Solicitacao {
  id: string;
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
  semConflitoHorario: boolean;
  ultimaJustificativa?: string;
  criadoEm: string;
  atualizadoEm: string;
  prazoLimite: string;
  escalonarEm: string;
  escalonadaEm?: string;
  versao: number;
  /** Ações que o perfil atual pode tentar neste estado (vem da máquina de estados do servidor). */
  acoesPermitidas: AcaoSolicitacao[];
}

export interface HistoricoItem {
  id: string;
  idRegistro: string;
  evento: AcaoSolicitacao | 'CRIAR' | 'ESCALONAR' | 'EXPIRAR';
  estadoAnterior: StatusSolicitacao | null;
  novoEstado: StatusSolicitacao;
  autorId: string;
  autorPapel: Papel | 'SISTEMA';
  justificativa: string | null;
  metadados: Record<string, unknown>;
  timestamp: string;
}

export interface ResultadoSla {
  expiradas: string[];
  escalonadas: string[];
  falhas: { id: string; evento: string; erro: string }[];
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
  horarios: Horario[];
}

export interface SolicitacaoInput {
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
}

export enum TipoSolicitacao {
  MATRICULA = 'MATRICULA',
  TRANCAMENTO = 'TRANCAMENTO',
}

export enum StatusSolicitacao {
  PENDENTE = 'PENDENTE',
  EM_ANALISE = 'EM_ANALISE',
  AJUSTE_SOLICITADO = 'AJUSTE_SOLICITADO',
  APROVADA = 'APROVADA',
  CONCLUIDA = 'CONCLUIDA',
  REJEITADA = 'REJEITADA',
  CANCELADA = 'CANCELADA',
  EXPIRADA = 'EXPIRADA',
  ESTORNADA = 'ESTORNADA',
}

/** Ações que movem a solicitação na máquina de estados. Status nunca é editado diretamente. */
export enum EventoSolicitacao {
  CRIAR = 'CRIAR',
  INICIAR_ANALISE = 'INICIAR_ANALISE',
  SOLICITAR_AJUSTE = 'SOLICITAR_AJUSTE',
  REENVIAR = 'REENVIAR',
  APROVAR = 'APROVAR',
  REJEITAR = 'REJEITAR',
  CONCLUIR = 'CONCLUIR',
  CANCELAR = 'CANCELAR',
  ESTORNAR = 'ESTORNAR',
  ESCALONAR = 'ESCALONAR',
  EXPIRAR = 'EXPIRAR',
}

export enum PapelUsuario {
  ALUNO = 'ALUNO',
  COORDENADOR = 'COORDENADOR',
  SECRETARIA = 'SECRETARIA',
  /** Papel interno (job de SLA). Nunca aceito vindo de uma requisição HTTP. */
  SISTEMA = 'SISTEMA',
}

/** Estados em que a solicitação ainda "ocupa" o par (aluno, disciplina, tipo). */
export const STATUS_ABERTOS: readonly StatusSolicitacao[] = [
  StatusSolicitacao.PENDENTE,
  StatusSolicitacao.EM_ANALISE,
  StatusSolicitacao.AJUSTE_SOLICITADO,
  StatusSolicitacao.APROVADA,
];

/** Estados anteriores à aprovação: é onde o relógio do SLA corre. */
export const STATUS_EM_ATENDIMENTO: readonly StatusSolicitacao[] = [
  StatusSolicitacao.PENDENTE,
  StatusSolicitacao.EM_ANALISE,
  StatusSolicitacao.AJUSTE_SOLICITADO,
];

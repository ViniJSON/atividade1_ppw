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
  SISTEMA = 'SISTEMA',
}

export const STATUS_ABERTOS: readonly StatusSolicitacao[] = [
  StatusSolicitacao.PENDENTE,
  StatusSolicitacao.EM_ANALISE,
  StatusSolicitacao.AJUSTE_SOLICITADO,
  StatusSolicitacao.APROVADA,
];

export const STATUS_EM_ATENDIMENTO: readonly StatusSolicitacao[] = [
  StatusSolicitacao.PENDENTE,
  StatusSolicitacao.EM_ANALISE,
  StatusSolicitacao.AJUSTE_SOLICITADO,
];

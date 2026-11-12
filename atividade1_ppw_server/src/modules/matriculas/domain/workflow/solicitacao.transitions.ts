import { EventoSolicitacao as E, PapelUsuario as P, StatusSolicitacao as S } from '../enums/solicitacao.enums';
import {
  ChoqueHorarioGuard,
  EscalonamentoDevidoGuard,
  JustificativaObrigatoriaGuard,
  MatriculadoGuard,
  NaoMatriculadoGuard,
  PrazoNaoVencidoGuard,
  PrazoVencidoGuard,
  PreRequisitosGuard,
  SolicitanteGuard,
  VagaDisponivelGuard,
} from './guards/guards';
import { SlaConfig } from './sla';
import { MANTER_ESTADO, TransitionRule } from './types';

/**
 * ÚNICO lugar onde o fluxo é definido: estados, eventos, matriz RBAC e guardas.
 * Cada guarda é uma instância reutilizável; as de elegibilidade rodam duas vezes de propósito:
 * em APROVAR (decisão da coordenação) e em CONCLUIR (reconferência sob lock, porque o mundo
 * pode ter mudado entre aprovar e efetivar).
 */
export function criarRegrasDeTransicao(sla: SlaConfig): TransitionRule[] {
  const justificativa = new JustificativaObrigatoriaGuard();
  const solicitante = new SolicitanteGuard();
  const prazoNaoVencido = new PrazoNaoVencidoGuard();

  const elegibilidade = [
    new NaoMatriculadoGuard(),
    new MatriculadoGuard(),
    new PreRequisitosGuard(),
    new ChoqueHorarioGuard(),
    new VagaDisponivelGuard(),
  ];

  return [
    {
      evento: E.INICIAR_ANALISE,
      de: [S.PENDENTE],
      para: S.EM_ANALISE,
      papeis: [P.COORDENADOR],
      guards: [prazoNaoVencido],
    },
    {
      evento: E.SOLICITAR_AJUSTE,
      de: [S.PENDENTE, S.EM_ANALISE],
      para: S.AJUSTE_SOLICITADO,
      papeis: [P.COORDENADOR],
      guards: [justificativa],
    },
    {
      evento: E.REENVIAR,
      de: [S.AJUSTE_SOLICITADO],
      para: S.PENDENTE,
      papeis: [P.ALUNO],
      guards: [solicitante, prazoNaoVencido, justificativa],
      aoAplicar: (ctx) => ctx.solicitacao.reiniciarPrazo(ctx.agora, sla),
    },
    {
      evento: E.APROVAR,
      de: [S.EM_ANALISE],
      para: S.APROVADA,
      papeis: [P.COORDENADOR],
      guards: [prazoNaoVencido, ...elegibilidade],
    },
    {
      evento: E.REJEITAR,
      de: [S.PENDENTE, S.EM_ANALISE],
      para: S.REJEITADA,
      papeis: [P.COORDENADOR],
      guards: [justificativa],
    },
    {
      // Separação de funções: quem aprova (coordenação) não é quem efetiva (secretaria).
      evento: E.CONCLUIR,
      de: [S.APROVADA],
      para: S.CONCLUIDA,
      papeis: [P.SECRETARIA],
      guards: elegibilidade,
      efeito: 'EFETIVAR',
    },
    {
      // Cancelamento ANTES da efetivação: nada foi aplicado, então nada há para desfazer.
      evento: E.CANCELAR,
      de: [S.PENDENTE, S.EM_ANALISE, S.AJUSTE_SOLICITADO, S.APROVADA],
      para: S.CANCELADA,
      papeis: [P.ALUNO, P.COORDENADOR],
      guards: [solicitante, justificativa],
    },
    {
      // Cancelamento DEPOIS da efetivação: compensação (devolve vaga / restaura matrícula).
      evento: E.ESTORNAR,
      de: [S.CONCLUIDA],
      para: S.ESTORNADA,
      papeis: [P.COORDENADOR],
      guards: [justificativa],
      efeito: 'REVERTER',
    },
    {
      evento: E.ESCALONAR,
      de: [S.PENDENTE, S.EM_ANALISE],
      para: MANTER_ESTADO,
      papeis: [P.SISTEMA],
      guards: [new EscalonamentoDevidoGuard()],
      aoAplicar: (ctx) => ctx.solicitacao.marcarEscalonada(ctx.agora),
    },
    {
      evento: E.EXPIRAR,
      de: [S.PENDENTE, S.EM_ANALISE, S.AJUSTE_SOLICITADO],
      para: S.EXPIRADA,
      papeis: [P.SISTEMA],
      guards: [new PrazoVencidoGuard()],
    },
  ];
}

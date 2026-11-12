import { Aluno } from '../entities/aluno.entity';
import { Disciplina } from '../entities/disciplina.entity';
import { Solicitacao } from '../entities/solicitacao.entity';
import { EventoSolicitacao, PapelUsuario, StatusSolicitacao } from '../enums/solicitacao.enums';
import { Repositorios } from '../ports/unit-of-work';

export interface Actor {
  id: string;
  papel: PapelUsuario;
}

export const SISTEMA: Actor = { id: 'sistema', papel: PapelUsuario.SISTEMA };

/** Tudo que uma guarda ou um handler precisa saber sobre a transição em curso. */
export interface TransitionContext {
  solicitacao: Solicitacao;
  evento: EventoSolicitacao;
  actor: Actor;
  justificativa?: string;
  agora: Date;
  aluno: Aluno;
  disciplina: Disciplina;
  /** Repositórios da transação corrente: leituras das guardas enxergam o mesmo snapshot/locks. */
  repos: Repositorios;
}

/**
 * Guarda de transição (Transition Guard).
 *
 * Contrato (vale para TODAS as implementações — é o que garante substituição LSP):
 *  - `verificar` é somente leitura: não altera `ctx` nem persiste nada;
 *  - violação ⇒ lança DomainError (GuardViolationError ou ForbiddenError); sucesso ⇒ resolve void;
 *  - `aplicaA` decide se a guarda é relevante ao contexto (ex.: só para MATRICULA).
 */
export interface TransitionGuard {
  readonly nome: string;
  aplicaA(ctx: TransitionContext): boolean;
  verificar(ctx: TransitionContext): Promise<void>;
}

export type EfeitoColateral = 'EFETIVAR' | 'REVERTER';

/** `para: MANTER_ESTADO` = a transição só gera trilha/efeito, sem mudar o status (ex.: ESCALONAR). */
export const MANTER_ESTADO = 'MANTER' as const;

export interface TransitionRule {
  evento: EventoSolicitacao;
  de: readonly StatusSolicitacao[];
  para: StatusSolicitacao | typeof MANTER_ESTADO;
  /** Linha da matriz RBAC: quem pode disparar este evento a partir destes estados. */
  papeis: readonly PapelUsuario[];
  guards: readonly TransitionGuard[];
  /** Efeito colateral em vaga/matrícula, delegado ao handler do tipo da solicitação. */
  efeito?: EfeitoColateral;
  /** Ajustes próprios da entidade (ex.: reiniciar o prazo). Roda dentro da transação. */
  aoAplicar?: (ctx: TransitionContext) => void;
}

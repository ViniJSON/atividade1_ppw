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

export interface TransitionContext {
  solicitacao: Solicitacao;
  evento: EventoSolicitacao;
  actor: Actor;
  justificativa?: string;
  agora: Date;
  aluno: Aluno;
  disciplina: Disciplina;
  repos: Repositorios;
}

export interface TransitionGuard {
  readonly nome: string;
  aplicaA(ctx: TransitionContext): boolean;
  verificar(ctx: TransitionContext): Promise<void>;
}

export type EfeitoColateral = 'EFETIVAR' | 'REVERTER';

export const MANTER_ESTADO = 'MANTER' as const;

export interface TransitionRule {
  evento: EventoSolicitacao;
  de: readonly StatusSolicitacao[];
  para: StatusSolicitacao | typeof MANTER_ESTADO;
  papeis: readonly PapelUsuario[];
  guards: readonly TransitionGuard[];
  efeito?: EfeitoColateral;
  aoAplicar?: (ctx: TransitionContext) => void;
}

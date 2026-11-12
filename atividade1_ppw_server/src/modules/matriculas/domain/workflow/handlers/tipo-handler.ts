import { TipoSolicitacao } from '../../enums/solicitacao.enums';
import { NotFoundError } from '../../errors/domain.errors';
import { TransitionContext } from '../types';

/**
 * Estratégia por tipo de solicitação: o que acontece com vaga e matrícula ao efetivar
 * ou estornar. Adicionar um tipo novo (ex.: TRANSFERENCIA_TURMA) = nova classe + registrar
 * no TipoHandlerRegistry; nem o motor da máquina nem o caso de uso são modificados (OCP).
 *
 * Contrato (LSP): `efetivar` e `reverter` alteram apenas `ctx.aluno` e `ctx.disciplina`
 * (o chamador persiste) e, se não puderem completar, lançam BusinessRuleError SEM deixar
 * os objetos pela metade — qualquer implementação pode substituir outra.
 */
export interface TipoSolicitacaoHandler {
  readonly tipo: TipoSolicitacao;
  efetivar(ctx: TransitionContext): Promise<void>;
  reverter(ctx: TransitionContext): Promise<void>;
}

export class TipoHandlerRegistry {
  private readonly porTipo = new Map<TipoSolicitacao, TipoSolicitacaoHandler>();

  constructor(handlers: readonly TipoSolicitacaoHandler[]) {
    handlers.forEach((h) => this.porTipo.set(h.tipo, h));
  }

  para(tipo: TipoSolicitacao): TipoSolicitacaoHandler {
    const handler = this.porTipo.get(tipo);
    if (!handler) throw new NotFoundError(`Não há handler para o tipo ${tipo}`);
    return handler;
  }
}

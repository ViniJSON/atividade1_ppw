import { PapelUsuario, TipoSolicitacao } from '../../enums/solicitacao.enums';
import { ForbiddenError, GuardViolationError } from '../../errors/domain.errors';
import { encontrarConflitos } from '../../services/choque-horario';
import { descreverHorario } from '../../value-objects/horario';
import { TransitionContext } from '../types';
import { BaseGuard } from './base.guard';

// Cada guarda tem UMA responsabilidade (SRP) e nenhuma conhece a máquina de estados:
// elas só recebem o contexto e lançam erro se a regra for violada.

/** Eventos sensíveis exigem justificativa (vai para a trilha de auditoria). */
export class JustificativaObrigatoriaGuard extends BaseGuard {
  readonly nome = 'justificativa-obrigatoria';
  verificar(ctx: TransitionContext): Promise<void> {
    if (!ctx.justificativa?.trim()) {
      throw new GuardViolationError(this.nome, `A ação ${ctx.evento} exige justificativa`);
    }
    return Promise.resolve();
  }
}

/** Um aluno só age sobre as próprias solicitações; coordenação/secretaria não têm essa restrição. */
export class SolicitanteGuard extends BaseGuard {
  readonly nome = 'solicitante';
  aplicaA(ctx: TransitionContext): boolean {
    return ctx.actor.papel === PapelUsuario.ALUNO;
  }
  verificar(ctx: TransitionContext): Promise<void> {
    if (ctx.actor.id !== ctx.solicitacao.alunoId) {
      throw new ForbiddenError('Um aluno só pode agir sobre as próprias solicitações');
    }
    return Promise.resolve();
  }
}

export class PrazoNaoVencidoGuard extends BaseGuard {
  readonly nome = 'prazo-nao-vencido';
  verificar(ctx: TransitionContext): Promise<void> {
    if (ctx.solicitacao.prazoVencido(ctx.agora)) {
      throw new GuardViolationError(
        this.nome,
        'O prazo de atendimento (SLA) desta solicitação venceu; ela será expirada',
      );
    }
    return Promise.resolve();
  }
}

/** EXPIRAR só vale se o prazo realmente venceu: nem o sistema expira antes da hora. */
export class PrazoVencidoGuard extends BaseGuard {
  readonly nome = 'prazo-vencido';
  verificar(ctx: TransitionContext): Promise<void> {
    if (!ctx.solicitacao.prazoVencido(ctx.agora)) {
      throw new GuardViolationError(this.nome, 'O prazo da solicitação ainda não venceu');
    }
    return Promise.resolve();
  }
}

export class EscalonamentoDevidoGuard extends BaseGuard {
  readonly nome = 'escalonamento-devido';
  verificar(ctx: TransitionContext): Promise<void> {
    if (!ctx.solicitacao.escalonamentoDevido(ctx.agora)) {
      throw new GuardViolationError(this.nome, 'A solicitação não está elegível a escalonamento');
    }
    return Promise.resolve();
  }
}

const ehMatricula = (ctx: TransitionContext) => ctx.solicitacao.tipo === TipoSolicitacao.MATRICULA;
const ehTrancamento = (ctx: TransitionContext) => ctx.solicitacao.tipo === TipoSolicitacao.TRANCAMENTO;

export class NaoMatriculadoGuard extends BaseGuard {
  readonly nome = 'nao-matriculado';
  aplicaA(ctx: TransitionContext): boolean {
    return ehMatricula(ctx);
  }
  verificar(ctx: TransitionContext): Promise<void> {
    if (ctx.aluno.estaMatriculadoEm(ctx.disciplina.id)) {
      throw new GuardViolationError(this.nome, 'Aluno já está matriculado nesta disciplina');
    }
    return Promise.resolve();
  }
}

export class MatriculadoGuard extends BaseGuard {
  readonly nome = 'matriculado';
  aplicaA(ctx: TransitionContext): boolean {
    return ehTrancamento(ctx);
  }
  verificar(ctx: TransitionContext): Promise<void> {
    if (!ctx.aluno.estaMatriculadoEm(ctx.disciplina.id)) {
      throw new GuardViolationError(
        this.nome,
        'Aluno não está matriculado nesta disciplina, não é possível trancar',
      );
    }
    return Promise.resolve();
  }
}

/**
 * Pré-requisitos sem N+1: a disciplina já traz `preRequisitos` (ids) e o aluno traz
 * `disciplinasConcluidas`; o cruzamento é em memória. Só quando há faltantes é feita
 * UMA consulta em lote (findByIds) para nomear o que falta na mensagem.
 */
export class PreRequisitosGuard extends BaseGuard {
  readonly nome = 'pre-requisitos';
  aplicaA(ctx: TransitionContext): boolean {
    return ehMatricula(ctx);
  }
  async verificar(ctx: TransitionContext): Promise<void> {
    const concluidas = new Set(ctx.aluno.disciplinasConcluidas);
    const faltantes = ctx.disciplina.preRequisitos.filter((id) => !concluidas.has(id));
    if (faltantes.length === 0) return;
    const nomes = (await ctx.repos.disciplinas.findByIds(faltantes)).map((d) => d.codigo).sort();
    throw new GuardViolationError(
      this.nome,
      `Coordenação não pode aprovar: aluno não cumpre os pré-requisitos (faltam: ${nomes.join(', ') || faltantes.join(', ')})`,
    );
  }
}

/** Choque de horário na grade semanal: a grade ativa do aluno é carregada em UMA consulta. */
export class ChoqueHorarioGuard extends BaseGuard {
  readonly nome = 'choque-horario';
  aplicaA(ctx: TransitionContext): boolean {
    return ehMatricula(ctx);
  }
  async verificar(ctx: TransitionContext): Promise<void> {
    if (ctx.aluno.disciplinasAtivas.length === 0 || ctx.disciplina.horarios.length === 0) return;
    const ativas = await ctx.repos.disciplinas.findByIds(ctx.aluno.disciplinasAtivas);
    const conflitos = encontrarConflitos(ctx.disciplina, ativas);
    if (conflitos.length > 0) {
      const c = conflitos[0];
      throw new GuardViolationError(
        this.nome,
        `Choque de horário com ${c.disciplina.codigo} (${descreverHorario(c.existente)} × ${descreverHorario(c.candidato)})`,
      );
    }
  }
}

export class VagaDisponivelGuard extends BaseGuard {
  readonly nome = 'vaga-disponivel';
  aplicaA(ctx: TransitionContext): boolean {
    return ehMatricula(ctx);
  }
  verificar(ctx: TransitionContext): Promise<void> {
    if (!ctx.disciplina.temVaga()) {
      throw new GuardViolationError(this.nome, 'Coordenação não pode aprovar: não há vaga disponível');
    }
    return Promise.resolve();
  }
}

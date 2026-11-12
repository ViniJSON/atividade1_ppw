import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { EventoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import { NotFoundError } from '../../../domain/errors/domain.errors';
import { Clock } from '../../../domain/ports/clock';
import { UnitOfWork } from '../../../domain/ports/unit-of-work';
import { TipoHandlerRegistry } from '../../../domain/workflow/handlers/tipo-handler';
import { SolicitacaoStateMachine } from '../../../domain/workflow/solicitacao.state-machine';
import { Actor, MANTER_ESTADO, TransitionContext } from '../../../domain/workflow/types';

export interface TransicionarInput {
  solicitacaoId: string;
  evento: EventoSolicitacao;
  actor: Actor;
  justificativa?: string;
}

/**
 * ÚNICO caminho para mudar o status de uma solicitação. Responsabilidade (SRP): orquestrar
 * "carregar → autorizar → guardar → aplicar efeito → mudar estado → auditar" dentro de UMA
 * transação. Não contém nenhuma regra de negócio específica: elas vêm da tabela de regras
 * (state machine), das guardas e dos handlers por tipo.
 *
 * Ordem de aquisição de locks (sempre a mesma, para evitar deadlock entre transações):
 *   solicitação → disciplina → aluno.
 */
@Injectable()
export class TransicionarSolicitacaoUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly maquina: SolicitacaoStateMachine,
    private readonly handlers: TipoHandlerRegistry,
  ) {}

  execute(input: TransicionarInput): Promise<Solicitacao> {
    return this.uow.run(async (repos) => {
      const solicitacao = await repos.solicitacoes.findByIdForUpdate(input.solicitacaoId);
      if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');

      const regra = this.maquina.resolver(solicitacao.status, input.evento, input.actor.papel);

      // Só trava disciplina/aluno quando a transição tem efeito sobre vaga/matrícula.
      const comEfeito = regra.efeito !== undefined;
      const disciplina = comEfeito
        ? await repos.disciplinas.findByIdForUpdate(solicitacao.disciplinaId)
        : await repos.disciplinas.findById(solicitacao.disciplinaId);
      if (!disciplina) throw new NotFoundError('Disciplina não encontrada');
      const aluno = comEfeito
        ? await repos.alunos.findByIdForUpdate(solicitacao.alunoId)
        : await repos.alunos.findById(solicitacao.alunoId);
      if (!aluno) throw new NotFoundError('Aluno não encontrado');

      const agora = this.clock.now();
      const justificativa = input.justificativa?.trim() || undefined;
      const ctx: TransitionContext = {
        solicitacao,
        evento: input.evento,
        actor: input.actor,
        justificativa,
        agora,
        aluno,
        disciplina,
        repos,
      };

      for (const guarda of regra.guards) {
        if (guarda.aplicaA(ctx)) await guarda.verificar(ctx);
      }

      if (regra.efeito) {
        const handler = this.handlers.para(solicitacao.tipo);
        if (regra.efeito === 'EFETIVAR') await handler.efetivar(ctx);
        else await handler.reverter(ctx);
        await repos.disciplinas.save(disciplina);
        await repos.alunos.save(aluno);
      }

      const estadoAnterior = solicitacao.status;
      const novoEstado = regra.para === MANTER_ESTADO ? estadoAnterior : regra.para;
      solicitacao.transitarPara(novoEstado, agora, justificativa);
      regra.aoAplicar?.(ctx);
      await repos.solicitacoes.save(solicitacao);

      // Mesma transação: se esta linha falhar, o efeito em vaga/matrícula e o novo estado são desfeitos.
      await repos.historico.registrar({
        idRegistro: solicitacao.id,
        evento: input.evento,
        estadoAnterior,
        novoEstado,
        autorId: input.actor.id,
        autorPapel: input.actor.papel,
        justificativa: justificativa ?? null,
        metadados: {
          tipo: solicitacao.tipo,
          alunoId: aluno.id,
          disciplinaId: disciplina.id,
          ...(regra.efeito ? { efeito: regra.efeito, vagasOcupadasApos: disciplina.vagasOcupadas } : {}),
        },
        timestamp: agora.toISOString(),
      });

      return solicitacao;
    });
  }
}

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { EventoSolicitacao, PapelUsuario, TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../domain/errors/domain.errors';
import { Clock } from '../../../domain/ports/clock';
import { UnitOfWork } from '../../../domain/ports/unit-of-work';
import { avaliarSolicitacao } from '../../../domain/services/avaliar-solicitacao';
import { SlaConfig } from '../../../domain/workflow/sla';
import { Actor } from '../../../domain/workflow/types';

export interface CriarSolicitacaoInput {
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
}

@Injectable()
export class CriarSolicitacaoUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly sla: SlaConfig,
  ) {}

  async execute(input: CriarSolicitacaoInput, actor: Actor): Promise<Solicitacao> {
    const permitido =
      actor.papel === PapelUsuario.SECRETARIA ||
      (actor.papel === PapelUsuario.ALUNO && actor.id === input.alunoId);
    if (!permitido) {
      throw new ForbiddenError('Somente o próprio aluno ou a secretaria podem registrar a solicitação');
    }

    return this.uow.run(async (repos) => {
      const aluno = await repos.alunos.findById(input.alunoId);
      if (!aluno) throw new NotFoundError('Aluno não encontrado');
      const disciplina = await repos.disciplinas.findById(input.disciplinaId);
      if (!disciplina) throw new NotFoundError('Disciplina não encontrada');

      const ativas = await repos.disciplinas.findByIds(aluno.disciplinasAtivas);
      const indicadores = avaliarSolicitacao(aluno, disciplina, input.tipo, ativas);

      if (await repos.solicitacoes.existeAberta(aluno.id, disciplina.id, input.tipo)) {
        throw new ConflictError('Já existe uma solicitação em aberto para este aluno, disciplina e tipo');
      }

      const agora = this.clock.now();
      const solicitacao = Solicitacao.abrir(
        { id: randomUUID(), alunoId: aluno.id, disciplinaId: disciplina.id, tipo: input.tipo, ...indicadores },
        agora,
        this.sla,
      );
      await repos.solicitacoes.save(solicitacao);
      await repos.historico.registrar({
        idRegistro: solicitacao.id,
        evento: EventoSolicitacao.CRIAR,
        estadoAnterior: null,
        novoEstado: solicitacao.status,
        autorId: actor.id,
        autorPapel: actor.papel,
        justificativa: null,
        metadados: { tipo: solicitacao.tipo, alunoId: aluno.id, disciplinaId: disciplina.id },
        timestamp: agora.toISOString(),
      });
      return solicitacao;
    });
  }
}

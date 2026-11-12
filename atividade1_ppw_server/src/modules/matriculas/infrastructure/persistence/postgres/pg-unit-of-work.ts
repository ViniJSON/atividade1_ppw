import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../domain/errors/domain.errors';
import { Repositorios, UnitOfWork } from '../../../domain/ports/unit-of-work';
import { PgAlunoRepository } from './pg-aluno.repository';
import { PgDisciplinaRepository } from './pg-disciplina.repository';
import { PgExecutor, traduzirErroPg } from './pg-executor';
import { PgHistoricoRepository } from './pg-historico.repository';
import { PgPool } from './pg-pool';
import { PgSolicitacaoRepository } from './pg-solicitacao.repository';

/**
 * Transação ACID de verdade: BEGIN → work(repos ligados ao MESMO client) → COMMIT, ou ROLLBACK
 * se qualquer coisa lançar. Nível de isolamento READ COMMITTED (padrão) + travas de linha
 * (`FOR UPDATE`) nos pontos críticos: solicitação, disciplina e aluno, sempre nessa ordem.
 */
@Injectable()
export class PgUnitOfWork extends UnitOfWork {
  constructor(private readonly db: PgPool) {
    super();
  }

  async run<T>(work: (repos: Repositorios) => Promise<T>): Promise<T> {
    const client = await this.db.pool.connect();
    const exec = new PgExecutor(client, true);
    try {
      await client.query('BEGIN');
      const resultado = await work({
        alunos: new PgAlunoRepository(exec),
        disciplinas: new PgDisciplinaRepository(exec),
        solicitacoes: new PgSolicitacaoRepository(exec),
        historico: new PgHistoricoRepository(exec),
      });
      await client.query('COMMIT');
      return resultado;
    } catch (erro) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw erro instanceof DomainError ? erro : traduzirErroPg(erro);
    } finally {
      client.release();
    }
  }
}

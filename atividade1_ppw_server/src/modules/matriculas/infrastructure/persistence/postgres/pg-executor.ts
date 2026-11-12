import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { BusinessRuleError, ConflictError } from '../../../domain/errors/domain.errors';

/** Traduz erros do Postgres (SQLSTATE) para erros de domínio, mantendo o domínio livre de `pg`. */
export function traduzirErroPg(erro: unknown): unknown {
  const e = erro as { code?: unknown; constraint?: string; message?: string };
  if (typeof e?.code !== 'string' || e.code.length !== 5) return erro;
  switch (e.code) {
    case '23505': // unique_violation
      if (e.constraint === 'uq_solicitacao_aberta') {
        return new ConflictError('Já existe uma solicitação em aberto para este aluno, disciplina e tipo');
      }
      if (e.constraint === 'alunos_matricula_key') return new ConflictError('Já existe um aluno com esta matrícula');
      if (e.constraint === 'disciplinas_codigo_key') return new ConflictError('Já existe uma disciplina com este código');
      return new ConflictError('Registro duplicado');
    case '23514': // check_violation
      return new BusinessRuleError(
        e.constraint === 'ck_vagas' ? 'Não há vaga disponível' : 'Operação viola uma regra de integridade do banco',
      );
    case '23503': // foreign_key_violation
      return new BusinessRuleError('Operação viola um vínculo existente (chave estrangeira)');
    case '40001': // serialization_failure
    case '40P01': // deadlock_detected
      return new ConflictError('Conflito de concorrência; tente novamente');
    case 'P0001': // RAISE EXCEPTION (ex.: trigger da trilha imutável)
      return new BusinessRuleError(e.message ?? 'Operação rejeitada pelo banco');
    default:
      return erro;
  }
}

/**
 * Executor de SQL. Sobre um Pool, cada `query` roda em autocommit e `atomicamente` abre uma
 * transação própria; sobre um client já em transação (Unit of Work), tudo participa dela.
 */
export class PgExecutor {
  constructor(
    private readonly alvo: Pool | PoolClient,
    private readonly emTransacao = false,
  ) {}

  async query<R extends QueryResultRow = QueryResultRow>(
    texto: string,
    params: unknown[] = [],
  ): Promise<QueryResult<R>> {
    try {
      return await this.alvo.query<R>(texto, params);
    } catch (erro) {
      throw traduzirErroPg(erro);
    }
  }

  /** Várias instruções que precisam ser atômicas (ex.: upsert + sincronizar tabelas filhas). */
  async atomicamente<T>(fn: (exec: PgExecutor) => Promise<T>): Promise<T> {
    if (this.emTransacao) return fn(this);
    const client = await (this.alvo as Pool).connect();
    const tx = new PgExecutor(client, true);
    try {
      await client.query('BEGIN');
      const resultado = await fn(tx);
      await client.query('COMMIT');
      return resultado;
    } catch (erro) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw erro;
    } finally {
      client.release();
    }
  }
}

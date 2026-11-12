import { Injectable } from '@nestjs/common';
import { Repositorios, UnitOfWork } from '../../../domain/ports/unit-of-work';
import { InMemoryAlunoRepository } from './in-memory-aluno.repository';
import { InMemoryDisciplinaRepository } from './in-memory-disciplina.repository';
import { InMemoryHistoricoRepository } from './in-memory-historico.repository';
import { InMemorySolicitacaoRepository } from './in-memory-solicitacao.repository';

/**
 * Simula as garantias do banco para rodar sem Postgres (testes e modo `PERSISTENCE=memory`):
 *  - Atomicidade/Isolamento: transações executam UMA POR VEZ (fila), equivalente ao nível
 *    SERIALIZABLE — mais forte que os row locks usados no Postgres, o que é suficiente para o teste.
 *  - Rollback: antes de executar tira um snapshot de todos os repositórios e o restaura se
 *    `work` lançar, desfazendo mudanças parciais (vaga ocupada, matrícula, estado, histórico).
 * Obs.: JS é single-thread, mas `await` cede o controle; sem a fila, duas corrotinas poderiam
 * intercalar entre "checa vaga" e "ocupa vaga" — exatamente a corrida que o lock evita no banco.
 */
@Injectable()
export class InMemoryUnitOfWork extends UnitOfWork {
  private fila: Promise<void> = Promise.resolve();

  constructor(
    private readonly alunos: InMemoryAlunoRepository,
    private readonly disciplinas: InMemoryDisciplinaRepository,
    private readonly solicitacoes: InMemorySolicitacaoRepository,
    private readonly historico: InMemoryHistoricoRepository,
  ) {
    super();
  }

  async run<T>(work: (repos: Repositorios) => Promise<T>): Promise<T> {
    const liberar = await this.entrarNaFila();
    const restaurar = [this.alunos, this.disciplinas, this.solicitacoes, this.historico].map((r) =>
      r.snapshot(),
    );
    try {
      return await work({
        alunos: this.alunos,
        disciplinas: this.disciplinas,
        solicitacoes: this.solicitacoes,
        historico: this.historico,
      });
    } catch (erro) {
      restaurar.forEach((desfazer) => desfazer());
      throw erro;
    } finally {
      liberar();
    }
  }

  private entrarNaFila(): Promise<() => void> {
    let liberar!: () => void;
    const anterior = this.fila;
    this.fila = new Promise<void>((resolve) => (liberar = resolve));
    return anterior.then(() => liberar);
  }
}

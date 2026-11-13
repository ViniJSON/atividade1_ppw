import { Module, Provider } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AtualizarAlunoUseCase } from './application/use-cases/alunos/atualizar-aluno.use-case';
import { BuscarAlunoUseCase } from './application/use-cases/alunos/buscar-aluno.use-case';
import { CriarAlunoUseCase } from './application/use-cases/alunos/criar-aluno.use-case';
import { ExcluirAlunoUseCase } from './application/use-cases/alunos/excluir-aluno.use-case';
import { ListarAlunosUseCase } from './application/use-cases/alunos/listar-alunos.use-case';
import { AtualizarDisciplinaUseCase } from './application/use-cases/disciplinas/atualizar-disciplina.use-case';
import { BuscarDisciplinaUseCase } from './application/use-cases/disciplinas/buscar-disciplina.use-case';
import { CriarDisciplinaUseCase } from './application/use-cases/disciplinas/criar-disciplina.use-case';
import { ExcluirDisciplinaUseCase } from './application/use-cases/disciplinas/excluir-disciplina.use-case';
import { ListarDisciplinasUseCase } from './application/use-cases/disciplinas/listar-disciplinas.use-case';
import { BuscarSolicitacaoUseCase } from './application/use-cases/solicitacoes/buscar-solicitacao.use-case';
import { CriarSolicitacaoUseCase } from './application/use-cases/solicitacoes/criar-solicitacao.use-case';
import { ListarHistoricoUseCase } from './application/use-cases/solicitacoes/listar-historico.use-case';
import { ListarSolicitacoesUseCase } from './application/use-cases/solicitacoes/listar-solicitacoes.use-case';
import { ProcessarSlaUseCase } from './application/use-cases/solicitacoes/processar-sla.use-case';
import { TransicionarSolicitacaoUseCase } from './application/use-cases/solicitacoes/transicionar-solicitacao.use-case';
import { Clock } from './domain/ports/clock';
import { UnitOfWork } from './domain/ports/unit-of-work';
import { AlunoRepository } from './domain/repositories/aluno.repository';
import { DisciplinaRepository } from './domain/repositories/disciplina.repository';
import { HistoricoRepository } from './domain/repositories/historico.repository';
import { SolicitacaoRepository } from './domain/repositories/solicitacao.repository';
import { MatriculaHandler } from './domain/workflow/handlers/matricula.handler';
import { TipoHandlerRegistry } from './domain/workflow/handlers/tipo-handler';
import { TrancamentoHandler } from './domain/workflow/handlers/trancamento.handler';
import { SlaConfig } from './domain/workflow/sla';
import { SolicitacaoStateMachine } from './domain/workflow/solicitacao.state-machine';
import { criarRegrasDeTransicao } from './domain/workflow/solicitacao.transitions';
import { InMemoryAlunoRepository } from './infrastructure/persistence/in-memory/in-memory-aluno.repository';
import { InMemoryDisciplinaRepository } from './infrastructure/persistence/in-memory/in-memory-disciplina.repository';
import { InMemoryHistoricoRepository } from './infrastructure/persistence/in-memory/in-memory-historico.repository';
import { InMemorySolicitacaoRepository } from './infrastructure/persistence/in-memory/in-memory-solicitacao.repository';
import { InMemoryUnitOfWork } from './infrastructure/persistence/in-memory/in-memory-unit-of-work';
import { PgAlunoRepository } from './infrastructure/persistence/postgres/pg-aluno.repository';
import { PgDisciplinaRepository } from './infrastructure/persistence/postgres/pg-disciplina.repository';
import { PgExecutor } from './infrastructure/persistence/postgres/pg-executor';
import { PgHistoricoRepository } from './infrastructure/persistence/postgres/pg-historico.repository';
import { PgPool } from './infrastructure/persistence/postgres/pg-pool';
import { PgSolicitacaoRepository } from './infrastructure/persistence/postgres/pg-solicitacao.repository';
import { PgUnitOfWork } from './infrastructure/persistence/postgres/pg-unit-of-work';
import { SlaScheduler } from './infrastructure/scheduling/sla.scheduler';
import { SystemClock } from './infrastructure/system-clock';
import { AlunosController } from './presentation/http/controllers/alunos.controller';
import { DisciplinasController } from './presentation/http/controllers/disciplinas.controller';
import { SolicitacoesController } from './presentation/http/controllers/solicitacoes.controller';
import { DomainExceptionFilter } from './presentation/http/filters/domain-exception.filter';

const useCases = [
  ListarAlunosUseCase,
  BuscarAlunoUseCase,
  CriarAlunoUseCase,
  AtualizarAlunoUseCase,
  ExcluirAlunoUseCase,
  ListarDisciplinasUseCase,
  BuscarDisciplinaUseCase,
  CriarDisciplinaUseCase,
  AtualizarDisciplinaUseCase,
  ExcluirDisciplinaUseCase,
  ListarSolicitacoesUseCase,
  BuscarSolicitacaoUseCase,
  CriarSolicitacaoUseCase,
  TransicionarSolicitacaoUseCase,
  ListarHistoricoUseCase,
  ProcessarSlaUseCase,
];

const persistencia: Provider[] =
  process.env.PERSISTENCE === 'postgres'
    ? [
        PgPool,
        { provide: PgExecutor, useFactory: (db: PgPool) => new PgExecutor(db.pool), inject: [PgPool] },
        { provide: AlunoRepository, useFactory: (e: PgExecutor) => new PgAlunoRepository(e), inject: [PgExecutor] },
        { provide: DisciplinaRepository, useFactory: (e: PgExecutor) => new PgDisciplinaRepository(e), inject: [PgExecutor] },
        { provide: SolicitacaoRepository, useFactory: (e: PgExecutor) => new PgSolicitacaoRepository(e), inject: [PgExecutor] },
        { provide: HistoricoRepository, useFactory: (e: PgExecutor) => new PgHistoricoRepository(e), inject: [PgExecutor] },
        { provide: UnitOfWork, useClass: PgUnitOfWork },
      ]
    : [
        InMemoryAlunoRepository,
        InMemoryDisciplinaRepository,
        InMemorySolicitacaoRepository,
        InMemoryHistoricoRepository,
        InMemoryUnitOfWork,
        { provide: AlunoRepository, useExisting: InMemoryAlunoRepository },
        { provide: DisciplinaRepository, useExisting: InMemoryDisciplinaRepository },
        { provide: SolicitacaoRepository, useExisting: InMemorySolicitacaoRepository },
        { provide: HistoricoRepository, useExisting: InMemoryHistoricoRepository },
        { provide: UnitOfWork, useExisting: InMemoryUnitOfWork },
      ];

@Module({
  controllers: [AlunosController, DisciplinasController, SolicitacoesController],
  providers: [
    ...persistencia,
    { provide: Clock, useClass: SystemClock },
    {
      provide: SlaConfig,
      useFactory: () =>
        new SlaConfig(
          Number(process.env.SLA_PRAZO_DIAS ?? 7),
          Number(process.env.SLA_ESCALONAMENTO_DIAS ?? 3),
        ),
    },
    {
      provide: SolicitacaoStateMachine,
      useFactory: (sla: SlaConfig) => new SolicitacaoStateMachine(criarRegrasDeTransicao(sla)),
      inject: [SlaConfig],
    },
    {
      provide: TipoHandlerRegistry,
      useFactory: () => new TipoHandlerRegistry([new MatriculaHandler(), new TrancamentoHandler()]),
    },
    ...useCases,
    SlaScheduler,
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class MatriculasModule {}

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AlunoRepository } from './domain/repositories/aluno.repository';
import { DisciplinaRepository } from './domain/repositories/disciplina.repository';
import { SolicitacaoRepository } from './domain/repositories/solicitacao.repository';
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
import { AprovarSolicitacaoUseCase } from './application/use-cases/solicitacoes/aprovar-solicitacao.use-case';
import { AtualizarSolicitacaoUseCase } from './application/use-cases/solicitacoes/atualizar-solicitacao.use-case';
import { BuscarSolicitacaoUseCase } from './application/use-cases/solicitacoes/buscar-solicitacao.use-case';
import { CriarSolicitacaoUseCase } from './application/use-cases/solicitacoes/criar-solicitacao.use-case';
import { ExcluirSolicitacaoUseCase } from './application/use-cases/solicitacoes/excluir-solicitacao.use-case';
import { ListarSolicitacoesUseCase } from './application/use-cases/solicitacoes/listar-solicitacoes.use-case';
import { RejeitarSolicitacaoUseCase } from './application/use-cases/solicitacoes/rejeitar-solicitacao.use-case';
import { InMemoryAlunoRepository } from './infrastructure/persistence/in-memory/in-memory-aluno.repository';
import { InMemoryDisciplinaRepository } from './infrastructure/persistence/in-memory/in-memory-disciplina.repository';
import { InMemorySolicitacaoRepository } from './infrastructure/persistence/in-memory/in-memory-solicitacao.repository';
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
  AtualizarSolicitacaoUseCase,
  ExcluirSolicitacaoUseCase,
  AprovarSolicitacaoUseCase,
  RejeitarSolicitacaoUseCase,
];

@Module({
  controllers: [AlunosController, DisciplinasController, SolicitacoesController],
  providers: [
    { provide: AlunoRepository, useClass: InMemoryAlunoRepository },
    { provide: DisciplinaRepository, useClass: InMemoryDisciplinaRepository },
    { provide: SolicitacaoRepository, useClass: InMemorySolicitacaoRepository },
    ...useCases,
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class MatriculasModule {}

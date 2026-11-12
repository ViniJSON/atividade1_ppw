import { AtualizarAlunoUseCase } from '../application/use-cases/alunos/atualizar-aluno.use-case';
import { CriarAlunoUseCase } from '../application/use-cases/alunos/criar-aluno.use-case';
import { ExcluirAlunoUseCase } from '../application/use-cases/alunos/excluir-aluno.use-case';
import { AtualizarDisciplinaUseCase } from '../application/use-cases/disciplinas/atualizar-disciplina.use-case';
import { CriarDisciplinaUseCase } from '../application/use-cases/disciplinas/criar-disciplina.use-case';
import { ExcluirDisciplinaUseCase } from '../application/use-cases/disciplinas/excluir-disciplina.use-case';
import { BuscarSolicitacaoUseCase } from '../application/use-cases/solicitacoes/buscar-solicitacao.use-case';
import { CriarSolicitacaoUseCase } from '../application/use-cases/solicitacoes/criar-solicitacao.use-case';
import { ListarHistoricoUseCase } from '../application/use-cases/solicitacoes/listar-historico.use-case';
import { ListarSolicitacoesUseCase } from '../application/use-cases/solicitacoes/listar-solicitacoes.use-case';
import { ProcessarSlaUseCase } from '../application/use-cases/solicitacoes/processar-sla.use-case';
import { TransicionarSolicitacaoUseCase } from '../application/use-cases/solicitacoes/transicionar-solicitacao.use-case';
import { EventoSolicitacao, PapelUsuario } from '../domain/enums/solicitacao.enums';
import { Solicitacao } from '../domain/entities/solicitacao.entity';
import { MatriculaHandler } from '../domain/workflow/handlers/matricula.handler';
import { TipoHandlerRegistry } from '../domain/workflow/handlers/tipo-handler';
import { TrancamentoHandler } from '../domain/workflow/handlers/trancamento.handler';
import { SlaConfig } from '../domain/workflow/sla';
import { SolicitacaoStateMachine } from '../domain/workflow/solicitacao.state-machine';
import { criarRegrasDeTransicao } from '../domain/workflow/solicitacao.transitions';
import { Actor, TransitionRule } from '../domain/workflow/types';
import { InMemoryAlunoRepository } from '../infrastructure/persistence/in-memory/in-memory-aluno.repository';
import { InMemoryDisciplinaRepository } from '../infrastructure/persistence/in-memory/in-memory-disciplina.repository';
import { InMemoryHistoricoRepository } from '../infrastructure/persistence/in-memory/in-memory-historico.repository';
import { InMemorySolicitacaoRepository } from '../infrastructure/persistence/in-memory/in-memory-solicitacao.repository';
import { InMemoryUnitOfWork } from '../infrastructure/persistence/in-memory/in-memory-unit-of-work';
import { RelogioFixo } from './relogio-fixo';

export const atores = {
  ana: { id: 'aluno-1', papel: PapelUsuario.ALUNO } as Actor,
  bruno: { id: 'aluno-2', papel: PapelUsuario.ALUNO } as Actor,
  carla: { id: 'aluno-3', papel: PapelUsuario.ALUNO } as Actor,
  coordenador: { id: 'coord-1', papel: PapelUsuario.COORDENADOR } as Actor,
  secretaria: { id: 'sec-1', papel: PapelUsuario.SECRETARIA } as Actor,
};

export interface MakeOptions {
  /** Permite injetar um repositório de histórico defeituoso para testar rollback. */
  historico?: InMemoryHistoricoRepository;
  disciplinas?: InMemoryDisciplinaRepository;
  sla?: SlaConfig;
  /** Transforma a tabela de regras (usado nos testes de extensão OCP). */
  regras?: (base: TransitionRule[]) => TransitionRule[];
}

export function makeUseCases(opts: MakeOptions = {}) {
  const alunos = new InMemoryAlunoRepository();
  const disciplinas = opts.disciplinas ?? new InMemoryDisciplinaRepository();
  const solicitacoes = new InMemorySolicitacaoRepository();
  const historico = opts.historico ?? new InMemoryHistoricoRepository();
  const uow = new InMemoryUnitOfWork(alunos, disciplinas, solicitacoes, historico);
  const clock = new RelogioFixo();
  const sla = opts.sla ?? new SlaConfig(7, 3);

  const base = criarRegrasDeTransicao(sla);
  const maquina = new SolicitacaoStateMachine(opts.regras ? opts.regras(base) : base);
  const handlers = new TipoHandlerRegistry([new MatriculaHandler(), new TrancamentoHandler()]);

  const transicionar = new TransicionarSolicitacaoUseCase(uow, clock, maquina, handlers);
  const buscar = new BuscarSolicitacaoUseCase(solicitacoes);

  return {
    repos: { alunos, disciplinas, solicitacoes, historico },
    uow,
    clock,
    maquina,
    alunos: {
      criar: new CriarAlunoUseCase(alunos, disciplinas),
      atualizar: new AtualizarAlunoUseCase(alunos, disciplinas),
      excluir: new ExcluirAlunoUseCase(alunos, solicitacoes),
    },
    disciplinas: {
      criar: new CriarDisciplinaUseCase(disciplinas),
      atualizar: new AtualizarDisciplinaUseCase(disciplinas),
      excluir: new ExcluirDisciplinaUseCase(disciplinas, alunos, solicitacoes),
    },
    solicitacoes: {
      criar: new CriarSolicitacaoUseCase(uow, clock, sla),
      transicionar,
      buscar,
      listar: new ListarSolicitacoesUseCase(solicitacoes),
      historico: new ListarHistoricoUseCase(buscar, historico),
      sla: new ProcessarSlaUseCase(solicitacoes, transicionar, clock),
    },
    /** Atalho: `agir(id, EVENTO, ator, 'justificativa')`. */
    agir(id: string, evento: EventoSolicitacao, actor: Actor, justificativa?: string): Promise<Solicitacao> {
      return transicionar.execute({ solicitacaoId: id, evento, actor, justificativa });
    },
  };
}

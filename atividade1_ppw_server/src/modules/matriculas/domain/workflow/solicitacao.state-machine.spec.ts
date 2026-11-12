import { Aluno } from '../entities/aluno.entity';
import { Disciplina } from '../entities/disciplina.entity';
import { EventoSolicitacao as E, PapelUsuario as P, StatusSolicitacao as S, TipoSolicitacao } from '../enums/solicitacao.enums';
import { BusinessRuleError, DomainError, ForbiddenError, TransicaoInvalidaError } from '../errors/domain.errors';
import { atores, makeUseCases } from '../../testing/make-use-cases';
import { BaseGuard } from './guards/base.guard';
import { MatriculaHandler } from './handlers/matricula.handler';
import { TipoHandlerRegistry } from './handlers/tipo-handler';
import { SolicitacaoStateMachine } from './solicitacao.state-machine';
import { TransitionContext } from './types';

describe('Máquina de estados — estrutura', () => {
  it('estados terminais: só REJEITADA, CANCELADA, EXPIRADA e ESTORNADA não têm saída', () => {
    const { maquina } = makeUseCases();
    expect(maquina.estadosTerminais().sort()).toEqual([S.CANCELADA, S.ESTORNADA, S.EXPIRADA, S.REJEITADA].sort());
  });

  it('acoesDisponiveis reflete a matriz RBAC por estado (usada pela UI para exibir só botões válidos)', () => {
    const { maquina } = makeUseCases();
    expect(maquina.acoesDisponiveis(S.PENDENTE, P.ALUNO)).toEqual([E.CANCELAR]);
    expect(maquina.acoesDisponiveis(S.EM_ANALISE, P.COORDENADOR).sort()).toEqual(
      [E.APROVAR, E.CANCELAR, E.REJEITAR, E.SOLICITAR_AJUSTE].sort(),
    );
    expect(maquina.acoesDisponiveis(S.AJUSTE_SOLICITADO, P.ALUNO).sort()).toEqual([E.CANCELAR, E.REENVIAR].sort());
    expect(maquina.acoesDisponiveis(S.APROVADA, P.SECRETARIA)).toEqual([E.CONCLUIR]);
    expect(maquina.acoesDisponiveis(S.CONCLUIDA, P.COORDENADOR)).toEqual([E.ESTORNAR]);
    expect(maquina.acoesDisponiveis(S.REJEITADA, P.COORDENADOR)).toEqual([]);
  });

  it('resolver: 403 por papel antes de 409 por estado', () => {
    const { maquina } = makeUseCases();
    expect(() => maquina.resolver(S.PENDENTE, E.APROVAR, P.ALUNO)).toThrow(ForbiddenError);
    expect(() => maquina.resolver(S.PENDENTE, E.APROVAR, P.COORDENADOR)).toThrow(TransicaoInvalidaError);
    expect(() => maquina.resolver(S.EM_ANALISE, E.APROVAR, P.COORDENADOR)).not.toThrow();
  });

  it('gera o diagrama Mermaid a partir da própria tabela de regras', () => {
    const { maquina } = makeUseCases();
    const m = maquina.toMermaid();
    expect(m).toContain('stateDiagram-v2');
    expect(m).toContain('EM_ANALISE --> APROVADA : APROVAR (coordenador)');
    expect(m).toContain('CONCLUIDA --> ESTORNADA : ESTORNAR (coordenador)');
    expect(m).toContain('REJEITADA --> [*]');
  });
});

describe('Máquina de estados — OCP (aberta para extensão, fechada para modificação)', () => {
  it('acrescentar uma guarda e uma transição nova só mexe na TABELA de regras, não no motor', async () => {
    class TetoDeAlunosAtivosGuard extends BaseGuard {
      readonly nome = 'teto-ativas';
      verificar(_ctx: TransitionContext): Promise<void> {
        throw new BusinessRuleError('Teto de disciplinas simultâneas atingido');
      }
    }
    const REABRIR = 'REABRIR' as E;
    const ctx = makeUseCases({
      regras: (base) => [
        ...base.map((r) => (r.evento === E.APROVAR ? { ...r, guards: [...r.guards, new TetoDeAlunosAtivosGuard()] } : r)),
        { evento: REABRIR, de: [S.REJEITADA], para: S.PENDENTE, papeis: [P.COORDENADOR], guards: [] },
      ],
    });
    // o motor é a MESMA classe, apenas recebeu regras diferentes
    expect(ctx.maquina).toBeInstanceOf(SolicitacaoStateMachine);

    const s = await ctx.solicitacoes.criar.execute(
      { alunoId: 'aluno-1', disciplinaId: 'disc-2', tipo: TipoSolicitacao.MATRICULA },
      atores.ana,
    );
    await ctx.agir(s.id, E.INICIAR_ANALISE, atores.coordenador);
    await expect(ctx.agir(s.id, E.APROVAR, atores.coordenador)).rejects.toThrow('Teto de disciplinas');

    await ctx.agir(s.id, E.REJEITAR, atores.coordenador, 'teste');
    const reaberta = await ctx.agir(s.id, REABRIR, atores.coordenador);
    expect(reaberta.status).toBe(S.PENDENTE);
  });

  it('um tipo novo de solicitação entra registrando um handler, sem alterar o orquestrador', () => {
    const registry = new TipoHandlerRegistry([new MatriculaHandler()]);
    expect(registry.para(TipoSolicitacao.MATRICULA)).toBeInstanceOf(MatriculaHandler);
    expect(() => registry.para(TipoSolicitacao.TRANCAMENTO)).toThrow('Não há handler');
  });
});

describe('Máquina de estados — LSP (toda guarda é substituível pelo contrato)', () => {
  it('nenhuma guarda altera o contexto; toda violação é um DomainError', async () => {
    const c = makeUseCases();
    const s = await c.solicitacoes.criar.execute(
      { alunoId: 'aluno-2', disciplinaId: 'disc-5', tipo: TipoSolicitacao.MATRICULA },
      atores.bruno,
    );
    const aluno = (await c.repos.alunos.findById('aluno-2')) as Aluno;
    const disciplina = (await c.repos.disciplinas.findById('disc-5')) as Disciplina;

    const guardas = new Set(c.maquina.todasAsRegras.flatMap((r) => r.guards));
    expect(guardas.size).toBeGreaterThan(5);

    for (const guarda of guardas) {
      const ctx: TransitionContext = {
        solicitacao: s, evento: E.APROVAR, actor: atores.coordenador, justificativa: undefined,
        agora: c.clock.now(), aluno, disciplina, repos: c.repos,
      };
      const antes = JSON.stringify([s, aluno, disciplina]);
      expect(typeof guarda.nome).toBe('string');
      expect(typeof guarda.aplicaA(ctx)).toBe('boolean');
      try {
        await guarda.verificar(ctx);
      } catch (erro) {
        expect(erro).toBeInstanceOf(DomainError);
      }
      expect(JSON.stringify([s, aluno, disciplina])).toBe(antes);
    }
  });
});

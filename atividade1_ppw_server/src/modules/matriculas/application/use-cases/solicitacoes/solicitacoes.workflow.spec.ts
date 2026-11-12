import { NovoHistorico } from '../../../domain/entities/historico-solicitacao';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import {
  EventoSolicitacao as E,
  PapelUsuario,
  StatusSolicitacao as S,
  TipoSolicitacao,
} from '../../../domain/enums/solicitacao.enums';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  GuardViolationError,
  NotFoundError,
  TransicaoInvalidaError,
} from '../../../domain/errors/domain.errors';
import { SISTEMA } from '../../../domain/workflow/types';
import { InMemoryHistoricoRepository } from '../../../infrastructure/persistence/in-memory/in-memory-historico.repository';
import { atores, makeUseCases } from '../../../testing/make-use-cases';

type Ctx = ReturnType<typeof makeUseCases>;
const { ana, bruno, carla, coordenador, secretaria } = atores;

const matricula = (ctx: Ctx, ator = ana, disciplinaId = 'disc-2', alunoId = ator.id) =>
  ctx.solicitacoes.criar.execute({ alunoId, disciplinaId, tipo: TipoSolicitacao.MATRICULA }, ator);
const trancamento = (ctx: Ctx, ator = bruno, disciplinaId = 'disc-1') =>
  ctx.solicitacoes.criar.execute({ alunoId: ator.id, disciplinaId, tipo: TipoSolicitacao.TRANCAMENTO }, ator);
const emAnalise = async (ctx: Ctx, id: string) => ctx.agir(id, E.INICIAR_ANALISE, coordenador);
const aprovada = async (ctx: Ctx, id: string) => {
  await emAnalise(ctx, id);
  return ctx.agir(id, E.APROVAR, coordenador);
};
const eventos = async (ctx: Ctx, id: string) =>
  (await ctx.repos.historico.listarPorSolicitacao(id)).map((h) => h.evento);

describe('Solicitações — criação', () => {
  it('registra PENDENTE com indicadores, prazos de SLA e a linha CRIAR na auditoria', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    expect(s.status).toBe(S.PENDENTE);
    expect(s.preRequisitosOk).toBe(true);
    expect(s.vagaDisponivel).toBe(true);
    expect(s.semConflitoHorario).toBe(true);
    expect(new Date(s.prazoLimite).getTime() - new Date(s.criadoEm).getTime()).toBe(7 * 86_400_000);
    expect(new Date(s.escalonarEm).getTime() - new Date(s.criadoEm).getTime()).toBe(3 * 86_400_000);

    const [h] = await ctx.repos.historico.listarPorSolicitacao(s.id);
    expect(h.evento).toBe(E.CRIAR);
    expect(h.estadoAnterior).toBeNull();
    expect(h.novoEstado).toBe(S.PENDENTE);
    expect(h.autorId).toBe('aluno-1');
  });

  it('sinaliza pré-requisito pendente, falta de vaga e choque de horário', async () => {
    const ctx = makeUseCases();
    const a = await matricula(ctx, bruno, 'disc-3'); // sem ALG101 concluída e turma cheia
    expect(a.preRequisitosOk).toBe(false);
    expect(a.vagaDisponivel).toBe(false);
    expect(a.semConflitoHorario).toBe(true);

    const b = await matricula(ctx, bruno, 'disc-5'); // RED202 seg 08:30 colide com ALG101 seg 08:00
    expect(b.semConflitoHorario).toBe(false);
  });

  it('barra matrícula duplicada, trancamento de disciplina não cursada e recursos inexistentes', async () => {
    const ctx = makeUseCases();
    await expect(matricula(ctx, bruno, 'disc-1')).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(trancamento(ctx, ana, 'disc-1')).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(matricula(ctx, ana, 'nao-existe')).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      ctx.solicitacoes.criar.execute({ alunoId: 'x', disciplinaId: 'disc-1', tipo: TipoSolicitacao.MATRICULA }, secretaria),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('RBAC da criação: aluno só para si, secretaria para qualquer um, coordenação não cria', async () => {
    const ctx = makeUseCases();
    await expect(matricula(ctx, ana, 'disc-2', 'aluno-2')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(matricula(ctx, coordenador, 'disc-2', 'aluno-1')).rejects.toBeInstanceOf(ForbiddenError);
    const s = await matricula(ctx, secretaria, 'disc-2', 'aluno-1');
    expect(s.alunoId).toBe('aluno-1');
    expect((await ctx.repos.historico.listarPorSolicitacao(s.id))[0].autorPapel).toBe(PapelUsuario.SECRETARIA);
  });

  it('impede segunda solicitação aberta idêntica; libera depois de cancelada', async () => {
    const ctx = makeUseCases();
    const a = await matricula(ctx);
    await expect(matricula(ctx)).rejects.toBeInstanceOf(ConflictError);
    await ctx.agir(a.id, E.CANCELAR, ana, 'refiz o planejamento');
    await matricula(ctx);
  });

  it('lista só as próprias para o aluno; todas, da mais recente à mais antiga, para a coordenação', async () => {
    const ctx = makeUseCases();
    const a = await matricula(ctx, ana, 'disc-2');
    ctx.clock.avancarDias(0.001);
    const b = await matricula(ctx, bruno, 'disc-5');
    ctx.clock.avancarDias(0.001);
    const c = await matricula(ctx, ana, 'disc-5');

    expect((await ctx.solicitacoes.listar.execute(coordenador)).map((s) => s.id)).toEqual([c.id, b.id, a.id]);
    expect((await ctx.solicitacoes.listar.execute(ana)).map((s) => s.id)).toEqual([c.id, a.id]);
  });
});

describe('Solicitações — máquina de estados e RBAC', () => {
  it('caminho feliz de matrícula: PENDENTE → EM_ANALISE → APROVADA → CONCLUIDA, com trilha completa', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await emAnalise(ctx, s.id);
    await ctx.agir(s.id, E.APROVAR, coordenador);
    const fim = await ctx.agir(s.id, E.CONCLUIR, secretaria);

    expect(fim.status).toBe(S.CONCLUIDA);
    expect((await ctx.repos.alunos.findById('aluno-1'))?.disciplinasAtivas).toContain('disc-2');
    expect((await ctx.repos.disciplinas.findById('disc-2'))?.vagasOcupadas).toBe(1);

    const trilha = await ctx.repos.historico.listarPorSolicitacao(s.id);
    expect(trilha.map((h) => [h.evento, h.estadoAnterior, h.novoEstado, h.autorPapel])).toEqual([
      [E.CRIAR, null, S.PENDENTE, PapelUsuario.ALUNO],
      [E.INICIAR_ANALISE, S.PENDENTE, S.EM_ANALISE, PapelUsuario.COORDENADOR],
      [E.APROVAR, S.EM_ANALISE, S.APROVADA, PapelUsuario.COORDENADOR],
      [E.CONCLUIR, S.APROVADA, S.CONCLUIDA, PapelUsuario.SECRETARIA],
    ]);
    expect(trilha[3].metadados.vagasOcupadasApos).toBe(1);
  });

  it('caminho feliz de trancamento: libera a vaga e retira a disciplina da grade', async () => {
    const ctx = makeUseCases();
    const s = await trancamento(ctx);
    await aprovada(ctx, s.id);
    await ctx.agir(s.id, E.CONCLUIR, secretaria);
    expect((await ctx.repos.alunos.findById('aluno-2'))?.disciplinasAtivas).toEqual([]);
    expect((await ctx.repos.disciplinas.findById('disc-1'))?.vagasOcupadas).toBe(0);
  });

  it('transições fora da máquina → 409 e nada muda (nem estado, nem trilha)', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await expect(ctx.agir(s.id, E.APROVAR, coordenador)).rejects.toBeInstanceOf(TransicaoInvalidaError);
    await expect(ctx.agir(s.id, E.CONCLUIR, secretaria)).rejects.toBeInstanceOf(TransicaoInvalidaError);
    await expect(ctx.agir(s.id, E.ESTORNAR, coordenador, 'x')).rejects.toBeInstanceOf(TransicaoInvalidaError);
    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.PENDENTE);
    expect(await eventos(ctx, s.id)).toEqual([E.CRIAR]);

    await ctx.agir(s.id, E.REJEITAR, coordenador, 'fora do período');
    await expect(ctx.agir(s.id, E.INICIAR_ANALISE, coordenador)).rejects.toBeInstanceOf(TransicaoInvalidaError);
  });

  it('matriz RBAC: papel sem permissão → 403, inclusive sem revelar o estado (403 antes de 409)', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    // aluno tentando aprovar uma PENDENTE: é 403 (papel), não 409 (estado)
    await expect(ctx.agir(s.id, E.APROVAR, ana)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(ctx.agir(s.id, E.INICIAR_ANALISE, secretaria)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(ctx.agir(s.id, E.EXPIRAR, coordenador)).rejects.toBeInstanceOf(ForbiddenError);
    await emAnalise(ctx, s.id);
    await ctx.agir(s.id, E.APROVAR, coordenador);
    await expect(ctx.agir(s.id, E.CONCLUIR, coordenador)).rejects.toBeInstanceOf(ForbiddenError); // separação de funções
    await expect(ctx.agir(s.id, E.CONCLUIR, ana)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('aluno só age nas próprias solicitações', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx, ana);
    await expect(ctx.agir(s.id, E.CANCELAR, bruno, 'sabotagem')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(ctx.solicitacoes.buscar.execute(s.id, bruno)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(ctx.solicitacoes.historico.execute(s.id, bruno)).rejects.toBeInstanceOf(ForbiddenError);
    expect((await ctx.solicitacoes.historico.execute(s.id, coordenador)).length).toBe(1);
  });

  it('justificativa obrigatória: sem ela a ação é barrada, o estado não muda e nada vai à trilha', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await expect(ctx.agir(s.id, E.REJEITAR, coordenador)).rejects.toBeInstanceOf(GuardViolationError);
    await expect(ctx.agir(s.id, E.REJEITAR, coordenador, '   ')).rejects.toThrow('exige justificativa');
    await expect(ctx.agir(s.id, E.SOLICITAR_AJUSTE, coordenador)).rejects.toBeInstanceOf(GuardViolationError);
    await expect(ctx.agir(s.id, E.CANCELAR, ana)).rejects.toBeInstanceOf(GuardViolationError);
    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.PENDENTE);
    expect(await eventos(ctx, s.id)).toEqual([E.CRIAR]);

    const r = await ctx.agir(s.id, E.REJEITAR, coordenador, '  não há vaga no período  ');
    expect(r.status).toBe(S.REJEITADA);
    expect(r.ultimaJustificativa).toBe('não há vaga no período');
    const trilha = await ctx.repos.historico.listarPorSolicitacao(s.id);
    expect(trilha[1].justificativa).toBe('não há vaga no período');
  });

  it('solicitar ajuste → aluno reenvia com justificativa → volta a PENDENTE com o prazo reiniciado', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    ctx.clock.avancarDias(2);
    await ctx.agir(s.id, E.SOLICITAR_AJUSTE, coordenador, 'anexar histórico escolar');
    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.AJUSTE_SOLICITADO);

    await expect(ctx.agir(s.id, E.REENVIAR, bruno, 'enviei')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(ctx.agir(s.id, E.REENVIAR, ana)).rejects.toBeInstanceOf(GuardViolationError);
    ctx.clock.avancarDias(3);
    const re = await ctx.agir(s.id, E.REENVIAR, ana, 'histórico anexado');
    expect(re.status).toBe(S.PENDENTE);
    expect(new Date(re.prazoLimite).getTime()).toBe(ctx.clock.now().getTime() + 7 * 86_400_000);
    expect(re.escalonadaEm).toBeUndefined();
  });

  it('cancelar antes da efetivação não tem efeito colateral; depois de CONCLUIDA só estorno', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await aprovada(ctx, s.id);
    const c = await ctx.agir(s.id, E.CANCELAR, ana, 'trancamento do semestre');
    expect(c.status).toBe(S.CANCELADA);
    expect((await ctx.repos.disciplinas.findById('disc-2'))?.vagasOcupadas).toBe(0);
    expect((await ctx.repos.alunos.findById('aluno-1'))?.disciplinasAtivas).toEqual([]);

    const t = await matricula(ctx, carla, 'disc-4');
    await aprovada(ctx, t.id);
    await ctx.agir(t.id, E.CONCLUIR, secretaria);
    await expect(ctx.agir(t.id, E.CANCELAR, carla, 'quero sair')).rejects.toBeInstanceOf(TransicaoInvalidaError);
  });

  it('estorno de matrícula concluída devolve a vaga e retira a disciplina da grade (compensação)', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await aprovada(ctx, s.id);
    await ctx.agir(s.id, E.CONCLUIR, secretaria);

    await expect(ctx.agir(s.id, E.ESTORNAR, secretaria, 'x')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(ctx.agir(s.id, E.ESTORNAR, coordenador)).rejects.toBeInstanceOf(GuardViolationError);
    const e = await ctx.agir(s.id, E.ESTORNAR, coordenador, 'matrícula feita por engano');
    expect(e.status).toBe(S.ESTORNADA);
    expect((await ctx.repos.disciplinas.findById('disc-2'))?.vagasOcupadas).toBe(0);
    expect((await ctx.repos.alunos.findById('aluno-1'))?.disciplinasAtivas).toEqual([]);
    expect((await ctx.repos.historico.listarPorSolicitacao(s.id)).at(-1)?.metadados.efeito).toBe('REVERTER');
  });

  it('estorno de trancamento rematricula; se a vaga foi ocupada, falha e NADA muda', async () => {
    const ctx = makeUseCases();
    const s = await trancamento(ctx);
    await aprovada(ctx, s.id);
    await ctx.agir(s.id, E.CONCLUIR, secretaria);
    const e = await ctx.agir(s.id, E.ESTORNAR, coordenador, 'trancamento indevido');
    expect(e.status).toBe(S.ESTORNADA);
    expect((await ctx.repos.alunos.findById('aluno-2'))?.disciplinasAtivas).toEqual(['disc-1']);
    expect((await ctx.repos.disciplinas.findById('disc-1'))?.vagasOcupadas).toBe(1);

    const t = await trancamento(ctx);
    await aprovada(ctx, t.id);
    await ctx.agir(t.id, E.CONCLUIR, secretaria);
    const disc = (await ctx.repos.disciplinas.findById('disc-1'))!;
    disc.vagasOcupadas = disc.vagasTotais; // outro aluno ocupou a vaga liberada
    const antes = (await eventos(ctx, t.id)).length;

    await expect(ctx.agir(t.id, E.ESTORNAR, coordenador, 'tentativa')).rejects.toThrow('vaga já foi ocupada');
    expect((await ctx.repos.solicitacoes.findById(t.id))?.status).toBe(S.CONCLUIDA);
    expect((await ctx.repos.alunos.findById('aluno-2'))?.disciplinasAtivas).toEqual([]);
    expect((await eventos(ctx, t.id)).length).toBe(antes);
  });
});

describe('Solicitações — guardas de elegibilidade', () => {
  it('barra a aprovação sem pré-requisito e diz quais faltam', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx, bruno, 'disc-2');
    await emAnalise(ctx, s.id);
    await expect(ctx.agir(s.id, E.APROVAR, coordenador)).rejects.toThrow('faltam: ALG101');
    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.EM_ANALISE);
  });

  it('barra a aprovação sem vaga', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx, ana, 'disc-3');
    await emAnalise(ctx, s.id);
    await expect(ctx.agir(s.id, E.APROVAR, coordenador)).rejects.toThrow('não há vaga');
  });

  it('barra a aprovação com choque de horário na grade da semana', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx, bruno, 'disc-5');
    await emAnalise(ctx, s.id);
    await expect(ctx.agir(s.id, E.APROVAR, coordenador)).rejects.toThrow('Choque de horário com ALG101');
  });

  it('horários encostados (08–10 e 10–12) passam; sobrepostos (09–11) são barrados', async () => {
    const ctx = makeUseCases();
    const nova = (id: string, inicio: string, fim: string) =>
      ctx.repos.disciplinas.save(
        new Disciplina({ id, codigo: id.toUpperCase(), nome: id, vagasTotais: 5, horarios: [{ dia: 5, inicio, fim }] }),
      );
    await nova('h-a', '08:00', '10:00');
    await nova('h-b', '10:00', '12:00');
    await nova('h-c', '09:00', '11:00');

    const a = await matricula(ctx, ana, 'h-a');
    await aprovada(ctx, a.id);
    await ctx.agir(a.id, E.CONCLUIR, secretaria); // h-a entra na grade da Ana

    const b = await matricula(ctx, ana, 'h-b');
    expect((await aprovada(ctx, b.id)).status).toBe(S.APROVADA);

    const c = await matricula(ctx, ana, 'h-c');
    await emAnalise(ctx, c.id);
    await expect(ctx.agir(c.id, E.APROVAR, coordenador)).rejects.toThrow('Choque de horário com H-A');
  });

  it('CONCLUIR reconfere tudo sob lock: se a vaga sumiu depois da aprovação, a efetivação falha e nada muda', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await aprovada(ctx, s.id);
    const disc = (await ctx.repos.disciplinas.findById('disc-2'))!;
    disc.vagasOcupadas = disc.vagasTotais; // outros alunos foram efetivados nesse meio-tempo

    await expect(ctx.agir(s.id, E.CONCLUIR, secretaria)).rejects.toBeInstanceOf(GuardViolationError);
    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.APROVADA);
    expect((await ctx.repos.alunos.findById('aluno-1'))?.disciplinasAtivas).toEqual([]);
  });

  it('N guardas, mas sem N+1: o custo de consultas não cresce com o número de pré-requisitos', async () => {
    const contar = async (qtdPre: number) => {
      const ctx = makeUseCases();
      const ids = Array.from({ length: qtdPre }, (_, i) => `p-${i}`);
      for (const id of ids) await ctx.repos.disciplinas.save(new Disciplina({ id, codigo: id, nome: id, vagasTotais: 1 }));
      await ctx.repos.disciplinas.save(
        new Disciplina({ id: 'alvo', codigo: 'ALVO', nome: 'Alvo', vagasTotais: 1, preRequisitos: ids }),
      );
      const s = await matricula(ctx, ana, 'alvo');
      await emAnalise(ctx, s.id);
      let porId = 0;
      let emLote = 0;
      const { findById, findByIds } = ctx.repos.disciplinas;
      ctx.repos.disciplinas.findById = (id: string) => { porId++; return findById.call(ctx.repos.disciplinas, id); };
      ctx.repos.disciplinas.findByIds = (x: string[]) => { emLote++; return findByIds.call(ctx.repos.disciplinas, x); };
      await expect(ctx.agir(s.id, E.APROVAR, coordenador)).rejects.toBeInstanceOf(GuardViolationError);
      return { porId, emLote };
    };
    const poucos = await contar(2);
    const muitos = await contar(40);
    expect(muitos).toEqual(poucos);
    expect(muitos.emLote).toBe(1);
  });
});

describe('Solicitações — concorrência', () => {
  const novaDisciplinaComUmaVaga = async (ctx: Ctx) => {
    await ctx.repos.disciplinas.save(
      new Disciplina({
        id: 'disc-9', codigo: 'LAB900', nome: 'Laboratório', vagasTotais: 1,
        horarios: [{ dia: 5, inicio: '14:00', fim: '16:00' }],
      }),
    );
  };

  it('duas efetivações simultâneas para a ÚLTIMA vaga: uma vence, a outra falha, vaga nunca estoura', async () => {
    const ctx = makeUseCases();
    await novaDisciplinaComUmaVaga(ctx);
    const a = await matricula(ctx, ana, 'disc-9');
    const b = await matricula(ctx, bruno, 'disc-9');
    await aprovada(ctx, a.id); // ambas aprovadas enquanto ainda havia vaga
    await aprovada(ctx, b.id);

    const resultados = await Promise.allSettled([
      ctx.agir(a.id, E.CONCLUIR, secretaria),
      ctx.agir(b.id, E.CONCLUIR, secretaria),
    ]);
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const falhas = resultados.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(falhas).toHaveLength(1);
    expect(falhas[0].reason).toBeInstanceOf(BusinessRuleError);
    expect((await ctx.repos.disciplinas.findById('disc-9'))?.vagasOcupadas).toBe(1);

    const perdedora = a.id === (ok[0] as PromiseFulfilledResult<{ id: string }>).value.id ? b : a;
    expect((await ctx.repos.solicitacoes.findById(perdedora.id))?.status).toBe(S.APROVADA);
    expect(await eventos(ctx, perdedora.id)).not.toContain(E.CONCLUIR);
  });

  it('dois coordenadores aprovando a mesma solicitação: só um registro de APROVAR', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await emAnalise(ctx, s.id);
    const outro = { id: 'coord-2', papel: PapelUsuario.COORDENADOR };
    const r = await Promise.allSettled([
      ctx.agir(s.id, E.APROVAR, coordenador),
      ctx.agir(s.id, E.APROVAR, outro),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(TransicaoInvalidaError);
    expect((await eventos(ctx, s.id)).filter((e) => e === E.APROVAR)).toHaveLength(1);
  });

  it('criação simultânea do mesmo pedido: só uma solicitação aberta', async () => {
    const ctx = makeUseCases();
    const r = await Promise.allSettled([matricula(ctx), matricula(ctx)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
  });
});

describe('Solicitações — atomicidade e auditoria (ACID)', () => {
  class HistoricoQueFalha extends InMemoryHistoricoRepository {
    falhar = false;
    registrar(entrada: NovoHistorico) {
      if (this.falhar) return Promise.reject(new Error('disco cheio'));
      return super.registrar(entrada);
    }
  }

  it('se a linha de auditoria falha, o efeito em vaga/matrícula e o novo estado são DESFEITOS juntos', async () => {
    const historico = new HistoricoQueFalha();
    const ctx = makeUseCases({ historico });
    const s = await matricula(ctx);
    await aprovada(ctx, s.id);
    const antes = (await eventos(ctx, s.id)).length;

    historico.falhar = true;
    await expect(ctx.agir(s.id, E.CONCLUIR, secretaria)).rejects.toThrow('disco cheio');

    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.APROVADA);
    expect((await ctx.repos.disciplinas.findById('disc-2'))?.vagasOcupadas).toBe(0);
    expect((await ctx.repos.alunos.findById('aluno-1'))?.disciplinasAtivas).toEqual([]);
    expect((await eventos(ctx, s.id)).length).toBe(antes);

    historico.falhar = false; // sem resíduo: a mesma ação agora completa normalmente
    await ctx.agir(s.id, E.CONCLUIR, secretaria);
    expect((await ctx.repos.disciplinas.findById('disc-2'))?.vagasOcupadas).toBe(1);
  });

  it('a trilha é append-only: o repositório não expõe update/delete e as linhas são imutáveis', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    const [h] = await ctx.repos.historico.listarPorSolicitacao(s.id);
    const repo = ctx.repos.historico as unknown as Record<string, unknown>;
    expect(repo.delete).toBeUndefined();
    expect(repo.update).toBeUndefined();
    expect(Object.isFrozen(h)).toBe(true);
    try {
      (h as { justificativa: string | null }).justificativa = 'adulterado'; // lança em strict mode; ignorado fora dele
    } catch {
      /* esperado em strict mode */
    }
    expect((await ctx.repos.historico.listarPorSolicitacao(s.id))[0].justificativa).toBeNull();
  });

  it('solicitações não podem ser excluídas: o repositório não oferece delete', async () => {
    const ctx = makeUseCases();
    expect((ctx.repos.solicitacoes as unknown as Record<string, unknown>).delete).toBeUndefined();
  });
});

describe('Solicitações — SLA, escalonamento e expiração', () => {
  it('escalona após 3 dias sem decisão: mantém o estado, grava ESCALONAR pelo SISTEMA e é idempotente', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    ctx.clock.avancarDias(2);
    expect((await ctx.solicitacoes.sla.execute()).escalonadas).toEqual([]);

    ctx.clock.avancarDias(1);
    const r = await ctx.solicitacoes.sla.execute();
    expect(r.escalonadas).toEqual([s.id]);
    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.PENDENTE);
    const ultima = (await ctx.repos.historico.listarPorSolicitacao(s.id)).at(-1)!;
    expect([ultima.evento, ultima.estadoAnterior, ultima.novoEstado]).toEqual([E.ESCALONAR, S.PENDENTE, S.PENDENTE]);
    expect([ultima.autorId, ultima.autorPapel]).toEqual(['sistema', PapelUsuario.SISTEMA]);

    expect((await ctx.solicitacoes.sla.execute()).escalonadas).toEqual([]);
  });

  it('expira após 7 dias: EXPIRADA é terminal e a trilha registra o SISTEMA como autor', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    ctx.clock.avancarDias(8);
    const r = await ctx.solicitacoes.sla.execute();
    expect(r.expiradas).toEqual([s.id]);
    expect(r.escalonadas).toEqual([]);
    expect(r.falhas).toEqual([]);
    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.EXPIRADA);
    await expect(ctx.agir(s.id, E.APROVAR, coordenador)).rejects.toBeInstanceOf(TransicaoInvalidaError);
    await expect(ctx.agir(s.id, E.CANCELAR, ana, 'tarde demais')).rejects.toBeInstanceOf(TransicaoInvalidaError);
  });

  it('com o prazo vencido e a varredura ainda não executada, a coordenação já não consegue avançar o pedido', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    ctx.clock.avancarDias(8);
    await expect(ctx.agir(s.id, E.INICIAR_ANALISE, coordenador)).rejects.toThrow('prazo de atendimento');
    expect((await ctx.solicitacoes.sla.execute()).expiradas).toEqual([s.id]);
  });

  it('o relógio do SLA só corre antes da aprovação: APROVADA não expira', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await aprovada(ctx, s.id);
    ctx.clock.avancarDias(30);
    const r = await ctx.solicitacoes.sla.execute();
    expect(r.expiradas).toEqual([]);
    expect((await ctx.repos.solicitacoes.findById(s.id))?.status).toBe(S.APROVADA);
  });

  it('reenviar após ajuste reinicia o prazo: o pedido não expira pelo prazo antigo', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    ctx.clock.avancarDias(2);
    await ctx.agir(s.id, E.SOLICITAR_AJUSTE, coordenador, 'anexar documento');
    ctx.clock.avancarDias(3);
    await ctx.agir(s.id, E.REENVIAR, ana, 'documento anexado'); // novo prazo: dia 12
    ctx.clock.avancarDias(4); // dia 9, o prazo original (dia 7) já teria vencido
    expect((await ctx.solicitacoes.sla.execute()).expiradas).toEqual([]);
    ctx.clock.avancarDias(4); // dia 13
    expect((await ctx.solicitacoes.sla.execute()).expiradas).toEqual([s.id]);
  });

  it('o evento EXPIRAR forçado antes do prazo é barrado pela guarda (nem o sistema expira cedo)', async () => {
    const ctx = makeUseCases();
    const s = await matricula(ctx);
    await expect(ctx.agir(s.id, E.EXPIRAR, SISTEMA, 'forçado')).rejects.toBeInstanceOf(GuardViolationError);
    await expect(ctx.agir(s.id, E.ESCALONAR, SISTEMA, 'forçado')).rejects.toBeInstanceOf(GuardViolationError);
  });

  it('uma falha isolada não trava o restante do lote de SLA', async () => {
    const ctx = makeUseCases();
    const a = await matricula(ctx, ana, 'disc-2');
    const b = await matricula(ctx, bruno, 'disc-5');
    ctx.clock.avancarDias(8);
    // sabota apenas a solicitação `a`: a disciplina some, a transição falha com NotFound
    await ctx.repos.disciplinas.delete('disc-2');
    const r = await ctx.solicitacoes.sla.execute();
    expect(r.falhas.map((f) => f.id)).toEqual([a.id]);
    expect(r.expiradas).toEqual([b.id]);
  });
});

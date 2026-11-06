import { StatusSolicitacao, TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { makeUseCases } from '../../../testing/make-use-cases';

describe('Solicitações', () => {
  it('registra matrícula pendente informando pré-requisitos e vaga', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    expect(s.status).toBe(StatusSolicitacao.PENDENTE);
    expect(s.preRequisitosOk).toBe(true);
    expect(s.vagaDisponivel).toBe(true);
  });

  it('sinaliza pré-requisito pendente e falta de vaga', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-2',
      disciplinaId: 'disc-3',
      tipo: TipoSolicitacao.MATRICULA,
    });
    expect(s.preRequisitosOk).toBe(false);
    expect(s.vagaDisponivel).toBe(false);
  });

  it('barra matrícula duplicada e trancamento de disciplina não cursada', async () => {
    const ctx = makeUseCases();
    await expect(
      ctx.solicitacoes.criar.execute({
        alunoId: 'aluno-2',
        disciplinaId: 'disc-1',
        tipo: TipoSolicitacao.MATRICULA,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(
      ctx.solicitacoes.criar.execute({
        alunoId: 'aluno-1',
        disciplinaId: 'disc-1',
        tipo: TipoSolicitacao.TRANCAMENTO,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('retorna NotFound para aluno ou disciplina inexistente', async () => {
    const ctx = makeUseCases();
    await expect(
      ctx.solicitacoes.criar.execute({
        alunoId: 'x',
        disciplinaId: 'disc-1',
        tipo: TipoSolicitacao.MATRICULA,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('aprova matrícula: ocupa vaga e ativa a disciplina do aluno', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    const aprovada = await ctx.solicitacoes.aprovar.execute(s.id);

    expect(aprovada.status).toBe(StatusSolicitacao.APROVADA);
    const aluno = await ctx.repos.alunos.findById('aluno-1');
    const disc = await ctx.repos.disciplinas.findById('disc-2');
    expect(aluno?.disciplinasAtivas).toContain('disc-2');
    expect(disc?.vagasOcupadas).toBe(1);
  });

  it('não aprova sem pré-requisito nem sem vaga, sem alterar o estado', async () => {
    const ctx = makeUseCases();
    const semPre = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-2',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await expect(ctx.solicitacoes.aprovar.execute(semPre.id)).rejects.toThrow(
      'pré-requisitos',
    );

    const semVaga = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-3',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await expect(ctx.solicitacoes.aprovar.execute(semVaga.id)).rejects.toThrow(
      'vaga',
    );
    expect((await ctx.repos.disciplinas.findById('disc-3'))?.vagasOcupadas).toBe(1);
    expect(semVaga.status).toBe(StatusSolicitacao.PENDENTE);
  });

  it('não permite matricular duas vezes via duas solicitações pendentes', async () => {
    const ctx = makeUseCases();
    const a = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    const b = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await ctx.solicitacoes.aprovar.execute(a.id);
    await expect(ctx.solicitacoes.aprovar.execute(b.id)).rejects.toThrow(
      'já está matriculado',
    );
    expect((await ctx.repos.disciplinas.findById('disc-2'))?.vagasOcupadas).toBe(1);
  });

  it('aprova trancamento: libera a vaga e remove a disciplina ativa', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-2',
      disciplinaId: 'disc-1',
      tipo: TipoSolicitacao.TRANCAMENTO,
    });
    await ctx.solicitacoes.aprovar.execute(s.id);
    expect((await ctx.repos.alunos.findById('aluno-2'))?.disciplinasAtivas).toEqual([]);
    expect((await ctx.repos.disciplinas.findById('disc-1'))?.vagasOcupadas).toBe(0);
  });

  it('rejeita com motivo (ou "Não informado") e impede reavaliação', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    const r = await ctx.solicitacoes.rejeitar.execute(s.id, '  ');
    expect(r.status).toBe(StatusSolicitacao.REJEITADA);
    expect(r.motivoRejeicao).toBe('Não informado');
    await expect(ctx.solicitacoes.aprovar.execute(s.id)).rejects.toThrow(
      'já foi avaliada',
    );
  });

  it('altera apenas solicitação pendente e recalcula os indicadores', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    const alterada = await ctx.solicitacoes.atualizar.execute(s.id, {
      alunoId: 'aluno-1',
      disciplinaId: 'disc-3',
      tipo: TipoSolicitacao.MATRICULA,
    });
    expect(alterada.disciplinaId).toBe('disc-3');
    expect(alterada.vagaDisponivel).toBe(false);

    await ctx.solicitacoes.rejeitar.execute(s.id);
    await expect(
      ctx.solicitacoes.atualizar.execute(s.id, {
        alunoId: 'aluno-1',
        disciplinaId: 'disc-2',
        tipo: TipoSolicitacao.MATRICULA,
      }),
    ).rejects.toThrow('pendentes');
  });

  it('exclui pendente/rejeitada, mas não aprovada', async () => {
    const ctx = makeUseCases();
    const a = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await ctx.solicitacoes.excluir.execute(a.id);
    expect(await ctx.repos.solicitacoes.findById(a.id)).toBeNull();

    const b = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await ctx.solicitacoes.aprovar.execute(b.id);
    await expect(ctx.solicitacoes.excluir.execute(b.id)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it('lista da mais recente para a mais antiga', async () => {
    const ctx = makeUseCases();
    const a = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await new Promise((r) => setTimeout(r, 5));
    const b = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-4',
      tipo: TipoSolicitacao.MATRICULA,
    });
    const lista = await ctx.solicitacoes.listar.execute();
    expect(lista.map((s) => s.id)).toEqual([b.id, a.id]);
  });
});

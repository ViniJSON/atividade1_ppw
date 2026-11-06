import { TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { makeUseCases } from '../../../testing/make-use-cases';

describe('Alunos', () => {
  it('cria aluno e impede matrícula (número) duplicada', async () => {
    const ctx = makeUseCases();
    const novo = await ctx.alunos.criar.execute({
      nome: '  Davi Prado ',
      matricula: '2024001',
      disciplinasConcluidas: ['disc-1'],
    });
    expect(novo.nome).toBe('Davi Prado');
    expect(novo.disciplinasAtivas).toEqual([]);
    expect(await ctx.repos.alunos.findById(novo.id)).toBe(novo);

    await expect(
      ctx.alunos.criar.execute({ nome: 'Outro', matricula: '2024001' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejeita disciplina concluída inexistente', async () => {
    const ctx = makeUseCases();
    await expect(
      ctx.alunos.criar.execute({
        nome: 'Eva',
        matricula: '1',
        disciplinasConcluidas: ['nao-existe'],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('atualiza aluno mantendo a própria matrícula, mas não a de outro', async () => {
    const ctx = makeUseCases();
    const ok = await ctx.alunos.atualizar.execute('aluno-1', {
      nome: 'Ana S.',
      matricula: '2023001',
      disciplinasConcluidas: ['disc-1', 'disc-2'],
    });
    expect(ok.disciplinasConcluidas).toEqual(['disc-1', 'disc-2']);

    await expect(
      ctx.alunos.atualizar.execute('aluno-1', {
        nome: 'Ana',
        matricula: '2023002',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      ctx.alunos.atualizar.execute('nope', { nome: 'x', matricula: 'y' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('não marca como concluída uma disciplina em andamento', async () => {
    const ctx = makeUseCases();
    await expect(
      ctx.alunos.atualizar.execute('aluno-2', {
        nome: 'Bruno Lima',
        matricula: '2023002',
        disciplinasConcluidas: ['disc-1'],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('não exclui aluno matriculado ou com solicitação pendente', async () => {
    const ctx = makeUseCases();
    await expect(ctx.alunos.excluir.execute('aluno-2')).rejects.toThrow(
      'matriculado',
    );

    await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await expect(ctx.alunos.excluir.execute('aluno-1')).rejects.toThrow(
      'pendentes',
    );
  });

  it('exclui aluno e leva junto o histórico de solicitações', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-1',
      disciplinaId: 'disc-2',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await ctx.solicitacoes.rejeitar.execute(s.id);
    await ctx.alunos.excluir.execute('aluno-1');
    expect(await ctx.repos.alunos.findById('aluno-1')).toBeNull();
    expect(await ctx.repos.solicitacoes.findById(s.id)).toBeNull();
  });
});

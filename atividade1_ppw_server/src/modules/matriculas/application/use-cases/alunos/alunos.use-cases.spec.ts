import { EventoSolicitacao, TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { atores, makeUseCases } from '../../../testing/make-use-cases';

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

  it('não exclui aluno matriculado, com solicitação em aberto ou com histórico de auditoria', async () => {
    const ctx = makeUseCases();
    await expect(ctx.alunos.excluir.execute('aluno-2')).rejects.toThrow(
      'matriculado',
    );

    const s = await ctx.solicitacoes.criar.execute(
      { alunoId: 'aluno-1', disciplinaId: 'disc-2', tipo: TipoSolicitacao.MATRICULA },
      atores.ana,
    );
    await expect(ctx.alunos.excluir.execute('aluno-1')).rejects.toThrow(
      'em aberto',
    );

    await ctx.agir(s.id, EventoSolicitacao.CANCELAR, atores.ana, 'desisti');
    await expect(ctx.alunos.excluir.execute('aluno-1')).rejects.toThrow(
      'trilha de auditoria',
    );
    expect(await ctx.repos.solicitacoes.findById(s.id)).toBeTruthy();
  });

  it('exclui aluno que nunca teve solicitação', async () => {
    const ctx = makeUseCases();
    const novo = await ctx.alunos.criar.execute({ nome: 'Fábio', matricula: '2024009' });
    await ctx.alunos.excluir.execute(novo.id);
    expect(await ctx.repos.alunos.findById(novo.id)).toBeNull();
  });
});

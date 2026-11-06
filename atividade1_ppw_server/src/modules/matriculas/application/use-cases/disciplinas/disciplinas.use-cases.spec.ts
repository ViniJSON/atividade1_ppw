import { TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { makeUseCases } from '../../../testing/make-use-cases';

describe('Disciplinas', () => {
  it('cria disciplina normalizando o código e barra código duplicado', async () => {
    const ctx = makeUseCases();
    const d = await ctx.disciplinas.criar.execute({
      codigo: ' red301 ',
      nome: 'Redes',
      vagasTotais: 30,
      preRequisitos: ['disc-1', 'disc-1'],
    });
    expect(d.codigo).toBe('RED301');
    expect(d.vagasOcupadas).toBe(0);
    expect(d.preRequisitos).toEqual(['disc-1']);

    await expect(
      ctx.disciplinas.criar.execute({ codigo: 'alg101', nome: 'X', vagasTotais: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejeita pré-requisito inexistente', async () => {
    const ctx = makeUseCases();
    await expect(
      ctx.disciplinas.criar.execute({
        codigo: 'Z1',
        nome: 'Z',
        vagasTotais: 1,
        preRequisitos: ['fantasma'],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('atualiza disciplina e protege vagas já ocupadas', async () => {
    const ctx = makeUseCases();
    const d = await ctx.disciplinas.atualizar.execute('disc-2', {
      codigo: 'ALG102',
      nome: 'Algoritmos II (rev.)',
      vagasTotais: 5,
      preRequisitos: ['disc-1'],
    });
    expect(d.nome).toBe('Algoritmos II (rev.)');
    expect(d.vagasTotais).toBe(5);

    await expect(
      ctx.disciplinas.atualizar.execute('disc-3', {
        codigo: 'BD201',
        nome: 'Banco de Dados',
        vagasTotais: 0, 
        preRequisitos: ['disc-1'],
      }),
    ).rejects.toThrow('vagas já ocupadas');
    await expect(
      ctx.disciplinas.atualizar.execute('nope', {
        codigo: 'N', nome: 'N', vagasTotais: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('barra pré-requisito de si mesma e dependência circular', async () => {
    const ctx = makeUseCases();
    await expect(
      ctx.disciplinas.atualizar.execute('disc-2', {
        codigo: 'ALG102', nome: 'A2', vagasTotais: 2, preRequisitos: ['disc-2'],
      }),
    ).rejects.toThrow('dependência circular');

    await expect(
      ctx.disciplinas.atualizar.execute('disc-1', {
        codigo: 'ALG101', nome: 'A1', vagasTotais: 2, preRequisitos: ['disc-2'],
      }),
    ).rejects.toThrow('dependência circular');
  });

  it('não exclui disciplina usada como pré-requisito ou com alunos matriculados', async () => {
    const ctx = makeUseCases();
    await expect(ctx.disciplinas.excluir.execute('disc-1')).rejects.toThrow(
      'pré-requisito',
    );
    await expect(ctx.disciplinas.excluir.execute('disc-3')).rejects.toThrow(
      'matriculados',
    );
  });

  it('não exclui com solicitação pendente; exclui limpando referências', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute({
      alunoId: 'aluno-3',
      disciplinaId: 'disc-4',
      tipo: TipoSolicitacao.MATRICULA,
    });
    await expect(ctx.disciplinas.excluir.execute('disc-4')).rejects.toThrow(
      'pendentes',
    );

    await ctx.solicitacoes.rejeitar.execute(s.id);
    await ctx.disciplinas.excluir.execute('disc-4');
    expect(await ctx.repos.disciplinas.findById('disc-4')).toBeNull();
    expect(await ctx.repos.solicitacoes.findById(s.id)).toBeNull();

    await ctx.disciplinas.excluir.execute('disc-2');
    expect((await ctx.repos.alunos.findById('aluno-3'))?.disciplinasConcluidas).toEqual(['disc-1']);
  });
});

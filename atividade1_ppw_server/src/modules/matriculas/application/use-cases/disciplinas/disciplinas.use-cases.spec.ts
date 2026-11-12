import { Disciplina } from '../../../domain/entities/disciplina.entity';
import { EventoSolicitacao, TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import { InMemoryDisciplinaRepository } from '../../../infrastructure/persistence/in-memory/in-memory-disciplina.repository';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../../domain/errors/domain.errors';
import { atores, makeUseCases } from '../../../testing/make-use-cases';

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

  it('não exclui disciplina com solicitações (em aberto ou histórico de auditoria)', async () => {
    const ctx = makeUseCases();
    const s = await ctx.solicitacoes.criar.execute(
      { alunoId: 'aluno-3', disciplinaId: 'disc-4', tipo: TipoSolicitacao.MATRICULA },
      atores.carla,
    );
    await expect(ctx.disciplinas.excluir.execute('disc-4')).rejects.toThrow('em aberto');

    await ctx.agir(s.id, EventoSolicitacao.CANCELAR, atores.carla, 'mudei de ideia');
    await expect(ctx.disciplinas.excluir.execute('disc-4')).rejects.toThrow('trilha de auditoria');
  });

  it('exclui disciplina livre limpando a referência nas disciplinas concluídas dos alunos', async () => {
    const ctx = makeUseCases();
    const extra = await ctx.disciplinas.criar.execute({ codigo: 'zzz100', nome: 'Extra', vagasTotais: 5 });
    await ctx.alunos.atualizar.execute('aluno-3', {
      nome: 'Carla Dias',
      matricula: '2023003',
      disciplinasConcluidas: ['disc-1', 'disc-2', extra.id],
    });

    await ctx.disciplinas.excluir.execute(extra.id);
    expect(await ctx.repos.disciplinas.findById(extra.id)).toBeNull();
    expect((await ctx.repos.alunos.findById('aluno-3'))?.disciplinasConcluidas).toEqual(['disc-1', 'disc-2']);
  });

  it('valida a grade de horários e preserva a grade quando a atualização não a informa', async () => {
    const ctx = makeUseCases();
    await expect(
      ctx.disciplinas.criar.execute({
        codigo: 'H1', nome: 'H', vagasTotais: 1,
        horarios: [{ dia: 8, inicio: '08:00', fim: '10:00' }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(
      ctx.disciplinas.criar.execute({
        codigo: 'H2', nome: 'H', vagasTotais: 1,
        horarios: [{ dia: 1, inicio: '10:00', fim: '08:00' }],
      }),
    ).rejects.toThrow('anterior ao fim');
    await expect(
      ctx.disciplinas.criar.execute({
        codigo: 'H3', nome: 'H', vagasTotais: 1,
        horarios: [{ dia: 1, inicio: '08:00', fim: '10:00' }, { dia: 1, inicio: '09:00', fim: '11:00' }],
      }),
    ).rejects.toThrow('sobrepostos');

    const antes = (await ctx.repos.disciplinas.findById('disc-1'))!.horarios;
    const d = await ctx.disciplinas.atualizar.execute('disc-1', { codigo: 'ALG101', nome: 'Algoritmos I', vagasTotais: 2 });
    expect(d.horarios).toEqual(antes);
  });

  it('valida existência de N pré-requisitos com UMA consulta em lote (sem N+1)', async () => {
    class Contador extends InMemoryDisciplinaRepository {
      porId = 0;
      emLote = 0;
      findById(id: string) { this.porId++; return super.findById(id); }
      findByIds(ids: string[]) { this.emLote++; return super.findByIds(ids); }
    }
    const repo = new Contador();
    const ctx = makeUseCases({ disciplinas: repo });
    for (let i = 0; i < 20; i++) {
      await repo.save(new Disciplina({ id: `p-${i}`, codigo: `P${i}`, nome: `P${i}`, vagasTotais: 1 }));
    }
    repo.porId = 0;
    repo.emLote = 0;
    await ctx.disciplinas.criar.execute({
      codigo: 'BIG1', nome: 'Muitos pré-requisitos', vagasTotais: 1,
      preRequisitos: Array.from({ length: 20 }, (_, i) => `p-${i}`),
    });
    expect(repo.emLote).toBe(1);
    expect(repo.porId).toBe(0);
  });
});

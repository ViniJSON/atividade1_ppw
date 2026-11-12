import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.config';

const como = (id: string, papel: string) => ({ 'X-Actor-Id': id, 'X-Actor-Role': papel });
const ana = como('aluno-1', 'ALUNO');
const bruno = como('aluno-2', 'ALUNO');
const coord = como('coord-1', 'COORDENADOR');
const sec = como('sec-1', 'SECRETARIA');

// Roda com PERSISTENCE=memory (padrão). Para validar contra o Postgres: PERSISTENCE=postgres DATABASE_URL=...
describe('API de matrículas (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lista os dados iniciais', async () => {
    const alunos = await request(app.getHttpServer()).get('/matriculas/alunos').expect(200);
    expect(alunos.body).toHaveLength(3);

    const disciplinas = await request(app.getHttpServer()).get('/matriculas/disciplinas').expect(200);
    expect(disciplinas.body).toHaveLength(5);
    expect(disciplinas.body[0].horarios.length).toBeGreaterThan(0);
  });

  it('CRUD de aluno com validação e erros de domínio', async () => {
    const http = request(app.getHttpServer());

    await http.post('/matriculas/alunos').send({ nome: '' }).expect(400);

    const criado = await http
      .post('/matriculas/alunos')
      .send({ nome: 'Davi', matricula: '2024001', disciplinasConcluidas: ['disc-1'] })
      .expect(201);

    await http.post('/matriculas/alunos').send({ nome: 'Dup', matricula: '2024001' }).expect(409);

    await http
      .put(`/matriculas/alunos/${criado.body.id}`)
      .send({ nome: 'Davi P.', matricula: '2024001' })
      .expect(200)
      .expect((res) => expect(res.body.nome).toBe('Davi P.'));

    await http.get(`/matriculas/alunos/${criado.body.id}`).expect(200);
    await http.delete(`/matriculas/alunos/${criado.body.id}`).expect(204);
    await http.get(`/matriculas/alunos/${criado.body.id}`).expect(404);
  });

  it('CRUD de disciplina, com grade de horários validada', async () => {
    const http = request(app.getHttpServer());

    await http.post('/matriculas/disciplinas').send({ codigo: 'X', nome: 'X', vagasTotais: 0 }).expect(400);
    await http
      .post('/matriculas/disciplinas')
      .send({ codigo: 'X', nome: 'X', vagasTotais: 1, horarios: [{ dia: 9, inicio: '08:00', fim: '10:00' }] })
      .expect(400);
    await http
      .post('/matriculas/disciplinas')
      .send({ codigo: 'X', nome: 'X', vagasTotais: 1, horarios: [{ dia: 1, inicio: '10:00', fim: '08:00' }] })
      .expect(400);

    const criada = await http
      .post('/matriculas/disciplinas')
      .send({
        codigo: 'red301', nome: 'Redes', vagasTotais: 10, preRequisitos: ['disc-1'],
        horarios: [{ dia: 5, inicio: '14:00', fim: '16:00' }],
      })
      .expect(201);
    expect(criada.body.codigo).toBe('RED301');
    expect(criada.body.horarios).toEqual([{ dia: 5, inicio: '14:00', fim: '16:00' }]);

    await http
      .put(`/matriculas/disciplinas/${criada.body.id}`)
      .send({ codigo: 'RED301', nome: 'Redes I', vagasTotais: 12 })
      .expect(200)
      .expect((res) => expect(res.body.horarios).toHaveLength(1)); // grade preservada

    await http.delete('/matriculas/disciplinas/disc-1').expect(400);
    await http.delete(`/matriculas/disciplinas/${criada.body.id}`).expect(204);
  });

  it('exige identificação do ator (401) e rejeita o papel interno SISTEMA', async () => {
    const http = request(app.getHttpServer());
    await http.get('/matriculas/solicitacoes').expect(401);
    await http.get('/matriculas/solicitacoes').set(como('x', 'SISTEMA')).expect(401);
    await http.get('/matriculas/solicitacoes').set(como('x', 'HACKER')).expect(401);
    await http.get('/matriculas/solicitacoes').set(ana).expect(200);
  });

  it('fluxo completo via HTTP: criar → analisar → aprovar → concluir, com trilha de auditoria', async () => {
    const http = request(app.getHttpServer());

    // `status` no corpo é descartado pelo ValidationPipe (whitelist): não há como forçar um estado.
    const criada = await http
      .post('/matriculas/solicitacoes')
      .set(ana)
      .send({ alunoId: 'aluno-1', disciplinaId: 'disc-2', tipo: 'MATRICULA', status: 'APROVADA' })
      .expect(201);
    const id = criada.body.id;
    expect(criada.body.status).toBe('PENDENTE');
    expect(criada.body.acoesPermitidas).toEqual(['CANCELAR']);

    await http.patch(`/matriculas/solicitacoes/${id}/aprovar`).set(ana).expect(403); // aluno não aprova
    await http.patch(`/matriculas/solicitacoes/${id}/aprovar`).set(coord).expect(409); // falta analisar
    await http.patch(`/matriculas/solicitacoes/${id}/rejeitar`).set(coord).send({}).expect(400); // sem justificativa
    await http.patch(`/matriculas/solicitacoes/${id}/iniciar-analise`).set(coord).expect(200);
    await http
      .patch(`/matriculas/solicitacoes/${id}/aprovar`)
      .set(coord)
      .expect(200)
      .expect((res) => expect(res.body.acoesPermitidas).toContain('REJEITAR'));
    await http.patch(`/matriculas/solicitacoes/${id}/concluir`).set(coord).expect(403); // quem aprova não efetiva
    await http
      .patch(`/matriculas/solicitacoes/${id}/concluir`)
      .set(sec)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('CONCLUIDA'));

    const historico = await http.get(`/matriculas/solicitacoes/${id}/historico`).set(coord).expect(200);
    expect(historico.body.map((h: { evento: string }) => h.evento)).toEqual([
      'CRIAR', 'INICIAR_ANALISE', 'APROVAR', 'CONCLUIR',
    ]);
    await http.get(`/matriculas/solicitacoes/${id}/historico`).set(bruno).expect(403);

    const disc = await http.get('/matriculas/disciplinas/disc-2').expect(200);
    expect(disc.body.vagasOcupadas).toBe(1);
  });

  it('não há PUT/DELETE de solicitação; recursos inexistentes retornam 404', async () => {
    const http = request(app.getHttpServer());
    await http.put('/matriculas/solicitacoes/x').set(coord).send({}).expect(404);
    await http.delete('/matriculas/solicitacoes/x').set(coord).expect(404);
    await http.patch('/matriculas/solicitacoes/nao-existe/aprovar').set(coord).expect(404);
    await http
      .post('/matriculas/solicitacoes')
      .set(ana)
      .send({ alunoId: 'aluno-1', disciplinaId: 'disc-1', tipo: 'OUTRO' })
      .expect(400);
  });

  it('varredura de SLA só pela coordenação', async () => {
    const http = request(app.getHttpServer());
    await http.post('/matriculas/solicitacoes/sla/processar').set(ana).expect(403);
    await http
      .post('/matriculas/solicitacoes/sla/processar')
      .set(coord)
      .expect(200)
      .expect((res) => expect(res.body).toEqual({ expiradas: [], escalonadas: [], falhas: [] }));
  });
});

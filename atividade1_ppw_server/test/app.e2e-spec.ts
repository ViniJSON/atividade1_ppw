import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.config';

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
    const alunos = await request(app.getHttpServer())
      .get('/matriculas/alunos')
      .expect(200);
    expect(alunos.body).toHaveLength(3);

    const disciplinas = await request(app.getHttpServer())
      .get('/matriculas/disciplinas')
      .expect(200);
    expect(disciplinas.body).toHaveLength(4);
  });

  it('CRUD de aluno com validação e erros de domínio', async () => {
    const http = request(app.getHttpServer());

    await http.post('/matriculas/alunos').send({ nome: '' }).expect(400);

    const criado = await http
      .post('/matriculas/alunos')
      .send({ nome: 'Davi', matricula: '2024001', disciplinasConcluidas: ['disc-1'] })
      .expect(201);

    await http
      .post('/matriculas/alunos')
      .send({ nome: 'Dup', matricula: '2024001' })
      .expect(409);

    await http
      .put(`/matriculas/alunos/${criado.body.id}`)
      .send({ nome: 'Davi P.', matricula: '2024001' })
      .expect(200)
      .expect((res) => expect(res.body.nome).toBe('Davi P.'));

    await http.get(`/matriculas/alunos/${criado.body.id}`).expect(200);
    await http.delete(`/matriculas/alunos/${criado.body.id}`).expect(204);
    await http.get(`/matriculas/alunos/${criado.body.id}`).expect(404);
  });

  it('CRUD de disciplina', async () => {
    const http = request(app.getHttpServer());

    await http
      .post('/matriculas/disciplinas')
      .send({ codigo: 'X', nome: 'X', vagasTotais: 0 })
      .expect(400);

    const criada = await http
      .post('/matriculas/disciplinas')
      .send({ codigo: 'red301', nome: 'Redes', vagasTotais: 10, preRequisitos: ['disc-1'] })
      .expect(201);
    expect(criada.body.codigo).toBe('RED301');

    await http
      .put(`/matriculas/disciplinas/${criada.body.id}`)
      .send({ codigo: 'RED301', nome: 'Redes I', vagasTotais: 12 })
      .expect(200);

    await http.delete('/matriculas/disciplinas/disc-1').expect(400);
    await http.delete(`/matriculas/disciplinas/${criada.body.id}`).expect(204);
  });

  it('fluxo completo de solicitação: criar, alterar, aprovar e bloquear exclusão', async () => {
    const http = request(app.getHttpServer());

    const criada = await http
      .post('/matriculas/solicitacoes')
      .send({ alunoId: 'aluno-1', disciplinaId: 'disc-4', tipo: 'MATRICULA' })
      .expect(201);
    expect(criada.body.preRequisitosOk).toBe(false);

    const alterada = await http
      .put(`/matriculas/solicitacoes/${criada.body.id}`)
      .send({ alunoId: 'aluno-1', disciplinaId: 'disc-2', tipo: 'MATRICULA' })
      .expect(200);
    expect(alterada.body.preRequisitosOk).toBe(true);

    await http
      .patch(`/matriculas/solicitacoes/${criada.body.id}/aprovar`)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('APROVADA'));

    await http.delete(`/matriculas/solicitacoes/${criada.body.id}`).expect(400);
  });

  it('retorna 400 para tipo inválido e 404 para recurso inexistente', async () => {
    const http = request(app.getHttpServer());
    await http
      .post('/matriculas/solicitacoes')
      .send({ alunoId: 'aluno-1', disciplinaId: 'disc-1', tipo: 'OUTRO' })
      .expect(400);
    await http.patch('/matriculas/solicitacoes/nao-existe/aprovar').expect(404);
  });
});

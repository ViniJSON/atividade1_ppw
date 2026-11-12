-- Dados iniciais equivalentes ao seed em memória (infrastructure/persistence/in-memory/seed.ts).
INSERT INTO disciplinas (id, codigo, nome, vagas_totais, vagas_ocupadas) VALUES
  ('disc-1', 'ALG101', 'Algoritmos I',           2, 1),
  ('disc-2', 'ALG102', 'Algoritmos II',          2, 0),
  ('disc-3', 'BD201',  'Banco de Dados',         1, 1),
  ('disc-4', 'ES301',  'Engenharia de Software', 3, 0),
  ('disc-5', 'RED202', 'Redes de Computadores',  5, 0);

INSERT INTO disciplina_pre_requisitos (disciplina_id, pre_requisito_id) VALUES
  ('disc-2', 'disc-1'),
  ('disc-3', 'disc-1'),
  ('disc-4', 'disc-1'),
  ('disc-4', 'disc-2');

INSERT INTO disciplina_horarios (disciplina_id, dia_semana, inicio, fim) VALUES
  ('disc-1', 1, '08:00', '10:00'), ('disc-1', 3, '08:00', '10:00'),
  ('disc-2', 1, '10:00', '12:00'), ('disc-2', 3, '10:00', '12:00'),
  ('disc-3', 2, '08:00', '10:00'), ('disc-3', 4, '08:00', '10:00'),
  ('disc-4', 1, '09:00', '11:00'),
  ('disc-5', 1, '08:30', '10:30');

INSERT INTO alunos (id, nome, matricula) VALUES
  ('aluno-1', 'Ana Souza',  '2023001'),
  ('aluno-2', 'Bruno Lima', '2023002'),
  ('aluno-3', 'Carla Dias', '2023003');

INSERT INTO aluno_concluidas (aluno_id, disciplina_id) VALUES
  ('aluno-1', 'disc-1'),
  ('aluno-3', 'disc-1'), ('aluno-3', 'disc-2');

INSERT INTO aluno_matriculas (aluno_id, disciplina_id) VALUES
  ('aluno-2', 'disc-1'),
  ('aluno-3', 'disc-3');

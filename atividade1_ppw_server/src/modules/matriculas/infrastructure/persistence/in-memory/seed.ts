import { Aluno } from '../../../domain/entities/aluno.entity';
import { Disciplina } from '../../../domain/entities/disciplina.entity';

export const criarDisciplinasSeed = (): Disciplina[] => [
  new Disciplina({
    id: 'disc-1',
    codigo: 'ALG101',
    nome: 'Algoritmos I',
    vagasTotais: 2,
    vagasOcupadas: 1,
    preRequisitos: [],
  }),
  new Disciplina({
    id: 'disc-2',
    codigo: 'ALG102',
    nome: 'Algoritmos II',
    vagasTotais: 2,
    vagasOcupadas: 0,
    preRequisitos: ['disc-1'],
  }),
  new Disciplina({
    id: 'disc-3',
    codigo: 'BD201',
    nome: 'Banco de Dados',
    vagasTotais: 1,
    vagasOcupadas: 1,
    preRequisitos: ['disc-1'],
  }),
  new Disciplina({
    id: 'disc-4',
    codigo: 'ES301',
    nome: 'Engenharia de Software',
    vagasTotais: 3,
    vagasOcupadas: 0,
    preRequisitos: ['disc-1', 'disc-2'],
  }),
];

export const criarAlunosSeed = (): Aluno[] => [
  new Aluno({
    id: 'aluno-1',
    nome: 'Ana Souza',
    matricula: '2023001',
    disciplinasConcluidas: ['disc-1'],
    disciplinasAtivas: [],
  }),
  new Aluno({
    id: 'aluno-2',
    nome: 'Bruno Lima',
    matricula: '2023002',
    disciplinasConcluidas: [],
    disciplinasAtivas: ['disc-1'],
  }),
  new Aluno({
    id: 'aluno-3',
    nome: 'Carla Dias',
    matricula: '2023003',
    disciplinasConcluidas: ['disc-1', 'disc-2'],
    disciplinasAtivas: ['disc-3'],
  }),
];

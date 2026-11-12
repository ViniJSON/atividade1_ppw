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
    horarios: [
      { dia: 1, inicio: '08:00', fim: '10:00' },
      { dia: 3, inicio: '08:00', fim: '10:00' },
    ],
  }),
  new Disciplina({
    id: 'disc-2',
    codigo: 'ALG102',
    nome: 'Algoritmos II',
    vagasTotais: 2,
    vagasOcupadas: 0,
    preRequisitos: ['disc-1'],
    horarios: [
      { dia: 1, inicio: '10:00', fim: '12:00' },
      { dia: 3, inicio: '10:00', fim: '12:00' },
    ],
  }),
  new Disciplina({
    id: 'disc-3',
    codigo: 'BD201',
    nome: 'Banco de Dados',
    vagasTotais: 1,
    vagasOcupadas: 1,
    preRequisitos: ['disc-1'],
    horarios: [
      { dia: 2, inicio: '08:00', fim: '10:00' },
      { dia: 4, inicio: '08:00', fim: '10:00' },
    ],
  }),
  new Disciplina({
    id: 'disc-4',
    codigo: 'ES301',
    nome: 'Engenharia de Software',
    vagasTotais: 3,
    vagasOcupadas: 0,
    preRequisitos: ['disc-1', 'disc-2'],
    horarios: [{ dia: 1, inicio: '09:00', fim: '11:00' }],
  }),
  // Sem pré-requisitos, mas colide com ALG101 (seg 08–10) e ALG102 (seg/qua 10–12): serve para demonstrar o choque de horário.
  new Disciplina({
    id: 'disc-5',
    codigo: 'RED202',
    nome: 'Redes de Computadores',
    vagasTotais: 5,
    vagasOcupadas: 0,
    preRequisitos: [],
    horarios: [{ dia: 1, inicio: '08:30', fim: '10:30' }],
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

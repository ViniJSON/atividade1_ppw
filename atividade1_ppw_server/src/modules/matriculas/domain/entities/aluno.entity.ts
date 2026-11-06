import { BusinessRuleError } from '../errors/domain.errors';
import { Disciplina } from './disciplina.entity';

export interface AlunoProps {
  id: string;
  nome: string;
  matricula: string;
  disciplinasConcluidas?: string[];
  disciplinasAtivas?: string[];
}

export interface DadosAluno {
  nome: string;
  matricula: string;
  disciplinasConcluidas: string[];
}

export class Aluno {
  readonly id: string;
  nome: string;
  matricula: string;
  disciplinasConcluidas: string[];
  disciplinasAtivas: string[];

  constructor(props: AlunoProps) {
    this.id = props.id;
    this.nome = props.nome.trim();
    this.matricula = props.matricula.trim();
    this.disciplinasConcluidas = [...new Set(props.disciplinasConcluidas ?? [])];
    this.disciplinasAtivas = [...new Set(props.disciplinasAtivas ?? [])];
  }

  estaMatriculadoEm(disciplinaId: string): boolean {
    return this.disciplinasAtivas.includes(disciplinaId);
  }

  cumprePreRequisitosDe(disciplina: Disciplina): boolean {
    return disciplina.preRequisitos.every((id) =>
      this.disciplinasConcluidas.includes(id),
    );
  }

  matricularEm(disciplinaId: string): void {
    if (this.estaMatriculadoEm(disciplinaId)) {
      throw new BusinessRuleError('Aluno já está matriculado nesta disciplina');
    }
    this.disciplinasAtivas.push(disciplinaId);
  }

  trancar(disciplinaId: string): void {
    if (!this.estaMatriculadoEm(disciplinaId)) {
      throw new BusinessRuleError(
        'Aluno não está matriculado nesta disciplina, não é possível trancar',
      );
    }
    this.disciplinasAtivas = this.disciplinasAtivas.filter(
      (id) => id !== disciplinaId,
    );
  }

  removerConcluida(disciplinaId: string): void {
    this.disciplinasConcluidas = this.disciplinasConcluidas.filter(
      (id) => id !== disciplinaId,
    );
  }

  atualizar(dados: DadosAluno): void {
    const conflito = dados.disciplinasConcluidas.find((id) =>
      this.estaMatriculadoEm(id),
    );
    if (conflito) {
      throw new BusinessRuleError(
        'Uma disciplina em andamento não pode ser marcada como concluída',
      );
    }
    this.nome = dados.nome.trim();
    this.matricula = dados.matricula.trim();
    this.disciplinasConcluidas = [...new Set(dados.disciplinasConcluidas)];
  }
}

import { BusinessRuleError } from '../errors/domain.errors';

export interface DisciplinaProps {
  id: string;
  codigo: string;
  nome: string;
  vagasTotais: number;
  vagasOcupadas?: number;
  preRequisitos?: string[];
}

export interface DadosDisciplina {
  codigo: string;
  nome: string;
  vagasTotais: number;
  preRequisitos: string[];
}

export class Disciplina {
  readonly id: string;
  codigo: string;
  nome: string;
  vagasTotais: number;
  vagasOcupadas: number;
  preRequisitos: string[];

  constructor(props: DisciplinaProps) {
    this.id = props.id;
    this.codigo = Disciplina.normalizarCodigo(props.codigo);
    this.nome = props.nome.trim();
    this.vagasTotais = props.vagasTotais;
    this.vagasOcupadas = props.vagasOcupadas ?? 0;
    this.preRequisitos = [...new Set(props.preRequisitos ?? [])];
  }

  static normalizarCodigo(codigo: string): string {
    return codigo.trim().toUpperCase();
  }

  temVaga(): boolean {
    return this.vagasOcupadas < this.vagasTotais;
  }

  ocuparVaga(): void {
    if (!this.temVaga()) {
      throw new BusinessRuleError('Não há vaga disponível');
    }
    this.vagasOcupadas += 1;
  }

  liberarVaga(): void {
    this.vagasOcupadas = Math.max(0, this.vagasOcupadas - 1);
  }

  atualizar(dados: DadosDisciplina): void {
    if (dados.vagasTotais < this.vagasOcupadas) {
      throw new BusinessRuleError(
        `Vagas totais (${dados.vagasTotais}) não pode ser menor que as vagas já ocupadas (${this.vagasOcupadas})`,
      );
    }
    if (dados.preRequisitos.includes(this.id)) {
      throw new BusinessRuleError(
        'Uma disciplina não pode ser pré-requisito dela mesma',
      );
    }
    this.codigo = Disciplina.normalizarCodigo(dados.codigo);
    this.nome = dados.nome.trim();
    this.vagasTotais = dados.vagasTotais;
    this.preRequisitos = [...new Set(dados.preRequisitos)];
  }
}

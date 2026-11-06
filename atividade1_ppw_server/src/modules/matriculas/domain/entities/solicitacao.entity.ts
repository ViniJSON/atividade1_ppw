import { BusinessRuleError } from '../errors/domain.errors';
import {
  StatusSolicitacao,
  TipoSolicitacao,
} from '../enums/solicitacao.enums';

export interface SolicitacaoProps {
  id: string;
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
  status?: StatusSolicitacao;
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
  motivoRejeicao?: string;
  criadoEm?: string;
  avaliadoEm?: string;
}

export interface DadosSolicitacao {
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
}

export class Solicitacao {
  readonly id: string;
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
  motivoRejeicao?: string;
  readonly criadoEm: string;
  avaliadoEm?: string;

  constructor(props: SolicitacaoProps) {
    this.id = props.id;
    this.alunoId = props.alunoId;
    this.disciplinaId = props.disciplinaId;
    this.tipo = props.tipo;
    this.status = props.status ?? StatusSolicitacao.PENDENTE;
    this.preRequisitosOk = props.preRequisitosOk;
    this.vagaDisponivel = props.vagaDisponivel;
    this.motivoRejeicao = props.motivoRejeicao;
    this.criadoEm = props.criadoEm ?? new Date().toISOString();
    this.avaliadoEm = props.avaliadoEm;
  }

  estaPendente(): boolean {
    return this.status === StatusSolicitacao.PENDENTE;
  }

  atualizar(dados: DadosSolicitacao): void {
    if (!this.estaPendente()) {
      throw new BusinessRuleError(
        'Só é possível alterar solicitações pendentes',
      );
    }
    this.alunoId = dados.alunoId;
    this.disciplinaId = dados.disciplinaId;
    this.tipo = dados.tipo;
    this.preRequisitosOk = dados.preRequisitosOk;
    this.vagaDisponivel = dados.vagaDisponivel;
  }

  aprovar(): void {
    this.garantirPendente();
    this.status = StatusSolicitacao.APROVADA;
    this.avaliadoEm = new Date().toISOString();
  }

  rejeitar(motivo?: string): void {
    this.garantirPendente();
    this.status = StatusSolicitacao.REJEITADA;
    this.motivoRejeicao = motivo?.trim() || 'Não informado';
    this.avaliadoEm = new Date().toISOString();
  }

  garantirPodeSerExcluida(): void {
    if (this.status === StatusSolicitacao.APROVADA) {
      throw new BusinessRuleError(
        'Solicitações aprovadas já foram efetivadas e não podem ser excluídas',
      );
    }
  }

  private garantirPendente(): void {
    if (!this.estaPendente()) {
      throw new BusinessRuleError('Solicitação já foi avaliada');
    }
  }
}

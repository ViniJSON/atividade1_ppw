import { StatusSolicitacao, STATUS_ABERTOS, TipoSolicitacao } from '../enums/solicitacao.enums';
import { adicionarDias, SlaConfig } from '../workflow/sla';

export interface SolicitacaoProps {
  id: string;
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
  status?: StatusSolicitacao;
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
  semConflitoHorario: boolean;
  ultimaJustificativa?: string;
  criadoEm: string;
  atualizadoEm?: string;
  prazoLimite: string;
  escalonarEm: string;
  escalonadaEm?: string;
  versao?: number;
}

export interface DadosNovaSolicitacao {
  id: string;
  alunoId: string;
  disciplinaId: string;
  tipo: TipoSolicitacao;
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
  semConflitoHorario: boolean;
}

export class Solicitacao {
  readonly id: string;
  readonly alunoId: string;
  readonly disciplinaId: string;
  readonly tipo: TipoSolicitacao;
  readonly preRequisitosOk: boolean;
  readonly vagaDisponivel: boolean;
  readonly semConflitoHorario: boolean;
  readonly criadoEm: string;
  private _status: StatusSolicitacao;
  ultimaJustificativa?: string;
  atualizadoEm: string;
  prazoLimite: string;
  escalonarEm: string;
  escalonadaEm?: string;
  versao: number;

  constructor(props: SolicitacaoProps) {
    this.id = props.id;
    this.alunoId = props.alunoId;
    this.disciplinaId = props.disciplinaId;
    this.tipo = props.tipo;
    this._status = props.status ?? StatusSolicitacao.PENDENTE;
    this.preRequisitosOk = props.preRequisitosOk;
    this.vagaDisponivel = props.vagaDisponivel;
    this.semConflitoHorario = props.semConflitoHorario;
    this.ultimaJustificativa = props.ultimaJustificativa;
    this.criadoEm = props.criadoEm;
    this.atualizadoEm = props.atualizadoEm ?? props.criadoEm;
    this.prazoLimite = props.prazoLimite;
    this.escalonarEm = props.escalonarEm;
    this.escalonadaEm = props.escalonadaEm;
    this.versao = props.versao ?? 0;
  }

  static abrir(dados: DadosNovaSolicitacao, agora: Date, sla: SlaConfig): Solicitacao {
    return new Solicitacao({
      ...dados,
      criadoEm: agora.toISOString(),
      prazoLimite: adicionarDias(agora, sla.prazoDias).toISOString(),
      escalonarEm: adicionarDias(agora, sla.escalonamentoDias).toISOString(),
    });
  }

  get status(): StatusSolicitacao {
    return this._status;
  }

  estaAberta(): boolean {
    return STATUS_ABERTOS.includes(this._status);
  }

  prazoVencido(agora: Date): boolean {
    return agora.getTime() > new Date(this.prazoLimite).getTime();
  }

  escalonamentoDevido(agora: Date): boolean {
    return !this.escalonadaEm && agora.getTime() >= new Date(this.escalonarEm).getTime();
  }

  transitarPara(novo: StatusSolicitacao, agora: Date, justificativa?: string): void {
    this._status = novo;
    this.atualizadoEm = agora.toISOString();
    if (justificativa) this.ultimaJustificativa = justificativa;
  }

  reiniciarPrazo(agora: Date, sla: SlaConfig): void {
    this.prazoLimite = adicionarDias(agora, sla.prazoDias).toISOString();
    this.escalonarEm = adicionarDias(agora, sla.escalonamentoDias).toISOString();
    this.escalonadaEm = undefined;
  }

  marcarEscalonada(agora: Date): void {
    this.escalonadaEm = agora.toISOString();
  }
}

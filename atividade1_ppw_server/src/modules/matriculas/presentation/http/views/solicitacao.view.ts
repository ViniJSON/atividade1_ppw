import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { EventoSolicitacao, PapelUsuario } from '../../../domain/enums/solicitacao.enums';
import { SolicitacaoStateMachine } from '../../../domain/workflow/solicitacao.state-machine';

/**
 * Representação HTTP da solicitação. `acoesPermitidas` vem da própria máquina de estados
 * (estado atual × papel de quem consulta): a UI só desenha botões de ações possíveis,
 * mas a validação real continua no servidor.
 */
export function toSolicitacaoView(s: Solicitacao, maquina: SolicitacaoStateMachine, papel: PapelUsuario) {
  return {
    id: s.id,
    alunoId: s.alunoId,
    disciplinaId: s.disciplinaId,
    tipo: s.tipo,
    status: s.status,
    preRequisitosOk: s.preRequisitosOk,
    vagaDisponivel: s.vagaDisponivel,
    semConflitoHorario: s.semConflitoHorario,
    ultimaJustificativa: s.ultimaJustificativa,
    criadoEm: s.criadoEm,
    atualizadoEm: s.atualizadoEm,
    prazoLimite: s.prazoLimite,
    escalonarEm: s.escalonarEm,
    escalonadaEm: s.escalonadaEm,
    versao: s.versao,
    acoesPermitidas: maquina.acoesDisponiveis(s.status, papel) as EventoSolicitacao[],
  };
}

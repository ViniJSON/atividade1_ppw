import { Injectable } from '@nestjs/common';
import { EventoSolicitacao } from '../../../domain/enums/solicitacao.enums';
import { Clock } from '../../../domain/ports/clock';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';
import { SISTEMA } from '../../../domain/workflow/types';
import { TransicionarSolicitacaoUseCase } from './transicionar-solicitacao.use-case';

export interface ResultadoSla {
  expiradas: string[];
  escalonadas: string[];
  falhas: { id: string; evento: EventoSolicitacao; erro: string }[];
}

/**
 * Varredura de SLA. Cada item é processado em SUA PRÓPRIA transação (via Transicionar):
 * se um falhar, os demais seguem — uma solicitação problemática não trava o lote.
 * É idempotente: expirada/escalonada não volta a ser candidata.
 */
@Injectable()
export class ProcessarSlaUseCase {
  constructor(
    private readonly solicitacoes: SolicitacaoRepository,
    private readonly transicionar: TransicionarSolicitacaoUseCase,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<ResultadoSla> {
    const agora = this.clock.now();
    const resultado: ResultadoSla = { expiradas: [], escalonadas: [], falhas: [] };

    for (const s of await this.solicitacoes.findParaExpirar(agora)) {
      await this.tentar(resultado, s.id, EventoSolicitacao.EXPIRAR, 'Prazo de atendimento (SLA) vencido', resultado.expiradas);
    }
    for (const s of await this.solicitacoes.findParaEscalonar(agora)) {
      await this.tentar(resultado, s.id, EventoSolicitacao.ESCALONAR, 'SLA: solicitação sem decisão dentro do prazo de escalonamento', resultado.escalonadas);
    }
    return resultado;
  }

  private async tentar(
    resultado: ResultadoSla,
    id: string,
    evento: EventoSolicitacao,
    justificativa: string,
    destino: string[],
  ): Promise<void> {
    try {
      await this.transicionar.execute({ solicitacaoId: id, evento, actor: SISTEMA, justificativa });
      destino.push(id);
    } catch (err) {
      resultado.falhas.push({ id, evento, erro: err instanceof Error ? err.message : String(err) });
    }
  }
}

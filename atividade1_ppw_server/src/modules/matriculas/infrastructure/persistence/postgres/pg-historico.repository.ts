import { Injectable } from '@nestjs/common';
import { HistoricoSolicitacao, NovoHistorico } from '../../../domain/entities/historico-solicitacao';
import { EventoSolicitacao, PapelUsuario, StatusSolicitacao } from '../../../domain/enums/solicitacao.enums';
import { HistoricoRepository } from '../../../domain/repositories/historico.repository';
import { PgExecutor } from './pg-executor';

interface LinhaHistorico {
  id: string; // bigserial chega como string
  id_registro: string;
  evento: EventoSolicitacao;
  estado_anterior: StatusSolicitacao | null;
  novo_estado: StatusSolicitacao;
  autor_id: string;
  autor_papel: PapelUsuario;
  justificativa: string | null;
  metadados: Record<string, unknown>;
  criado_em: Date;
}

const COLUNAS = `id, id_registro, evento, estado_anterior, novo_estado, autor_id, autor_papel,
  justificativa, metadados, criado_em`;

const paraEntidade = (r: LinhaHistorico): HistoricoSolicitacao => ({
  id: String(r.id),
  idRegistro: r.id_registro,
  evento: r.evento,
  estadoAnterior: r.estado_anterior,
  novoEstado: r.novo_estado,
  autorId: r.autor_id,
  autorPapel: r.autor_papel,
  justificativa: r.justificativa,
  metadados: r.metadados,
  timestamp: r.criado_em.toISOString(),
});

/** Só INSERT e SELECT. UPDATE/DELETE são, além disso, bloqueados por trigger no banco. */
@Injectable()
export class PgHistoricoRepository extends HistoricoRepository {
  constructor(private readonly db: PgExecutor) {
    super();
  }

  async registrar(h: NovoHistorico): Promise<HistoricoSolicitacao> {
    const { rows } = await this.db.query<LinhaHistorico>(
      `INSERT INTO solicitacao_historico
         (id_registro, evento, estado_anterior, novo_estado, autor_id, autor_papel, justificativa, metadados, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
       RETURNING ${COLUNAS}`,
      [
        h.idRegistro, h.evento, h.estadoAnterior, h.novoEstado, h.autorId, h.autorPapel,
        h.justificativa, JSON.stringify(h.metadados), h.timestamp,
      ],
    );
    return paraEntidade(rows[0]);
  }

  async listarPorSolicitacao(idRegistro: string): Promise<HistoricoSolicitacao[]> {
    const { rows } = await this.db.query<LinhaHistorico>(
      `SELECT ${COLUNAS} FROM solicitacao_historico WHERE id_registro = $1 ORDER BY id`,
      [idRegistro],
    );
    return rows.map(paraEntidade);
  }
}

import { Injectable } from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import {
  STATUS_ABERTOS,
  STATUS_EM_ATENDIMENTO,
  StatusSolicitacao,
  TipoSolicitacao,
} from '../../../domain/enums/solicitacao.enums';
import { ConflictError } from '../../../domain/errors/domain.errors';
import { SolicitacaoRepository } from '../../../domain/repositories/solicitacao.repository';
import { PgExecutor } from './pg-executor';

interface LinhaSolicitacao {
  id: string;
  aluno_id: string;
  disciplina_id: string;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  pre_requisitos_ok: boolean;
  vaga_disponivel: boolean;
  sem_conflito_horario: boolean;
  ultima_justificativa: string | null;
  criado_em: Date;
  atualizado_em: Date;
  prazo_limite: Date;
  escalonar_em: Date;
  escalonada_em: Date | null;
  versao: number;
}

const COLUNAS = `id, aluno_id, disciplina_id, tipo, status, pre_requisitos_ok, vaga_disponivel,
  sem_conflito_horario, ultima_justificativa, criado_em, atualizado_em, prazo_limite,
  escalonar_em, escalonada_em, versao`;

const paraEntidade = (r: LinhaSolicitacao) =>
  new Solicitacao({
    id: r.id,
    alunoId: r.aluno_id,
    disciplinaId: r.disciplina_id,
    tipo: r.tipo,
    status: r.status,
    preRequisitosOk: r.pre_requisitos_ok,
    vagaDisponivel: r.vaga_disponivel,
    semConflitoHorario: r.sem_conflito_horario,
    ultimaJustificativa: r.ultima_justificativa ?? undefined,
    criadoEm: r.criado_em.toISOString(),
    atualizadoEm: r.atualizado_em.toISOString(),
    prazoLimite: r.prazo_limite.toISOString(),
    escalonarEm: r.escalonar_em.toISOString(),
    escalonadaEm: r.escalonada_em?.toISOString(),
    versao: r.versao,
  });

@Injectable()
export class PgSolicitacaoRepository extends SolicitacaoRepository {
  constructor(private readonly db: PgExecutor) {
    super();
  }

  private async buscar(where: string, params: unknown[] = [], sufixo = ''): Promise<Solicitacao[]> {
    const { rows } = await this.db.query<LinhaSolicitacao>(
      `SELECT ${COLUNAS} FROM solicitacoes ${where} ${sufixo}`,
      params,
    );
    return rows.map(paraEntidade);
  }

  findAll(): Promise<Solicitacao[]> {
    return this.buscar('', [], 'ORDER BY criado_em DESC');
  }

  async findById(id: string): Promise<Solicitacao | null> {
    return (await this.buscar('WHERE id = $1', [id]))[0] ?? null;
  }

  async findByIdForUpdate(id: string): Promise<Solicitacao | null> {
    return (await this.buscar('WHERE id = $1', [id], 'FOR UPDATE'))[0] ?? null;
  }

  findByAlunoId(alunoId: string): Promise<Solicitacao[]> {
    return this.buscar('WHERE aluno_id = $1', [alunoId], 'ORDER BY criado_em DESC');
  }

  findByDisciplinaId(disciplinaId: string): Promise<Solicitacao[]> {
    return this.buscar('WHERE disciplina_id = $1', [disciplinaId]);
  }

  async existeAberta(alunoId: string, disciplinaId: string, tipo: TipoSolicitacao): Promise<boolean> {
    const { rows } = await this.db.query(
      `SELECT 1 FROM solicitacoes
       WHERE aluno_id = $1 AND disciplina_id = $2 AND tipo = $3 AND status = ANY($4::text[]) LIMIT 1`,
      [alunoId, disciplinaId, tipo, STATUS_ABERTOS],
    );
    return rows.length > 0;
  }

  findParaExpirar(agora: Date): Promise<Solicitacao[]> {
    return this.buscar('WHERE status = ANY($1::text[]) AND prazo_limite < $2', [
      STATUS_EM_ATENDIMENTO,
      agora.toISOString(),
    ]);
  }

  findParaEscalonar(agora: Date): Promise<Solicitacao[]> {
    return this.buscar(
      `WHERE status = ANY($1::text[]) AND escalonada_em IS NULL
         AND escalonar_em <= $2 AND prazo_limite >= $2`,
      [[StatusSolicitacao.PENDENTE, StatusSolicitacao.EM_ANALISE], agora.toISOString()],
    );
  }

  async save(s: Solicitacao): Promise<void> {
    if (s.versao === 0) {
      await this.db.query(
        `INSERT INTO solicitacoes (${COLUNAS})
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, 1)`,
        [
          s.id, s.alunoId, s.disciplinaId, s.tipo, s.status, s.preRequisitosOk, s.vagaDisponivel,
          s.semConflitoHorario, s.ultimaJustificativa ?? null, s.criadoEm, s.atualizadoEm,
          s.prazoLimite, s.escalonarEm, s.escalonadaEm ?? null,
        ],
      );
      s.versao = 1;
      return;
    }
    const r = await this.db.query(
      `UPDATE solicitacoes
       SET status = $2, ultima_justificativa = $3, atualizado_em = $4, prazo_limite = $5,
           escalonar_em = $6, escalonada_em = $7, versao = versao + 1
       WHERE id = $1 AND versao = $8`,
      [
        s.id, s.status, s.ultimaJustificativa ?? null, s.atualizadoEm, s.prazoLimite,
        s.escalonarEm, s.escalonadaEm ?? null, s.versao,
      ],
    );
    if (r.rowCount === 0) {
      throw new ConflictError('A solicitação foi modificada por outra operação; recarregue e tente de novo');
    }
    s.versao += 1;
  }
}

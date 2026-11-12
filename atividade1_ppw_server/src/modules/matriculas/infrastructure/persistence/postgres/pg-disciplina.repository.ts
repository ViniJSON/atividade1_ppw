import { Injectable } from '@nestjs/common';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import { DisciplinaRepository } from '../../../domain/repositories/disciplina.repository';
import { Horario } from '../../../domain/value-objects/horario';
import { PgExecutor } from './pg-executor';

interface LinhaDisciplina {
  id: string;
  codigo: string;
  nome: string;
  vagas_totais: number;
  vagas_ocupadas: number;
  pre_requisitos: string[];
  horarios: Horario[];
}

// Disciplina + pré-requisitos + horários numa única consulta (sem N+1).
const SELECT_DISCIPLINA = `
  SELECT d.id, d.codigo, d.nome, d.vagas_totais, d.vagas_ocupadas,
    COALESCE((SELECT array_agg(p.pre_requisito_id ORDER BY p.pre_requisito_id)
              FROM disciplina_pre_requisitos p WHERE p.disciplina_id = d.id), '{}') AS pre_requisitos,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'dia', h.dia_semana,
                'inicio', to_char(h.inicio, 'HH24:MI'),
                'fim', to_char(h.fim, 'HH24:MI')) ORDER BY h.dia_semana, h.inicio)
              FROM disciplina_horarios h WHERE h.disciplina_id = d.id), '[]'::jsonb) AS horarios
  FROM disciplinas d`;

const paraEntidade = (r: LinhaDisciplina) =>
  new Disciplina({
    id: r.id,
    codigo: r.codigo,
    nome: r.nome,
    vagasTotais: r.vagas_totais,
    vagasOcupadas: r.vagas_ocupadas,
    preRequisitos: r.pre_requisitos,
    horarios: r.horarios,
  });

@Injectable()
export class PgDisciplinaRepository extends DisciplinaRepository {
  constructor(private readonly db: PgExecutor) {
    super();
  }

  async findAll(): Promise<Disciplina[]> {
    const { rows } = await this.db.query<LinhaDisciplina>(`${SELECT_DISCIPLINA} ORDER BY d.codigo`);
    return rows.map(paraEntidade);
  }

  async findById(id: string): Promise<Disciplina | null> {
    const { rows } = await this.db.query<LinhaDisciplina>(`${SELECT_DISCIPLINA} WHERE d.id = $1`, [id]);
    return rows[0] ? paraEntidade(rows[0]) : null;
  }

  /**
   * Lock pessimista na linha da disciplina: duas efetivações concorrentes para a última vaga são
   * serializadas aqui; a segunda só lê `vagas_ocupadas` depois que a primeira deu COMMIT.
   */
  async findByIdForUpdate(id: string): Promise<Disciplina | null> {
    await this.db.query('SELECT 1 FROM disciplinas WHERE id = $1 FOR UPDATE', [id]);
    return this.findById(id);
  }

  async findByIds(ids: string[]): Promise<Disciplina[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query<LinhaDisciplina>(
      `${SELECT_DISCIPLINA} WHERE d.id = ANY($1::text[])`,
      [[...new Set(ids)]],
    );
    return rows.map(paraEntidade);
  }

  async findByCodigo(codigo: string): Promise<Disciplina | null> {
    const { rows } = await this.db.query<LinhaDisciplina>(`${SELECT_DISCIPLINA} WHERE d.codigo = $1`, [
      Disciplina.normalizarCodigo(codigo),
    ]);
    return rows[0] ? paraEntidade(rows[0]) : null;
  }

  /**
   * CTE recursiva: percorre o grafo de pré-requisitos inteiro numa só ida ao banco.
   * `UNION` (e não `UNION ALL`) descarta duplicatas, então a recursão termina mesmo se
   * já existir ciclo nos dados.
   */
  async preRequisitosTransitivos(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const { rows } = await this.db.query<{ id: string }>(
      `WITH RECURSIVE alcance(id) AS (
         SELECT unnest($1::text[])
         UNION
         SELECT p.pre_requisito_id
         FROM disciplina_pre_requisitos p
         JOIN alcance a ON p.disciplina_id = a.id
       )
       SELECT id FROM alcance`,
      [ids],
    );
    return new Set(rows.map((r) => r.id));
  }

  save(d: Disciplina): Promise<void> {
    return this.db.atomicamente(async (tx) => {
      await tx.query(
        `INSERT INTO disciplinas (id, codigo, nome, vagas_totais, vagas_ocupadas)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET codigo = EXCLUDED.codigo, nome = EXCLUDED.nome,
           vagas_totais = EXCLUDED.vagas_totais, vagas_ocupadas = EXCLUDED.vagas_ocupadas`,
        [d.id, d.codigo, d.nome, d.vagasTotais, d.vagasOcupadas],
      );
      await tx.query('DELETE FROM disciplina_horarios WHERE disciplina_id = $1', [d.id]);
      await tx.query(
        `INSERT INTO disciplina_horarios (disciplina_id, dia_semana, inicio, fim)
         SELECT $1::text, t.dia, t.inicio, t.fim
         FROM unnest($2::smallint[], $3::time[], $4::time[]) AS t(dia, inicio, fim)`,
        [d.id, d.horarios.map((h) => h.dia), d.horarios.map((h) => h.inicio), d.horarios.map((h) => h.fim)],
      );
      await tx.query('DELETE FROM disciplina_pre_requisitos WHERE disciplina_id = $1', [d.id]);
      await tx.query(
        `INSERT INTO disciplina_pre_requisitos (disciplina_id, pre_requisito_id)
         SELECT $1::text, unnest($2::text[])`,
        [d.id, d.preRequisitos],
      );
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM disciplinas WHERE id = $1', [id]);
  }
}

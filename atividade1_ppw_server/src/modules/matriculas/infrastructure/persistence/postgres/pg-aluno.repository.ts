import { Injectable } from '@nestjs/common';
import { Aluno } from '../../../domain/entities/aluno.entity';
import { AlunoRepository } from '../../../domain/repositories/aluno.repository';
import { PgExecutor } from './pg-executor';

interface LinhaAluno {
  id: string;
  nome: string;
  matricula: string;
  concluidas: string[];
  ativas: string[];
}

const SELECT_ALUNO = `
  SELECT a.id, a.nome, a.matricula,
    COALESCE((SELECT array_agg(c.disciplina_id ORDER BY c.disciplina_id)
              FROM aluno_concluidas c WHERE c.aluno_id = a.id), '{}') AS concluidas,
    COALESCE((SELECT array_agg(m.disciplina_id ORDER BY m.disciplina_id)
              FROM aluno_matriculas m WHERE m.aluno_id = a.id), '{}') AS ativas
  FROM alunos a`;

const paraEntidade = (r: LinhaAluno) =>
  new Aluno({
    id: r.id,
    nome: r.nome,
    matricula: r.matricula,
    disciplinasConcluidas: r.concluidas,
    disciplinasAtivas: r.ativas,
  });

@Injectable()
export class PgAlunoRepository extends AlunoRepository {
  constructor(private readonly db: PgExecutor) {
    super();
  }

  async findAll(): Promise<Aluno[]> {
    const { rows } = await this.db.query<LinhaAluno>(`${SELECT_ALUNO} ORDER BY a.nome`);
    return rows.map(paraEntidade);
  }

  async findById(id: string): Promise<Aluno | null> {
    const { rows } = await this.db.query<LinhaAluno>(`${SELECT_ALUNO} WHERE a.id = $1`, [id]);
    return rows[0] ? paraEntidade(rows[0]) : null;
  }

  async findByIdForUpdate(id: string): Promise<Aluno | null> {
    await this.db.query('SELECT 1 FROM alunos WHERE id = $1 FOR UPDATE', [id]);
    return this.findById(id);
  }

  async findByMatricula(matricula: string): Promise<Aluno | null> {
    const { rows } = await this.db.query<LinhaAluno>(`${SELECT_ALUNO} WHERE a.matricula = $1`, [
      matricula.trim(),
    ]);
    return rows[0] ? paraEntidade(rows[0]) : null;
  }

  save(aluno: Aluno): Promise<void> {
    return this.db.atomicamente(async (tx) => {
      await tx.query(
        `INSERT INTO alunos (id, nome, matricula) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, matricula = EXCLUDED.matricula`,
        [aluno.id, aluno.nome, aluno.matricula],
      );
      for (const [tabela, ids] of [
        ['aluno_concluidas', aluno.disciplinasConcluidas],
        ['aluno_matriculas', aluno.disciplinasAtivas],
      ] as const) {
        await tx.query(
          `DELETE FROM ${tabela} WHERE aluno_id = $1 AND NOT (disciplina_id = ANY($2::text[]))`,
          [aluno.id, ids],
        );
        await tx.query(
          `INSERT INTO ${tabela} (aluno_id, disciplina_id)
           SELECT $1::text, unnest($2::text[]) ON CONFLICT DO NOTHING`,
          [aluno.id, ids],
        );
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM alunos WHERE id = $1', [id]);
  }
}

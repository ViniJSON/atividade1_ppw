import { Disciplina } from '../entities/disciplina.entity';
import { Horario, horariosConflitam } from '../value-objects/horario';

export interface ConflitoHorario {
  disciplina: Disciplina;
  candidato: Horario;
  existente: Horario;
}

/**
 * Função pura: compara a disciplina candidata com a grade atual do aluno.
 * Quem chama é responsável por carregar `ativas` de uma só vez (Disciplinas.findByIds),
 * evitando consultar disciplina por disciplina.
 */
export function encontrarConflitos(
  candidata: Disciplina,
  ativas: readonly Disciplina[],
): ConflitoHorario[] {
  const conflitos: ConflitoHorario[] = [];
  for (const outra of ativas) {
    if (outra.id === candidata.id) continue;
    for (const c of candidata.horarios) {
      for (const e of outra.horarios) {
        if (horariosConflitam(c, e)) {
          conflitos.push({ disciplina: outra, candidato: c, existente: e });
        }
      }
    }
  }
  return conflitos;
}

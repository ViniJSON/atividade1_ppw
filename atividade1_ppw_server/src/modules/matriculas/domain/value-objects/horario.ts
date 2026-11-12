import { BusinessRuleError } from '../errors/domain.errors';

/** Faixa semanal de aula. `dia`: 1 = segunda … 7 = domingo. Horas no formato "HH:MM". */
export interface Horario {
  dia: number;
  inicio: string;
  fim: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validarHorario(h: Horario): void {
  if (!Number.isInteger(h.dia) || h.dia < 1 || h.dia > 7) {
    throw new BusinessRuleError('Dia da semana do horário deve ser de 1 (segunda) a 7 (domingo)');
  }
  if (!HHMM.test(h.inicio) || !HHMM.test(h.fim)) {
    throw new BusinessRuleError('Horários devem estar no formato HH:MM');
  }
  if (h.inicio >= h.fim) {
    throw new BusinessRuleError(`Horário inválido: início (${h.inicio}) deve ser anterior ao fim (${h.fim})`);
  }
}

/**
 * Dois horários colidem se são no mesmo dia e os intervalos se sobrepõem.
 * Intervalos semiabertos: 08:00–10:00 e 10:00–12:00 NÃO colidem.
 * A comparação de strings "HH:MM" funciona porque o formato é zero-padded.
 */
export function horariosConflitam(a: Horario, b: Horario): boolean {
  return a.dia === b.dia && a.inicio < b.fim && b.inicio < a.fim;
}

export const NOMES_DIA = ['', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function descreverHorario(h: Horario): string {
  return `${NOMES_DIA[h.dia]} ${h.inicio}–${h.fim}`;
}

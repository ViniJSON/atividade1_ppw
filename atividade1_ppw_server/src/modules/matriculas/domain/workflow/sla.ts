const MS_DIA = 86_400_000;

/**
 * Configuração de SLA. Classe (e não interface) para poder ser usada como token de injeção do Nest.
 *  - prazoDias: tempo máximo de atendimento; vencido → evento EXPIRAR.
 *  - escalonamentoDias: após este tempo sem aprovação → evento ESCALONAR (alerta à coordenação).
 */
export class SlaConfig {
  constructor(
    readonly prazoDias: number = 7,
    readonly escalonamentoDias: number = 3,
  ) {}
}

export function adicionarDias(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * MS_DIA);
}

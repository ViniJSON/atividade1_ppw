const MS_DIA = 86_400_000;

export class SlaConfig {
  constructor(
    readonly prazoDias: number = 7,
    readonly escalonamentoDias: number = 3,
  ) {}
}

export function adicionarDias(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * MS_DIA);
}

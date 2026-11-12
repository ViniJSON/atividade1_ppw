import { Clock } from '../domain/ports/clock';

/** Relógio controlável para testar SLA/expiração sem esperar dias. */
export class RelogioFixo extends Clock {
  constructor(private atual: Date = new Date('2026-11-02T12:00:00.000Z')) {
    super();
  }

  now(): Date {
    return new Date(this.atual);
  }

  avancarDias(dias: number): void {
    this.atual = new Date(this.atual.getTime() + dias * 86_400_000);
  }
}

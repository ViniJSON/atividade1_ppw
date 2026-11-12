/** Relógio injetável: permite testar SLA/expiração sem esperar dias. */
export abstract class Clock {
  abstract now(): Date;
}

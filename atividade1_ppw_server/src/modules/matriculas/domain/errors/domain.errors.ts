export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {}

export class BusinessRuleError extends DomainError {}

export class ConflictError extends DomainError {}

/** O ator não tem permissão (RBAC) para executar a ação → HTTP 403. */
export class ForbiddenError extends DomainError {}

/** O evento não é permitido no estado atual da máquina de estados → HTTP 409. */
export class TransicaoInvalidaError extends ConflictError {}

/** Uma guarda de transição barrou a mudança de estado → HTTP 400. */
export class GuardViolationError extends BusinessRuleError {
  constructor(
    readonly guard: string,
    message: string,
  ) {
    super(message);
  }
}

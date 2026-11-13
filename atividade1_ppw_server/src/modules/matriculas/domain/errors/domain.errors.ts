export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {}

export class BusinessRuleError extends DomainError {}

export class ConflictError extends DomainError {}

export class ForbiddenError extends DomainError {}

export class TransicaoInvalidaError extends ConflictError {}

export class GuardViolationError extends BusinessRuleError {
  constructor(
    readonly guard: string,
    message: string,
  ) {
    super(message);
  }
}

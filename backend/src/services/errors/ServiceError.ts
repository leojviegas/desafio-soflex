/**
 * Error base de la capa de servicios de aplicación.
 */
export class ServiceError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown> | null;

  constructor(
    code: string,
    message: string,
    details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string, details: Record<string, unknown> | null = null) {
    super('NOT_FOUND', message, details);
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string, details: Record<string, unknown> | null = null) {
    super('CONFLICT', message, details);
  }
}

export class BusinessRuleError extends ServiceError {
  constructor(message: string, details: Record<string, unknown> | null = null) {
    super('BUSINESS_RULE_ERROR', message, details);
  }
}

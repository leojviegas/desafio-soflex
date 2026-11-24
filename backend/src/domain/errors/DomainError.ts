/**
 * Error base de dominio, independiente del transporte HTTP.
 */
export class DomainError extends Error {
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

/**
 * Error por incumplimiento de reglas o invariantes de datos del dominio.
 */
export class DomainValidationError extends DomainError {
  constructor(message: string, details: Record<string, unknown> | null = null) {
    super('DOMAIN_VALIDATION_ERROR', message, details);
  }
}

/**
 * Error cuando se intenta mutar o transicionar una CartaLlamada en un estado incompatible.
 */
export class InvalidStateTransitionError extends DomainError {
  constructor(message: string, details: Record<string, unknown> | null = null) {
    super('INVALID_STATE_TRANSITION', message, details);
  }
}

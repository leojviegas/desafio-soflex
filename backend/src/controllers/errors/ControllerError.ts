import { z } from 'zod';

export type RequestValidationSource = 'body' | 'query' | 'params';

/**
 * Error base de la capa de controladores HTTP.
 */
export class ControllerError extends Error {
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
 * Error de validación de entrada HTTP (`req.body`, `req.query` o `req.params`).
 */
export class RequestValidationError extends ControllerError {
  constructor(message: string, details: Record<string, unknown> | null = null) {
    super('REQUEST_VALIDATION_ERROR', message, details);
  }

  static fromZodError(
    zodError: z.ZodError,
    source: RequestValidationSource = 'body',
  ): RequestValidationError {
    const firstIssue = zodError.issues[0];
    const message = firstIssue
      ? firstIssue.message
      : 'Datos de entrada inválidos.';

    const issues = zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return new RequestValidationError(message, { source, issues });
  }
}

/**
 * Valida datos de una petición HTTP con un esquema Zod y lanza `RequestValidationError` ante fallo.
 */
export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
  source: RequestValidationSource = 'body',
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw RequestValidationError.fromZodError(result.error, source);
  }
  return result.data;
}

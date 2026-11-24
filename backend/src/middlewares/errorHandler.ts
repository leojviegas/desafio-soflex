import type { ErrorRequestHandler } from 'express';
import { RequestValidationError } from '../controllers/index.js';
import {
  DomainValidationError,
  InvalidStateTransitionError,
} from '../domain/index.js';
import {
  AiProviderConfigError,
  AiProviderError,
  AiProviderUnavailableError,
  sanitizarMensajeErrorIA,
} from '../providers/ai/index.js';
import {
  DuplicateEntityError,
  EntityNotFoundError,
} from '../repositories/index.js';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../services/index.js';

type ErrorConstructor = abstract new (...args: never[]) => Error;

const HTTP_STATUS_BY_ERROR: ReadonlyArray<
  readonly [ErrorConstructor, number, string?]
> = [
  [RequestValidationError, 400],
  [DomainValidationError, 400],
  [BusinessRuleError, 400],
  [NotFoundError, 404],
  [EntityNotFoundError, 404, 'NOT_FOUND'],
  [InvalidStateTransitionError, 409],
  [ConflictError, 409],
  [DuplicateEntityError, 409, 'CONFLICT'],
  [AiProviderUnavailableError, 503],
  [AiProviderConfigError, 503],
];

function isJsonSyntaxError(err: unknown): boolean {
  if (!(err instanceof SyntaxError)) {
    return false;
  }
  const maybeBodyParserErr = err as SyntaxError & {
    status?: unknown;
    type?: unknown;
  };
  return (
    maybeBodyParserErr.status === 400 ||
    maybeBodyParserErr.type === 'entity.parse.failed'
  );
}

function extractCodeAndDetails(
  err: unknown,
  fallbackCode?: string,
): { code: string; details?: Record<string, unknown> } {
  const record = err as { code?: unknown; details?: unknown };
  const code =
    fallbackCode ??
    (typeof record.code === 'string' && record.code.length > 0
      ? record.code
      : 'INTERNAL_SERVER_ERROR');

  const details =
    record.details !== null &&
    record.details !== undefined &&
    typeof record.details === 'object'
      ? (record.details as Record<string, unknown>)
      : undefined;

  return { code, details };
}

/**
 * Middleware declarativo de manejo de errores HTTP sin exponer stack traces ni secretos.
 */
export function createErrorHandler(
  logger: Pick<Console, 'error'> = console,
): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (isJsonSyntaxError(err)) {
      res.status(400).json({
        error: 'El cuerpo de la petición debe ser un objeto JSON válido.',
        code: 'INVALID_JSON',
      });
      return;
    }

    const mapped = HTTP_STATUS_BY_ERROR.find(
      ([ErrorType]) => err instanceof ErrorType,
    );

    if (!mapped) {
      logger.error(`[http-error] ${sanitizarMensajeErrorIA(err)}`);
      res.status(500).json({
        error: 'Error interno del servidor.',
        code: 'INTERNAL_SERVER_ERROR',
      });
      return;
    }

    const [, status, forcedCode] = mapped;
    const { code, details } = extractCodeAndDetails(err, forcedCode);
    const message =
      err instanceof AiProviderError
        ? sanitizarMensajeErrorIA(err)
        : err instanceof Error
          ? err.message
          : 'Error de procesamiento.';

    const body: {
      error: string;
      code: string;
      details?: Record<string, unknown>;
    } = {
      error: message,
      code,
    };

    if (details && Object.keys(details).length > 0) {
      body.details = details;
    }

    res.status(status).json(body);
  };
}

export const errorHandler: ErrorRequestHandler = createErrorHandler();

/**
 * Error base para fallos en la capa de proveedores de IA.
 */
export class AiProviderError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code = 'AI_PROVIDER_ERROR',
    details?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

/**
 * Se lanza cuando faltan credenciales o configuración requerida para el proveedor seleccionado.
 */
export class AiProviderConfigError extends AiProviderError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, 'AI_PROVIDER_CONFIG_ERROR', details, options);
  }
}

/**
 * Se lanza cuando el proveedor remoto/local falla, agota el timeout o devuelve salida inválida
 * y el fallback a mock está deshabilitado.
 */
export class AiProviderUnavailableError extends AiProviderError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, 'AI_PROVIDER_UNAVAILABLE', details, options);
  }
}

/**
 * Extrae una descripción segura del error eliminando posibles credenciales en URLs o headers.
 */
export function sanitizarMensajeErrorIA(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message || error.name
      : typeof error === 'string'
        ? error
        : 'Error desconocido del proveedor de IA';

  const redacted = raw
    .replace(/([?&](?:key|api_key|apikey|token)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]')
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{12,})\b/g, '[REDACTED]')
    .trim();

  if (redacted.length <= 220) {
    return redacted;
  }
  return `${redacted.slice(0, 217)}...`;
}

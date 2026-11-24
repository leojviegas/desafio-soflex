import crypto from 'node:crypto';

/**
 * Genera un identificador único UUID v4 para entidades y objetos de valor.
 */
export function generarId(): string {
  return crypto.randomUUID();
}

/**
 * Error base de la capa de persistencia y repositorios.
 */
export class RepositoryError extends Error {
  readonly details: Record<string, unknown> | null;

  constructor(message: string, details: Record<string, unknown> | null = null) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

/**
 * Error cuando una entidad solicitada no existe en el repositorio.
 */
export class EntityNotFoundError extends RepositoryError {}

/**
 * Error cuando se intenta registrar una entidad con identificador duplicado.
 */
export class DuplicateEntityError extends RepositoryError {}

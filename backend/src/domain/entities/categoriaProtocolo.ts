import { DomainValidationError } from '../errors/DomainError.js';

export interface CategoriaProtocoloProps {
  id: number;
  nombre: string;
  etiqueta: string;
}

/**
 * Categoría macro del catálogo de protocolos (persistida en SQLite).
 */
export class CategoriaProtocolo {
  readonly id: number;
  readonly nombre: string;
  readonly etiqueta: string;

  constructor({ id, nombre, etiqueta }: CategoriaProtocoloProps) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new DomainValidationError(
        'El id de CategoriaProtocolo debe ser un entero positivo.',
        { id },
      );
    }
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length === 0) {
      throw new DomainValidationError(
        'El nombre de CategoriaProtocolo es obligatorio.',
      );
    }
    const etiquetaLimpia = etiqueta.trim();
    if (etiquetaLimpia.length === 0) {
      throw new DomainValidationError(
        'La etiqueta de CategoriaProtocolo es obligatoria.',
      );
    }

    this.id = id;
    this.nombre = nombreLimpio;
    this.etiqueta = etiquetaLimpia;
  }

  toJSON(): CategoriaProtocoloProps {
    return {
      id: this.id,
      nombre: this.nombre,
      etiqueta: this.etiqueta,
    };
  }
}

import { DomainValidationError } from '../errors/DomainError.js';

export interface SubcategoriaProtocoloProps {
  id: number;
  categoriaId: number;
  nombre: string;
  etiqueta: string;
  criterio: string;
}

/**
 * Subcategoría operativa específica perteneciente a una categoría del catálogo.
 */
export class SubcategoriaProtocolo {
  readonly id: number;
  readonly categoriaId: number;
  readonly nombre: string;
  readonly etiqueta: string;
  readonly criterio: string;

  constructor({
    id,
    categoriaId,
    nombre,
    etiqueta,
    criterio,
  }: SubcategoriaProtocoloProps) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new DomainValidationError(
        'El id de SubcategoriaProtocolo debe ser un entero positivo.',
        { id },
      );
    }
    if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
      throw new DomainValidationError(
        'El categoriaId de SubcategoriaProtocolo debe ser un entero positivo.',
        { categoriaId },
      );
    }
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length === 0) {
      throw new DomainValidationError(
        'El nombre de SubcategoriaProtocolo es obligatorio.',
      );
    }
    const etiquetaLimpia = etiqueta.trim();
    if (etiquetaLimpia.length === 0) {
      throw new DomainValidationError(
        'La etiqueta de SubcategoriaProtocolo es obligatoria.',
      );
    }
    const criterioLimpio = criterio.trim();
    if (criterioLimpio.length === 0) {
      throw new DomainValidationError(
        'El criterio de SubcategoriaProtocolo es obligatorio.',
      );
    }

    this.id = id;
    this.categoriaId = categoriaId;
    this.nombre = nombreLimpio;
    this.etiqueta = etiquetaLimpia;
    this.criterio = criterioLimpio;
  }

  toJSON(): SubcategoriaProtocoloProps {
    return {
      id: this.id,
      categoriaId: this.categoriaId,
      nombre: this.nombre,
      etiqueta: this.etiqueta,
      criterio: this.criterio,
    };
  }
}

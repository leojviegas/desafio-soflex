import { DomainValidationError } from '../errors/DomainError.js';

export interface InstruccionPreArriboDefProps {
  id: number;
  subcategoriaId: number;
  texto: string;
  critica: boolean;
}

/**
 * Directiva verificada de seguridad pre-arribo perteneciente a una subcategoría.
 */
export class InstruccionPreArriboDef {
  readonly id: number;
  readonly subcategoriaId: number;
  readonly texto: string;
  readonly critica: boolean;

  constructor({
    id,
    subcategoriaId,
    texto,
    critica,
  }: InstruccionPreArriboDefProps) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new DomainValidationError(
        'El id de InstruccionPreArriboDef debe ser un entero positivo.',
        { id },
      );
    }
    if (!Number.isInteger(subcategoriaId) || subcategoriaId <= 0) {
      throw new DomainValidationError(
        'El subcategoriaId de InstruccionPreArriboDef debe ser un entero positivo.',
        { subcategoriaId },
      );
    }
    const textoLimpio = texto.trim();
    if (textoLimpio.length === 0) {
      throw new DomainValidationError(
        'El texto de InstruccionPreArriboDef es obligatorio.',
      );
    }

    this.id = id;
    this.subcategoriaId = subcategoriaId;
    this.texto = textoLimpio;
    this.critica = Boolean(critica);
  }

  toJSON(): InstruccionPreArriboDefProps {
    return {
      id: this.id,
      subcategoriaId: this.subcategoriaId,
      texto: this.texto,
      critica: this.critica,
    };
  }
}

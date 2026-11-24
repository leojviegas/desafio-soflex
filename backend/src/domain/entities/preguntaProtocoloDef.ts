import { DomainValidationError } from '../errors/DomainError.js';

export interface PreguntaProtocoloDefProps {
  id: number;
  subcategoriaId: number | null;
  texto: string;
  critica: boolean;
  pistasMock?: readonly string[];
}

/**
 * Definición de pregunta de protocolo en el catálogo.
 * Cuando `subcategoriaId` es `null`, aplica de forma universal a toda llamada.
 */
export class PreguntaProtocoloDef {
  readonly id: number;
  readonly subcategoriaId: number | null;
  readonly texto: string;
  readonly critica: boolean;
  readonly pistasMock: readonly string[];

  constructor({
    id,
    subcategoriaId,
    texto,
    critica,
    pistasMock = [],
  }: PreguntaProtocoloDefProps) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new DomainValidationError(
        'El id de PreguntaProtocoloDef debe ser un entero positivo.',
        { id },
      );
    }
    if (
      subcategoriaId !== null &&
      (!Number.isInteger(subcategoriaId) || subcategoriaId <= 0)
    ) {
      throw new DomainValidationError(
        'El subcategoriaId de PreguntaProtocoloDef debe ser null o un entero positivo.',
        { subcategoriaId },
      );
    }
    const textoLimpio = texto.trim();
    if (textoLimpio.length === 0) {
      throw new DomainValidationError(
        'El texto de PreguntaProtocoloDef es obligatorio.',
      );
    }

    this.id = id;
    this.subcategoriaId = subcategoriaId;
    this.texto = textoLimpio;
    this.critica = Boolean(critica);
    this.pistasMock = Object.freeze(
      pistasMock.map((p) => p.trim()).filter((p) => p.length > 0),
    );
  }

  get esUniversal(): boolean {
    return this.subcategoriaId === null;
  }

  toJSON(): PreguntaProtocoloDefProps {
    return {
      id: this.id,
      subcategoriaId: this.subcategoriaId,
      texto: this.texto,
      critica: this.critica,
      pistasMock: [...this.pistasMock],
    };
  }
}

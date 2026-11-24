import { DomainValidationError } from '../errors/DomainError.js';

export interface ItemInstruccionPreArriboProps {
  instruccionId: number;
  texto: string;
  critica: boolean;
  transmitida?: boolean;
}

export interface ItemInstruccionPreArriboSnapshot {
  instruccionId: number;
  texto: string;
  critica: boolean;
  transmitida: boolean;
}

/**
 * Instrucción de pre-arribo instanciada dentro de una Llamada,
 * con seguimiento de si fue transmitida al ciudadano.
 */
export class ItemInstruccionPreArribo {
  readonly instruccionId: number;
  readonly texto: string;
  readonly critica: boolean;
  readonly transmitida: boolean;

  constructor({
    instruccionId,
    texto,
    critica,
    transmitida = false,
  }: ItemInstruccionPreArriboProps) {
    if (!Number.isInteger(instruccionId) || instruccionId <= 0) {
      throw new DomainValidationError(
        'El instruccionId de ItemInstruccionPreArribo debe ser un entero positivo.',
        { instruccionId },
      );
    }
    const textoLimpio = texto.trim();
    if (textoLimpio.length === 0) {
      throw new DomainValidationError(
        'El texto de ItemInstruccionPreArribo es obligatorio.',
      );
    }

    this.instruccionId = instruccionId;
    this.texto = textoLimpio;
    this.critica = Boolean(critica);
    this.transmitida = Boolean(transmitida);
  }

  conTransmitida(transmitida: boolean): ItemInstruccionPreArribo {
    return new ItemInstruccionPreArribo({
      instruccionId: this.instruccionId,
      texto: this.texto,
      critica: this.critica,
      transmitida,
    });
  }

  toSnapshot(): ItemInstruccionPreArriboSnapshot {
    return {
      instruccionId: this.instruccionId,
      texto: this.texto,
      critica: this.critica,
      transmitida: this.transmitida,
    };
  }

  toJSON(): ItemInstruccionPreArriboSnapshot {
    return this.toSnapshot();
  }
}

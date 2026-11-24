import {
  esHablanteTurno,
  type HablanteTurno,
} from '../enums/hablanteTurno.js';
import { DomainValidationError } from '../errors/DomainError.js';

export interface TurnoDialogoProps {
  indice: number;
  hablante: HablanteTurno;
  texto: string;
}

export interface TurnoDialogoSnapshot {
  indice: number;
  hablante: HablanteTurno;
  texto: string;
}

/**
 * Intervención individual derivada al vuelo desde la transcripción cruda.
 */
export class TurnoDialogo {
  readonly indice: number;
  readonly hablante: HablanteTurno;
  readonly texto: string;

  constructor({ indice, hablante, texto }: TurnoDialogoProps) {
    if (!Number.isInteger(indice) || indice <= 0) {
      throw new DomainValidationError(
        'El índice de TurnoDialogo debe ser un entero positivo.',
        { indice },
      );
    }
    if (!esHablanteTurno(hablante)) {
      throw new DomainValidationError(
        `HablanteTurno inválido: "${String(hablante)}".`,
        { hablante },
      );
    }
    const textoLimpio = texto.trim();
    if (textoLimpio.length === 0) {
      throw new DomainValidationError(
        'El texto de TurnoDialogo no puede estar vacío.',
      );
    }

    this.indice = indice;
    this.hablante = hablante;
    this.texto = textoLimpio;
  }

  toSnapshot(): TurnoDialogoSnapshot {
    return {
      indice: this.indice,
      hablante: this.hablante,
      texto: this.texto,
    };
  }

  toJSON(): TurnoDialogoSnapshot {
    return this.toSnapshot();
  }
}

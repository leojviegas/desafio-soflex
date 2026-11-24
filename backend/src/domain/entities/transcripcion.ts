import {
  esHablanteTurno,
  HablanteTurno,
} from '../enums/hablanteTurno.js';
import { DomainValidationError } from '../errors/DomainError.js';
import { normalizarParaComparacion } from '../utils/textoNormalizer.js';
import { TurnoDialogo } from './turnoDialogo.js';

const SPEAKER_REGEX = /\b(Operador|Llamante)\s*:\s*/gi;

/**
 * Objeto de valor inmutable que encapsula la transcripción textual de la llamada,
 * el parseo de turnos al vuelo y la verificación normalizada de citas de evidencia.
 */
export class Transcripcion {
  readonly textoCrudo: string;

  constructor(textoCrudo: string) {
    const limpio = textoCrudo.trim();
    if (limpio.length === 0) {
      throw new DomainValidationError(
        'La transcripción cruda no puede estar vacía.',
      );
    }
    this.textoCrudo = limpio;
  }

  /**
   * Deriva la lista ordenada de turnos de diálogo desde `textoCrudo`.
   * Si no hay prefijos explícitos (o hay texto previo al primero), se asigna a `LLAMANTE`.
   */
  obtenerTurnos(): TurnoDialogo[] {
    const matches = Array.from(this.textoCrudo.matchAll(SPEAKER_REGEX));
    if (matches.length === 0) {
      return [
        new TurnoDialogo({
          indice: 1,
          hablante: HablanteTurno.LLAMANTE,
          texto: this.textoCrudo,
        }),
      ];
    }

    const turnos: TurnoDialogo[] = [];

    const firstMatch = matches[0]!;
    if (firstMatch.index !== undefined && firstMatch.index > 0) {
      const preText = this.textoCrudo.slice(0, firstMatch.index).trim();
      if (preText.length > 0) {
        turnos.push(
          new TurnoDialogo({
            indice: turnos.length + 1,
            hablante: HablanteTurno.LLAMANTE,
            texto: preText,
          }),
        );
      }
    }

    for (let i = 0; i < matches.length; i += 1) {
      const current = matches[i]!;
      const next = matches[i + 1];
      const rawSpeaker = (current[1] ?? '').toUpperCase();
      const start = (current.index ?? 0) + current[0].length;
      const end = next?.index ?? this.textoCrudo.length;
      const texto = this.textoCrudo.slice(start, end).trim();

      if (texto.length === 0) {
        continue;
      }

      const hablante: HablanteTurno =
        rawSpeaker === 'OPERADOR'
          ? HablanteTurno.OPERADOR
          : HablanteTurno.LLAMANTE;

      turnos.push(
        new TurnoDialogo({
          indice: turnos.length + 1,
          hablante,
          texto,
        }),
      );
    }

    return turnos;
  }

  /**
   * Anexa un nuevo turno formateado y retorna una nueva instancia de `Transcripcion`.
   */
  anexarTurno(hablante: HablanteTurno, texto: string): Transcripcion {
    if (!esHablanteTurno(hablante)) {
      throw new DomainValidationError(
        `HablanteTurno inválido al anexar turno: "${String(hablante)}".`,
        { hablante },
      );
    }
    const textoLimpio = texto.trim();
    if (textoLimpio.length === 0) {
      throw new DomainValidationError(
        'El texto del turno a anexar no puede estar vacío.',
      );
    }

    const prefijo =
      hablante === HablanteTurno.OPERADOR ? 'Operador:' : 'Llamante:';
    return new Transcripcion(`${this.textoCrudo}\n${prefijo} ${textoLimpio}`);
  }

  /**
   * Verifica de forma determinista (sin tildes, signos ni mayúsculas) si una cita
   * textual figura efectivamente dentro de la transcripción cruda.
   */
  contieneEvidencia(cita: string | null | undefined): boolean {
    if (!cita) {
      return false;
    }
    const citaNormalizada = normalizarParaComparacion(cita);
    if (citaNormalizada.length < 2) {
      return false;
    }
    const textoNormalizado = normalizarParaComparacion(this.textoCrudo);
    return textoNormalizado.includes(citaNormalizada);
  }
}

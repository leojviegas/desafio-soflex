import {
  esEstadoPreguntaIA,
  type EstadoPreguntaIA,
} from '../enums/estadoPreguntaIA.js';
import {
  esEstadoPreguntaOperador,
  type EstadoPreguntaOperador,
} from '../enums/estadoPreguntaOperador.js';
import { DomainValidationError } from '../errors/DomainError.js';
import { limpiarTextoOpcional } from '../utils/textoNormalizer.js';

export interface ItemChecklistLlamadaProps {
  preguntaId: number;
  texto: string;
  critica: boolean;
  esUniversal: boolean;
  estadoIA: EstadoPreguntaIA;
  respuestaIA?: string | null;
  citaEvidencia?: string | null;
  evidenciaVerificada: boolean;
  estadoOperador?: EstadoPreguntaOperador | null;
  notaOperador?: string | null;
}

export interface ItemChecklistLlamadaSnapshot {
  preguntaId: number;
  texto: string;
  critica: boolean;
  esUniversal: boolean;
  estadoIA: EstadoPreguntaIA;
  respuestaIA: string | null;
  citaEvidencia: string | null;
  evidenciaVerificada: boolean;
  estadoOperador: EstadoPreguntaOperador | null;
  notaOperador: string | null;
}

export type EstadoEfectivoPregunta = EstadoPreguntaOperador | EstadoPreguntaIA;

/**
 * Ítem vivo del checklist de protocolo dentro de una Llamada.
 * Mantiene separados el plano sugerido por la IA y la validación humana del operador.
 */
export class ItemChecklistLlamada {
  readonly preguntaId: number;
  readonly texto: string;
  readonly critica: boolean;
  readonly esUniversal: boolean;
  readonly estadoIA: EstadoPreguntaIA;
  readonly respuestaIA: string | null;
  readonly citaEvidencia: string | null;
  readonly evidenciaVerificada: boolean;
  readonly estadoOperador: EstadoPreguntaOperador | null;
  readonly notaOperador: string | null;

  constructor(props: ItemChecklistLlamadaProps) {
    if (!Number.isInteger(props.preguntaId) || props.preguntaId <= 0) {
      throw new DomainValidationError(
        'El preguntaId de ItemChecklistLlamada debe ser un entero positivo.',
        { preguntaId: props.preguntaId },
      );
    }
    const textoLimpio = props.texto.trim();
    if (textoLimpio.length === 0) {
      throw new DomainValidationError(
        'El texto de ItemChecklistLlamada es obligatorio.',
      );
    }
    if (!esEstadoPreguntaIA(props.estadoIA)) {
      throw new DomainValidationError(
        `estadoIA inválido: "${String(props.estadoIA)}".`,
        { estadoIA: props.estadoIA },
      );
    }
    if (
      props.estadoOperador !== undefined &&
      props.estadoOperador !== null &&
      !esEstadoPreguntaOperador(props.estadoOperador)
    ) {
      throw new DomainValidationError(
        `estadoOperador inválido: "${String(props.estadoOperador)}".`,
        { estadoOperador: props.estadoOperador },
      );
    }

    this.preguntaId = props.preguntaId;
    this.texto = textoLimpio;
    this.critica = Boolean(props.critica);
    this.esUniversal = Boolean(props.esUniversal);
    this.estadoIA = props.estadoIA;
    this.respuestaIA = limpiarTextoOpcional(props.respuestaIA);
    this.citaEvidencia = limpiarTextoOpcional(props.citaEvidencia);
    this.evidenciaVerificada = Boolean(props.evidenciaVerificada);
    this.estadoOperador = props.estadoOperador ?? null;
    this.notaOperador = limpiarTextoOpcional(props.notaOperador);
  }

  estadoEfectivo(): EstadoEfectivoPregunta {
    return this.estadoOperador ?? this.estadoIA;
  }

  estaPendiente(): boolean {
    const efectivo = this.estadoEfectivo();
    return efectivo === 'PENDIENTE' || efectivo === 'AMBIGUA';
  }

  conDecisionOperador(
    estadoOperador: EstadoPreguntaOperador | null,
    notaOperador?: string | null,
  ): ItemChecklistLlamada {
    return new ItemChecklistLlamada({
      preguntaId: this.preguntaId,
      texto: this.texto,
      critica: this.critica,
      esUniversal: this.esUniversal,
      estadoIA: this.estadoIA,
      respuestaIA: this.respuestaIA,
      citaEvidencia: this.citaEvidencia,
      evidenciaVerificada: this.evidenciaVerificada,
      estadoOperador,
      notaOperador:
        notaOperador !== undefined ? notaOperador : this.notaOperador,
    });
  }

  /**
   * Actualiza la evaluación de IA preservando cualquier decisión previa del operador.
   */
  fusionarConAnalisis(nuevoItemIA: ItemChecklistLlamada): ItemChecklistLlamada {
    return new ItemChecklistLlamada({
      preguntaId: nuevoItemIA.preguntaId,
      texto: nuevoItemIA.texto,
      critica: nuevoItemIA.critica,
      esUniversal: nuevoItemIA.esUniversal,
      estadoIA: nuevoItemIA.estadoIA,
      respuestaIA: nuevoItemIA.respuestaIA,
      citaEvidencia: nuevoItemIA.citaEvidencia,
      evidenciaVerificada: nuevoItemIA.evidenciaVerificada,
      estadoOperador: this.estadoOperador,
      notaOperador: this.notaOperador,
    });
  }

  toSnapshot(): ItemChecklistLlamadaSnapshot {
    return {
      preguntaId: this.preguntaId,
      texto: this.texto,
      critica: this.critica,
      esUniversal: this.esUniversal,
      estadoIA: this.estadoIA,
      respuestaIA: this.respuestaIA,
      citaEvidencia: this.citaEvidencia,
      evidenciaVerificada: this.evidenciaVerificada,
      estadoOperador: this.estadoOperador,
      notaOperador: this.notaOperador,
    };
  }

  toJSON(): ItemChecklistLlamadaSnapshot {
    return this.toSnapshot();
  }
}

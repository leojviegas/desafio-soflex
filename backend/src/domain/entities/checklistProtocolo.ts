import { EstadoPreguntaIA } from '../enums/estadoPreguntaIA.js';
import type { EstadoPreguntaOperador } from '../enums/estadoPreguntaOperador.js';
import { DomainValidationError } from '../errors/DomainError.js';
import { limpiarTextoOpcional } from '../utils/textoNormalizer.js';
import {
  ItemChecklistLlamada,
  type ItemChecklistLlamadaSnapshot,
} from './itemChecklistLlamada.js';
import type { PreguntaProtocoloDef } from './preguntaProtocoloDef.js';
import type { Transcripcion } from './transcripcion.js';

export interface DeteccionPreguntaIA {
  preguntaId: number;
  estado: Exclude<EstadoPreguntaIA, 'PENDIENTE'>;
  respuestaExtraida: string;
  citaEvidencia: string;
}

/**
 * Colección de dominio que encapsula el checklist dinámico de una llamada,
 * la verificación de citas textuales y el cálculo fail-safe de preguntas pendientes por resta.
 */
export class ChecklistProtocolo {
  readonly items: readonly ItemChecklistLlamada[];

  constructor(items: readonly ItemChecklistLlamada[]) {
    const vistos = new Set<number>();
    for (const item of items) {
      if (vistos.has(item.preguntaId)) {
        throw new DomainValidationError(
          `Pregunta duplicada en ChecklistProtocolo: ${item.preguntaId}.`,
          { preguntaId: item.preguntaId },
        );
      }
      vistos.add(item.preguntaId);
    }
    this.items = Object.freeze([...items]);
  }

  static vacio(): ChecklistProtocolo {
    return new ChecklistProtocolo([]);
  }

  static desdeSnapshots(
    snapshots: readonly (ItemChecklistLlamada | ItemChecklistLlamadaSnapshot)[],
  ): ChecklistProtocolo {
    return new ChecklistProtocolo(
      snapshots.map((item) =>
        item instanceof ItemChecklistLlamada
          ? item
          : new ItemChecklistLlamada(item),
      ),
    );
  }

  /**
   * Paso 4 determinista:
   * - Descarta `preguntaId` ajenos al catálogo oficial de la subcategoría + universales.
   * - Verifica que `citaEvidencia` exista en `transcripcion`; si no existe, degrada a `AMBIGUA` con `evidenciaVerificada: false`.
   * - Agrega automáticamente como `PENDIENTE` toda pregunta oficial no detectada (cálculo por resta).
   */
  static construirDesdeDetecciones(
    preguntasOficiales: readonly PreguntaProtocoloDef[],
    deteccionesIA: readonly DeteccionPreguntaIA[],
    transcripcion: Transcripcion,
  ): ChecklistProtocolo {
    const idsPermitidos = new Set(preguntasOficiales.map((p) => p.id));
    const deteccionesPorId = new Map<number, DeteccionPreguntaIA>();

    for (const det of deteccionesIA) {
      if (!idsPermitidos.has(det.preguntaId)) {
        continue;
      }
      if (!deteccionesPorId.has(det.preguntaId)) {
        deteccionesPorId.set(det.preguntaId, det);
      }
    }

    const items = preguntasOficiales.map((pregunta) => {
      const deteccion = deteccionesPorId.get(pregunta.id);
      if (!deteccion) {
        return new ItemChecklistLlamada({
          preguntaId: pregunta.id,
          texto: pregunta.texto,
          critica: pregunta.critica,
          esUniversal: pregunta.esUniversal,
          estadoIA: EstadoPreguntaIA.PENDIENTE,
          respuestaIA: null,
          citaEvidencia: null,
          evidenciaVerificada: false,
        });
      }

      const citaLimpia = limpiarTextoOpcional(deteccion.citaEvidencia);
      const evidenciaVerificada = transcripcion.contieneEvidencia(citaLimpia);
      const estadoIA = evidenciaVerificada
        ? deteccion.estado
        : EstadoPreguntaIA.AMBIGUA;

      return new ItemChecklistLlamada({
        preguntaId: pregunta.id,
        texto: pregunta.texto,
        critica: pregunta.critica,
        esUniversal: pregunta.esUniversal,
        estadoIA,
        respuestaIA: limpiarTextoOpcional(deteccion.respuestaExtraida),
        citaEvidencia: citaLimpia,
        evidenciaVerificada,
      });
    });

    return new ChecklistProtocolo(items);
  }

  /**
   * Fusiona un nuevo checklist de análisis preservando `estadoOperador` y `notaOperador`
   * de todas las preguntas coincidentes.
   */
  fusionarConNuevoAnalisis(entrante: ChecklistProtocolo): ChecklistProtocolo {
    const previosPorId = new Map<number, ItemChecklistLlamada>(
      this.items.map((item) => [item.preguntaId, item]),
    );

    const fusionados = entrante.items.map((itemNuevo) => {
      const previo = previosPorId.get(itemNuevo.preguntaId);
      return previo ? previo.fusionarConAnalisis(itemNuevo) : itemNuevo;
    });

    return new ChecklistProtocolo(fusionados);
  }

  /**
   * Actualiza únicamente el plano IA de las preguntas coincidentes sin cambiar
   * la lista actual de preguntas (útil cuando el operador fijó manualmente la subcategoría).
   */
  actualizarEvidenciaSinCambiarProtocolo(
    entrante: ChecklistProtocolo,
  ): ChecklistProtocolo {
    const nuevosPorId = new Map<number, ItemChecklistLlamada>(
      entrante.items.map((item) => [item.preguntaId, item]),
    );

    const actualizados = this.items.map((actual) => {
      const nuevo = nuevosPorId.get(actual.preguntaId);
      return nuevo ? actual.fusionarConAnalisis(nuevo) : actual;
    });

    return new ChecklistProtocolo(actualizados);
  }

  /**
   * Recarga el checklist ante un cambio manual de subcategoría,
   * conservando el estado de las preguntas universales ya confirmadas o con evidencia previa.
   */
  recargarParaProtocolo(
    preguntasNuevas: readonly PreguntaProtocoloDef[],
  ): ChecklistProtocolo {
    const previosPorId = new Map<number, ItemChecklistLlamada>(
      this.items.map((item) => [item.preguntaId, item]),
    );

    const items = preguntasNuevas.map((pregunta) => {
      const previo = previosPorId.get(pregunta.id);
      if (
        previo &&
        pregunta.esUniversal &&
        (previo.estadoOperador !== null ||
          previo.notaOperador !== null ||
          previo.estadoIA !== EstadoPreguntaIA.PENDIENTE)
      ) {
        return previo;
      }

      return new ItemChecklistLlamada({
        preguntaId: pregunta.id,
        texto: pregunta.texto,
        critica: pregunta.critica,
        esUniversal: pregunta.esUniversal,
        estadoIA: EstadoPreguntaIA.PENDIENTE,
        respuestaIA: null,
        citaEvidencia: null,
        evidenciaVerificada: false,
      });
    });

    return new ChecklistProtocolo(items);
  }

  actualizarItemOperador(
    preguntaId: number,
    estadoOperador: EstadoPreguntaOperador | null,
    notaOperador?: string | null,
  ): ChecklistProtocolo {
    let encontrado = false;
    const actualizados = this.items.map((item) => {
      if (item.preguntaId !== preguntaId) {
        return item;
      }
      encontrado = true;
      return item.conDecisionOperador(estadoOperador, notaOperador);
    });

    if (!encontrado) {
      throw new DomainValidationError(
        `La pregunta ${preguntaId} no pertenece al checklist actual de la llamada.`,
        { preguntaId },
      );
    }

    return new ChecklistProtocolo(actualizados);
  }

  pendientes(): ItemChecklistLlamada[] {
    return this.items.filter((item) => item.estaPendiente());
  }

  respondidas(): ItemChecklistLlamada[] {
    return this.items.filter((item) => !item.estaPendiente());
  }

  criticasPendientes(): ItemChecklistLlamada[] {
    return this.items.filter((item) => item.critica && item.estaPendiente());
  }

  toSnapshots(): ItemChecklistLlamadaSnapshot[] {
    return this.items.map((item) => item.toSnapshot());
  }
}

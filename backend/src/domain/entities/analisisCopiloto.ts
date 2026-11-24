import {
  esNivelCerteza,
  type NivelCerteza,
} from '../enums/nivelCerteza.js';
import {
  esPrioridadIncidente,
  type PrioridadIncidente,
} from '../enums/prioridadIncidente.js';
import type { ProveedorIA } from '../enums/proveedorIA.js';
import { DomainValidationError } from '../errors/DomainError.js';
import {
  ChecklistProtocolo,
  type DeteccionPreguntaIA,
} from './checklistProtocolo.js';
import type {
  ItemChecklistLlamada,
  ItemChecklistLlamadaSnapshot,
} from './itemChecklistLlamada.js';
import {
  ItemInstruccionPreArribo,
  type ItemInstruccionPreArriboSnapshot,
} from './itemInstruccionPreArribo.js';
import {
  MetadatosEjecucionIA,
  type MetadatosEjecucionIAProps,
} from './metadatosEjecucionIA.js';
import type { ProtocoloSubcategoria } from './protocoloSubcategoria.js';
import type { Transcripcion } from './transcripcion.js';
import {
  UbicacionNormalizada,
  type UbicacionNormalizadaProps,
  type UbicacionNormalizadaSnapshot,
} from './ubicacionNormalizada.js';

export interface AnalisisCopilotoSnapshot {
  categoriaId: number;
  subcategoriaId: number;
  descripcionIncidente: string;
  ubicacion: UbicacionNormalizadaSnapshot;
  prioridadSugerida: PrioridadIncidente;
  checklist: ItemChecklistLlamadaSnapshot[];
  instruccionesPreArribo: ItemInstruccionPreArriboSnapshot[];
  riesgosDetectados: string[];
  recursosRecomendadosDespacho: string[];
  notasOperativasDespacho: string;
  confianzaGlobal: NivelCerteza;
  proveedorUsado: ProveedorIA;
  modeloUsado: string;
  latenciaMs: number;
  degradado: boolean;
  motivoDegradacion: string | null;
}

export interface AnalisisCopilotoProps {
  categoriaId: number;
  subcategoriaId: number;
  descripcionIncidente: string;
  ubicacion: UbicacionNormalizada | UbicacionNormalizadaProps;
  prioridadSugerida: PrioridadIncidente;
  checklist:
    | ChecklistProtocolo
    | readonly (ItemChecklistLlamada | ItemChecklistLlamadaSnapshot)[];
  instruccionesPreArribo: readonly (
    | ItemInstruccionPreArribo
    | ItemInstruccionPreArriboSnapshot
  )[];
  riesgosDetectados: readonly string[];
  recursosRecomendadosDespacho: readonly string[];
  notasOperativasDespacho: string;
  confianzaGlobal: NivelCerteza;
  metadatos?: MetadatosEjecucionIA;
  proveedorUsado?: ProveedorIA;
  modeloUsado?: string;
  latenciaMs?: number;
  degradado?: boolean;
  motivoDegradacion?: string | null;
}

export interface ConsolidarAnalisisInput {
  protocolo: ProtocoloSubcategoria;
  transcripcion: Transcripcion;
  descripcionIncidente: string;
  ubicacion: UbicacionNormalizada | UbicacionNormalizadaProps;
  prioridadSugerida: PrioridadIncidente;
  preguntasDetectadas: readonly DeteccionPreguntaIA[];
  riesgosDetectados: readonly string[];
  recursosRecomendadosDespacho: readonly string[];
  notasOperativasDespacho: string;
  confianzaGlobal: NivelCerteza;
  metadatos: MetadatosEjecucionIA | MetadatosEjecucionIAProps;
}

function normalizarListaStrings(items: readonly string[]): string[] {
  return items.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Objeto de valor inmutable con la salida consolidada del análisis del copiloto
 * (sugerencias de tipología, ubicación, checklist verificado, pre-arribo y telemetría).
 */
export class AnalisisCopiloto {
  readonly categoriaId: number;
  readonly subcategoriaId: number;
  readonly descripcionIncidente: string;
  readonly ubicacion: UbicacionNormalizada;
  readonly prioridadSugerida: PrioridadIncidente;
  readonly checklistProtocolo: ChecklistProtocolo;
  readonly instruccionesPreArribo: readonly ItemInstruccionPreArribo[];
  readonly riesgosDetectados: readonly string[];
  readonly recursosRecomendadosDespacho: readonly string[];
  readonly notasOperativasDespacho: string;
  readonly confianzaGlobal: NivelCerteza;
  readonly metadatos: MetadatosEjecucionIA;

  constructor(props: AnalisisCopilotoProps) {
    if (!Number.isInteger(props.categoriaId) || props.categoriaId <= 0) {
      throw new DomainValidationError(
        'El categoriaId de AnalisisCopiloto debe ser un entero positivo.',
        { categoriaId: props.categoriaId },
      );
    }
    if (!Number.isInteger(props.subcategoriaId) || props.subcategoriaId <= 0) {
      throw new DomainValidationError(
        'El subcategoriaId de AnalisisCopiloto debe ser un entero positivo.',
        { subcategoriaId: props.subcategoriaId },
      );
    }
    const descripcionLimpia = props.descripcionIncidente.trim();
    if (descripcionLimpia.length === 0) {
      throw new DomainValidationError(
        'La descripcionIncidente de AnalisisCopiloto es obligatoria.',
      );
    }
    if (!esPrioridadIncidente(props.prioridadSugerida)) {
      throw new DomainValidationError(
        `prioridadSugerida inválida: "${String(props.prioridadSugerida)}".`,
        { prioridadSugerida: props.prioridadSugerida },
      );
    }
    if (!esNivelCerteza(props.confianzaGlobal)) {
      throw new DomainValidationError(
        `confianzaGlobal inválida: "${String(props.confianzaGlobal)}".`,
        { confianzaGlobal: props.confianzaGlobal },
      );
    }

    const metadatos =
      props.metadatos instanceof MetadatosEjecucionIA
        ? props.metadatos
        : new MetadatosEjecucionIA({
            proveedorUsado: props.proveedorUsado as ProveedorIA,
            modeloUsado: props.modeloUsado ?? '',
            latenciaMs: props.latenciaMs ?? -1,
            degradado: props.degradado ?? false,
            motivoDegradacion: props.motivoDegradacion ?? null,
          });

    this.categoriaId = props.categoriaId;
    this.subcategoriaId = props.subcategoriaId;
    this.descripcionIncidente = descripcionLimpia;
    this.ubicacion =
      props.ubicacion instanceof UbicacionNormalizada
        ? props.ubicacion
        : new UbicacionNormalizada(props.ubicacion);
    this.prioridadSugerida = props.prioridadSugerida;
    this.checklistProtocolo =
      props.checklist instanceof ChecklistProtocolo
        ? props.checklist
        : ChecklistProtocolo.desdeSnapshots(props.checklist);
    this.instruccionesPreArribo = Object.freeze(
      props.instruccionesPreArribo.map((item) =>
        item instanceof ItemInstruccionPreArribo
          ? item
          : new ItemInstruccionPreArribo(item),
      ),
    );
    this.riesgosDetectados = Object.freeze(
      normalizarListaStrings(props.riesgosDetectados),
    );
    this.recursosRecomendadosDespacho = Object.freeze(
      normalizarListaStrings(props.recursosRecomendadosDespacho),
    );
    this.notasOperativasDespacho = props.notasOperativasDespacho.trim();
    this.confianzaGlobal = props.confianzaGlobal;
    this.metadatos = metadatos;
  }

  /**
   * Consolida la salida cruda de un analizador (LLM o mock) aplicando el Paso 4
   * determinista del dominio: coherencia de catálogo, verificación de citas,
   * cálculo de pendientes por resta e inyección local de pre-arribo.
   */
  static consolidarDesdeDetecciones(
    input: ConsolidarAnalisisInput,
  ): AnalisisCopiloto {
    const checklistProtocolo = ChecklistProtocolo.construirDesdeDetecciones(
      input.protocolo.todasLasPreguntas(),
      input.preguntasDetectadas,
      input.transcripcion,
    );
    const instruccionesPreArribo = input.protocolo.crearInstruccionesIniciales();
    const metadatos =
      input.metadatos instanceof MetadatosEjecucionIA
        ? input.metadatos
        : new MetadatosEjecucionIA(input.metadatos);

    return new AnalisisCopiloto({
      categoriaId: input.protocolo.categoria.id,
      subcategoriaId: input.protocolo.subcategoria.id,
      descripcionIncidente: input.descripcionIncidente,
      ubicacion: input.ubicacion,
      prioridadSugerida: input.prioridadSugerida,
      checklist: checklistProtocolo,
      instruccionesPreArribo,
      riesgosDetectados: input.riesgosDetectados,
      recursosRecomendadosDespacho: input.recursosRecomendadosDespacho,
      notasOperativasDespacho: input.notasOperativasDespacho,
      confianzaGlobal: input.confianzaGlobal,
      metadatos,
    });
  }

  get checklist(): readonly ItemChecklistLlamada[] {
    return this.checklistProtocolo.items;
  }

  get proveedorUsado(): ProveedorIA {
    return this.metadatos.proveedorUsado;
  }

  get modeloUsado(): string {
    return this.metadatos.modeloUsado;
  }

  get latenciaMs(): number {
    return this.metadatos.latenciaMs;
  }

  get degradado(): boolean {
    return this.metadatos.degradado;
  }

  get motivoDegradacion(): string | null {
    return this.metadatos.motivoDegradacion;
  }

  toSnapshot(): AnalisisCopilotoSnapshot {
    return {
      categoriaId: this.categoriaId,
      subcategoriaId: this.subcategoriaId,
      descripcionIncidente: this.descripcionIncidente,
      ubicacion: this.ubicacion.toSnapshot(),
      prioridadSugerida: this.prioridadSugerida,
      checklist: this.checklistProtocolo.toSnapshots(),
      instruccionesPreArribo: this.instruccionesPreArribo.map((i) =>
        i.toSnapshot(),
      ),
      riesgosDetectados: [...this.riesgosDetectados],
      recursosRecomendadosDespacho: [...this.recursosRecomendadosDespacho],
      notasOperativasDespacho: this.notasOperativasDespacho,
      confianzaGlobal: this.confianzaGlobal,
      proveedorUsado: this.metadatos.proveedorUsado,
      modeloUsado: this.metadatos.modeloUsado,
      latenciaMs: this.metadatos.latenciaMs,
      degradado: this.metadatos.degradado,
      motivoDegradacion: this.metadatos.motivoDegradacion,
    };
  }

  toJSON(): AnalisisCopilotoSnapshot {
    return this.toSnapshot();
  }
}

export type OrigenReporte =
  | 'TELEFONIA_911'
  | 'TELEFONIA_103'
  | 'TELEFONIA_107'
  | 'TELEFONIA_147'
  | 'APP_CIUDADANA'
  | 'OTRO';

export type PrioridadIncidente = 'P1' | 'P2' | 'P3' | 'P4';

export type EstadoLlamada = 'EN_CURSO' | 'DERIVADA' | 'DESCARTADA';

export type EstadoPreguntaIA = 'PENDIENTE' | 'RESPONDIDA' | 'AMBIGUA';

export type EstadoPreguntaOperador = 'CONFIRMADA' | 'PENDIENTE' | 'NO_APLICA';

export type NivelCerteza = 'ALTA' | 'MEDIA' | 'BAJA';

export type ProveedorIA =
  | 'mock'
  | 'gemini'
  | 'ollama'
  | 'openai'
  | 'openai-compatible';

export type HablanteTurno = 'OPERADOR' | 'LLAMANTE';

export interface PreguntaProtocoloDef {
  id: number;
  subcategoriaId: number | null;
  texto: string;
  critica: boolean;
  pistasMock?: string[];
}

export interface InstruccionPreArriboDef {
  id: number;
  subcategoriaId: number;
  texto: string;
  critica: boolean;
}

export interface SubcategoriaProtocolo {
  id: number;
  categoriaId: number;
  nombre: string;
  etiqueta: string;
  criterio: string;
  preguntas: PreguntaProtocoloDef[];
  instruccionesPreArribo: InstruccionPreArriboDef[];
}

export interface CategoriaProtocolo {
  id: number;
  nombre: string;
  etiqueta: string;
  subcategorias: SubcategoriaProtocolo[];
}

export interface CatalogoProtocolos {
  preguntasUniversales: PreguntaProtocoloDef[];
  categorias: CategoriaProtocolo[];
}

export interface UbicacionNormalizada {
  calle: string | null;
  altura: string | null;
  interseccion: string | null;
  barrioComuna: string | null;
  referencia: string | null;
  camposFaltantes: string[];
}

export interface TurnoDialogo {
  indice: number;
  hablante: HablanteTurno;
  texto: string;
}

export interface ItemChecklistLlamada {
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

export interface ItemInstruccionPreArribo {
  instruccionId: number;
  texto: string;
  critica: boolean;
  transmitida: boolean;
}

export interface AnalisisCopiloto {
  categoriaId: number;
  subcategoriaId: number;
  descripcionIncidente: string;
  ubicacion: UbicacionNormalizada;
  prioridadSugerida: PrioridadIncidente;
  checklist: ItemChecklistLlamada[];
  instruccionesPreArribo: ItemInstruccionPreArribo[];
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

export interface CartaDespacho {
  id: string;
  llamadaId: string;
  origenReporte: OrigenReporte;
  categoriaId: number;
  subcategoriaId: number;
  descripcionIncidente: string;
  prioridad: PrioridadIncidente;
  ubicacion: UbicacionNormalizada;
  riesgosDetectados: string[];
  recursosRecomendadosDespacho: string[];
  notasOperativasDespacho: string;
  derivadaEn: string;
}

export interface Llamada {
  id: string;
  origenReporte: OrigenReporte;
  estado: EstadoLlamada;
  transcripcionCruda: string;
  turnos?: TurnoDialogo[];
  categoriaId: number | null;
  subcategoriaId: number | null;
  descripcionIncidente: string;
  prioridad: PrioridadIncidente | null;
  ubicacion: UbicacionNormalizada;
  checklist: ItemChecklistLlamada[];
  instruccionesPreArribo: ItemInstruccionPreArribo[];
  riesgosDetectados: string[];
  recursosRecomendadosDespacho: string[];
  notasOperativasDespacho: string;
  ultimoAnalisis: AnalisisCopiloto | null;
  camposEditadosPorOperador: string[];
  faltantesParaDerivar?: string[];
  cartaDespacho?: CartaDespacho | null;
  creadaEn: string;
  actualizadaEn: string;
}

export interface CasoReferenciaCsv {
  idRegistro: string;
  timestampLlamada: string;
  origenReporte: OrigenReporte;
  categoria: string;
  descripcionIncidente: string;
  prioridadSugerida: PrioridadIncidente;
  transcripcionCruda: string;
  calleDetectada: string | null;
  alturaDetectada: string | null;
  interseccionDetectada: string | null;
  barrioComuna: string | null;
  riesgosDetectados: string[];
  recursosRecomendadosDespacho: string[];
  notasOperativasDespacho: string;
}

export const ORIGEN_REPORTE_LABELS: Record<OrigenReporte, string> = {
  TELEFONIA_911: '911 Emergencias',
  TELEFONIA_103: '103 Defensa Civil',
  TELEFONIA_107: '107 SAME',
  TELEFONIA_147: '147 Ciudad',
  APP_CIUDADANA: 'App Ciudadana',
  OTRO: 'Otro canal',
};

export const PRIORIDAD_META: Record<
  PrioridadIncidente,
  { codigo: PrioridadIncidente; etiqueta: string; descripcion: string; atajo: string }
> = {
  P1: {
    codigo: 'P1',
    etiqueta: 'Crítica',
    descripcion: 'Riesgo de vida inminente o peligro activo grave',
    atajo: 'Alt+1',
  },
  P2: {
    codigo: 'P2',
    etiqueta: 'Alta',
    descripcion: 'Urgencia relevante sin compromiso vital inmediato confirmado',
    atajo: 'Alt+2',
  },
  P3: {
    codigo: 'P3',
    etiqueta: 'Media',
    descripcion: 'Daño material acotado o interrupción sin heridos',
    atajo: 'Alt+3',
  },
  P4: {
    codigo: 'P4',
    etiqueta: 'Baja',
    descripcion: 'Reclamo administrativo o preventivo sin riesgo activo',
    atajo: 'Alt+4',
  },
};

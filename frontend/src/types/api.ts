import type {
  CartaDespacho,
  CasoReferenciaCsv,
  CatalogoProtocolos,
  EstadoLlamada,
  EstadoPreguntaOperador,
  HablanteTurno,
  Llamada,
  OrigenReporte,
  PrioridadIncidente,
  ProveedorIA,
  UbicacionNormalizada,
} from './domain';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  ai: {
    provider: ProveedorIA;
    model: string;
    fallbackEnabled: boolean;
  };
  catalog: {
    categorias: number;
    subcategorias: number;
  };
  datasetLoaded: number;
}

export interface CreateLlamadaPayload {
  origenReporte: OrigenReporte;
  transcripcionCruda: string;
  analizarAhora?: boolean;
}

export interface AppendTurnoPayload {
  hablante: HablanteTurno;
  texto: string;
  reanalizar?: boolean;
}

export interface PatchLlamadaPayload {
  transcripcionCruda?: string;
  ubicacion?: Partial<Omit<UbicacionNormalizada, 'camposFaltantes'>>;
  categoriaId?: number | null;
  subcategoriaId?: number | null;
  descripcionIncidente?: string;
  prioridad?: PrioridadIncidente | null;
  checklist?: Array<{
    preguntaId: number;
    estadoOperador: EstadoPreguntaOperador | null;
    notaOperador?: string | null;
  }>;
  instruccionesPreArribo?: Array<{
    instruccionId: number;
    transmitida: boolean;
  }>;
  riesgosDetectados?: string[];
  recursosRecomendadosDespacho?: string[];
  notasOperativasDespacho?: string;
}

export interface DerivarLlamadaPayload {
  notasOperativasDespacho?: string;
}

export interface DerivarLlamadaResponse {
  llamada: Llamada;
  cartaDespacho: CartaDespacho;
}

export interface ListLlamadasFilters {
  estado?: EstadoLlamada;
  categoriaId?: number;
  subcategoriaId?: number;
  prioridad?: PrioridadIncidente;
}

export interface ListCartasDespachoFilters {
  prioridad?: PrioridadIncidente;
  categoriaId?: number;
}

export interface CopilotApiClient {
  getHealth(): Promise<HealthResponse>;
  getProtocolos(): Promise<CatalogoProtocolos>;
  getDatasetLlamadas(): Promise<CasoReferenciaCsv[]>;
  createLlamada(payload: CreateLlamadaPayload): Promise<Llamada>;
  listLlamadas(filters?: ListLlamadasFilters): Promise<Llamada[]>;
  getLlamada(id: string): Promise<Llamada>;
  appendTurno(id: string, payload: AppendTurnoPayload): Promise<Llamada>;
  analizarLlamada(id: string, opciones?: { simularDegradado?: boolean }): Promise<Llamada>;
  patchLlamada(id: string, payload: PatchLlamadaPayload): Promise<Llamada>;
  derivarLlamada(id: string, payload?: DerivarLlamadaPayload): Promise<DerivarLlamadaResponse>;
  descartarLlamada(id: string): Promise<Llamada>;
  listCartasDespacho(filters?: ListCartasDespachoFilters): Promise<CartaDespacho[]>;
  getCartaDespacho(id: string): Promise<CartaDespacho>;
}

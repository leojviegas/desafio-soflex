export {
  AnalisisCopiloto,
  type AnalisisCopilotoProps,
  type AnalisisCopilotoSnapshot,
  type ConsolidarAnalisisInput,
} from './entities/analisisCopiloto.js';
export {
  CartaDespacho,
  type CartaDespachoSnapshot,
  type CrearCartaDespachoInput,
} from './entities/cartaDespacho.js';
export {
  CategoriaProtocolo,
  type CategoriaProtocoloProps,
} from './entities/categoriaProtocolo.js';
export {
  ChecklistProtocolo,
  type DeteccionPreguntaIA,
} from './entities/checklistProtocolo.js';
export {
  FichaIncidente,
  type FichaIncidenteProps,
} from './entities/fichaIncidente.js';
export {
  InstruccionPreArriboDef,
  type InstruccionPreArriboDefProps,
} from './entities/instruccionPreArriboDef.js';
export {
  ItemChecklistLlamada,
  type EstadoEfectivoPregunta,
  type ItemChecklistLlamadaProps,
  type ItemChecklistLlamadaSnapshot,
} from './entities/itemChecklistLlamada.js';
export {
  ItemInstruccionPreArribo,
  type ItemInstruccionPreArriboProps,
  type ItemInstruccionPreArriboSnapshot,
} from './entities/itemInstruccionPreArribo.js';
export {
  Llamada,
  type CrearLlamadaInput,
  type DerivarLlamadaInput,
  type EditarLlamadaOperadorInput,
  type LlamadaJson,
  type LlamadaSnapshot,
} from './entities/llamada.js';
export {
  MetadatosEjecucionIA,
  type MetadatosEjecucionIAProps,
} from './entities/metadatosEjecucionIA.js';
export {
  PreguntaProtocoloDef,
  type PreguntaProtocoloDefProps,
} from './entities/preguntaProtocoloDef.js';
export {
  ProtocoloSubcategoria,
  type ProtocoloSubcategoriaProps,
} from './entities/protocoloSubcategoria.js';
export { RegistroEdicionesOperador } from './entities/registroEdicionesOperador.js';
export {
  SubcategoriaProtocolo,
  type SubcategoriaProtocoloProps,
} from './entities/subcategoriaProtocolo.js';
export { Transcripcion } from './entities/transcripcion.js';
export {
  TurnoDialogo,
  type TurnoDialogoProps,
  type TurnoDialogoSnapshot,
} from './entities/turnoDialogo.js';
export {
  UbicacionNormalizada,
  type UbicacionNormalizadaProps,
  type UbicacionNormalizadaSnapshot,
} from './entities/ubicacionNormalizada.js';
export {
  CAMPOS_EDITABLES_LLAMADA,
  CampoEditableLlamada,
  esCampoEditableLlamada,
} from './enums/campoEditableLlamada.js';
export {
  esEstadoLlamada,
  ESTADOS_LLAMADA,
  EstadoLlamada,
} from './enums/estadoLlamada.js';
export {
  esEstadoPreguntaIA,
  ESTADOS_PREGUNTA_IA,
  EstadoPreguntaIA,
} from './enums/estadoPreguntaIA.js';
export {
  esEstadoPreguntaOperador,
  ESTADOS_PREGUNTA_OPERADOR,
  EstadoPreguntaOperador,
} from './enums/estadoPreguntaOperador.js';
export {
  esHablanteTurno,
  HABLANTES_TURNO,
  HablanteTurno,
} from './enums/hablanteTurno.js';
export {
  esNivelCerteza,
  NIVELES_CERTEZA,
  NivelCerteza,
} from './enums/nivelCerteza.js';
export {
  esOrigenReporte,
  ORIGENES_REPORTE,
  OrigenReporte,
} from './enums/origenReporte.js';
export {
  esPrioridadIncidente,
  PRIORIDADES_INCIDENTE,
  PrioridadIncidente,
} from './enums/prioridadIncidente.js';
export {
  esProveedorIA,
  PROVEEDORES_IA,
  ProveedorIA,
} from './enums/proveedorIA.js';
export {
  DomainError,
  DomainValidationError,
  InvalidStateTransitionError,
} from './errors/DomainError.js';
export { generarId } from './utils/idGenerator.js';
export {
  limpiarTextoOpcional,
  normalizarParaComparacion,
} from './utils/textoNormalizer.js';

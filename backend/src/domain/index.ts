// Entidades y objetos de valor
export {
  AnalisisCopiloto,
  type AnalisisCopilotoProps,
  type AnalisisCopilotoSnapshot,
} from './entities/analisisCopiloto.js';
export {
  CartaLlamada,
  type ActualizacionOperadorInput,
  type AgregarTurnoInput,
  type CartaLlamadaSnapshot,
  type CrearCartaLlamadaInput,
} from './entities/cartaLlamada.js';
export {
  InstruccionPreArribo,
  type InstruccionPreArriboProps,
  type InstruccionPreArriboSnapshot,
} from './entities/instruccionPreArribo.js';
export {
  PreguntaProtocolo,
  type PreguntaProtocoloProps,
  type PreguntaProtocoloSnapshot,
} from './entities/preguntaProtocolo.js';
export {
  ProtocoloReferencia,
  type ProtocoloReferenciaProps,
  type ProtocoloReferenciaSnapshot,
} from './entities/protocoloReferencia.js';
export {
  TurnoDialogo,
  type TurnoDialogoProps,
  type TurnoDialogoSnapshot,
} from './entities/turnoDialogo.js';
export {
  CAMPOS_UBICACION_ESTRUCTURADOS,
  UbicacionNormalizada,
  type UbicacionNormalizadaProps,
  type UbicacionNormalizadaSnapshot,
} from './entities/ubicacionNormalizada.js';

// Enumeraciones
export {
  CategoriaIncidente,
  esCategoriaIncidente,
} from './enums/categoriaIncidente.js';
export {
  EstadoCartaLlamada,
  esEstadoCartaLlamada,
} from './enums/estadoCartaLlamada.js';
export {
  EstadoPreguntaProtocolo,
  esEstadoPreguntaProtocolo,
} from './enums/estadoPreguntaProtocolo.js';
export {
  HablanteTurno,
  esHablanteTurno,
} from './enums/hablanteTurno.js';
export {
  NivelCerteza,
  esNivelCerteza,
} from './enums/nivelCerteza.js';
export {
  OrigenReporte,
  esOrigenReporte,
} from './enums/origenReporte.js';
export {
  PrioridadIncidente,
  esPrioridadIncidente,
} from './enums/prioridadIncidente.js';
export {
  ProveedorIA,
  esProveedorIA,
} from './enums/proveedorIA.js';

// Errores y utilidades de dominio
export {
  DomainError,
  DomainValidationError,
  InvalidStateTransitionError,
} from './errors/DomainError.js';
export { generarId } from './utils/idGenerator.js';

import {
  DomainValidationError,
  esOrigenReporte,
  esPrioridadIncidente,
  limpiarTextoOpcional,
  type OrigenReporte,
  type PrioridadIncidente,
} from '../domain/index.js';

export interface CasoReferenciaCsvSnapshot {
  idRegistro: string;
  timestampLlamada: string;
  origenReporte: OrigenReporte;
  categoria: string;
  descripcionIncidente: string;
  prioridadSugerida: PrioridadIncidente;
  transcripcionCruda: string;
  calleDetectada?: string | null;
  alturaDetectada?: string | null;
  interseccionDetectada?: string | null;
  barrioComuna?: string | null;
  preguntasProtocoloMandatorias: string[];
  preguntasRespondidasEnRelato: string[];
  preguntasPendientes: string[];
  instruccionesPrearribo: string;
  riesgosDetectados: string[];
  recursosRecomendadosDespacho: string[];
  notasOperativasDespacho: string;
}

/**
 * Registro inmutable de referencia leído desde `docs/dataset_challenge_soflex.csv`.
 * Utilizado para retrieval few-shot, banco de casos en UI y respaldo del motor `mock`.
 */
export class CasoReferenciaCsv {
  readonly idRegistro: string;
  readonly timestampLlamada: string;
  readonly origenReporte: OrigenReporte;
  readonly categoria: string;
  readonly descripcionIncidente: string;
  readonly prioridadSugerida: PrioridadIncidente;
  readonly transcripcionCruda: string;
  readonly calleDetectada: string | null;
  readonly alturaDetectada: string | null;
  readonly interseccionDetectada: string | null;
  readonly barrioComuna: string | null;
  readonly preguntasProtocoloMandatorias: readonly string[];
  readonly preguntasRespondidasEnRelato: readonly string[];
  readonly preguntasPendientes: readonly string[];
  readonly instruccionesPrearribo: string;
  readonly riesgosDetectados: readonly string[];
  readonly recursosRecomendadosDespacho: readonly string[];
  readonly notasOperativasDespacho: string;

  constructor(props: CasoReferenciaCsvSnapshot) {
    if (props.idRegistro.trim().length === 0) {
      throw new DomainValidationError(
        'El idRegistro de CasoReferenciaCsv es obligatorio.',
      );
    }
    if (!esOrigenReporte(props.origenReporte)) {
      throw new DomainValidationError(
        `origenReporte inválido en CasoReferenciaCsv: "${String(props.origenReporte)}".`,
        { origenReporte: props.origenReporte },
      );
    }
    if (!esPrioridadIncidente(props.prioridadSugerida)) {
      throw new DomainValidationError(
        `prioridadSugerida inválida en CasoReferenciaCsv: "${String(props.prioridadSugerida)}".`,
        { prioridadSugerida: props.prioridadSugerida },
      );
    }
    if (props.transcripcionCruda.trim().length === 0) {
      throw new DomainValidationError(
        'La transcripcionCruda de CasoReferenciaCsv no puede estar vacía.',
      );
    }

    this.idRegistro = props.idRegistro.trim();
    this.timestampLlamada = props.timestampLlamada.trim();
    this.origenReporte = props.origenReporte;
    this.categoria = props.categoria.trim();
    this.descripcionIncidente = props.descripcionIncidente.trim();
    this.prioridadSugerida = props.prioridadSugerida;
    this.transcripcionCruda = props.transcripcionCruda.trim();
    this.calleDetectada = limpiarTextoOpcional(props.calleDetectada);
    this.alturaDetectada = limpiarTextoOpcional(props.alturaDetectada);
    this.interseccionDetectada = limpiarTextoOpcional(
      props.interseccionDetectada,
    );
    this.barrioComuna = limpiarTextoOpcional(props.barrioComuna);
    this.preguntasProtocoloMandatorias = Object.freeze([
      ...props.preguntasProtocoloMandatorias,
    ]);
    this.preguntasRespondidasEnRelato = Object.freeze([
      ...props.preguntasRespondidasEnRelato,
    ]);
    this.preguntasPendientes = Object.freeze([...props.preguntasPendientes]);
    this.instruccionesPrearribo = props.instruccionesPrearribo.trim();
    this.riesgosDetectados = Object.freeze([...props.riesgosDetectados]);
    this.recursosRecomendadosDespacho = Object.freeze([
      ...props.recursosRecomendadosDespacho,
    ]);
    this.notasOperativasDespacho = props.notasOperativasDespacho.trim();
  }

  toSnapshot(): CasoReferenciaCsvSnapshot {
    return {
      idRegistro: this.idRegistro,
      timestampLlamada: this.timestampLlamada,
      origenReporte: this.origenReporte,
      categoria: this.categoria,
      descripcionIncidente: this.descripcionIncidente,
      prioridadSugerida: this.prioridadSugerida,
      transcripcionCruda: this.transcripcionCruda,
      calleDetectada: this.calleDetectada,
      alturaDetectada: this.alturaDetectada,
      interseccionDetectada: this.interseccionDetectada,
      barrioComuna: this.barrioComuna,
      preguntasProtocoloMandatorias: [...this.preguntasProtocoloMandatorias],
      preguntasRespondidasEnRelato: [...this.preguntasRespondidasEnRelato],
      preguntasPendientes: [...this.preguntasPendientes],
      instruccionesPrearribo: this.instruccionesPrearribo,
      riesgosDetectados: [...this.riesgosDetectados],
      recursosRecomendadosDespacho: [...this.recursosRecomendadosDespacho],
      notasOperativasDespacho: this.notasOperativasDespacho,
    };
  }

  toJSON(): CasoReferenciaCsvSnapshot {
    return this.toSnapshot();
  }
}

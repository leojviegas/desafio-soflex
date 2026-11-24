import { CampoEditableLlamada } from '../enums/campoEditableLlamada.js';
import {
  esEstadoLlamada,
  EstadoLlamada,
} from '../enums/estadoLlamada.js';
import type { EstadoPreguntaOperador } from '../enums/estadoPreguntaOperador.js';
import type { HablanteTurno } from '../enums/hablanteTurno.js';
import {
  esOrigenReporte,
  type OrigenReporte,
} from '../enums/origenReporte.js';
import type { PrioridadIncidente } from '../enums/prioridadIncidente.js';
import {
  DomainValidationError,
  InvalidStateTransitionError,
} from '../errors/DomainError.js';
import { generarId } from '../utils/idGenerator.js';
import {
  AnalisisCopiloto,
  type AnalisisCopilotoSnapshot,
} from './analisisCopiloto.js';
import { CartaDespacho } from './cartaDespacho.js';
import { ChecklistProtocolo } from './checklistProtocolo.js';
import { FichaIncidente } from './fichaIncidente.js';
import type {
  ItemChecklistLlamada,
  ItemChecklistLlamadaSnapshot,
} from './itemChecklistLlamada.js';
import {
  ItemInstruccionPreArribo,
  type ItemInstruccionPreArriboSnapshot,
} from './itemInstruccionPreArribo.js';
import type { ProtocoloSubcategoria } from './protocoloSubcategoria.js';
import { RegistroEdicionesOperador } from './registroEdicionesOperador.js';
import { Transcripcion } from './transcripcion.js';
import type { TurnoDialogo, TurnoDialogoSnapshot } from './turnoDialogo.js';
import type {
  UbicacionNormalizada,
  UbicacionNormalizadaProps,
  UbicacionNormalizadaSnapshot,
} from './ubicacionNormalizada.js';

const TRANSICIONES_VALIDAS: Readonly<
  Record<EstadoLlamada, readonly EstadoLlamada[]>
> = Object.freeze({
  [EstadoLlamada.EN_CURSO]: [EstadoLlamada.DERIVADA, EstadoLlamada.DESCARTADA],
  [EstadoLlamada.DERIVADA]: [],
  [EstadoLlamada.DESCARTADA]: [],
});

export interface LlamadaSnapshot {
  id: string;
  origenReporte: OrigenReporte;
  estado: EstadoLlamada;
  transcripcionCruda: string;
  categoriaId: number | null;
  subcategoriaId: number | null;
  descripcionIncidente: string;
  prioridad: PrioridadIncidente | null;
  ubicacion: UbicacionNormalizadaSnapshot;
  checklist: ItemChecklistLlamadaSnapshot[];
  instruccionesPreArribo: ItemInstruccionPreArriboSnapshot[];
  riesgosDetectados: string[];
  recursosRecomendadosDespacho: string[];
  notasOperativasDespacho: string;
  ultimoAnalisis: AnalisisCopilotoSnapshot | null;
  camposEditadosPorOperador: string[];
  creadaEn: string;
  actualizadaEn: string;
}

export interface LlamadaJson extends LlamadaSnapshot {
  turnos: TurnoDialogoSnapshot[];
  faltantesParaDerivar: string[];
}

export interface CrearLlamadaInput {
  id?: string;
  origenReporte: OrigenReporte;
  transcripcionCruda: string;
  ahora?: string;
}

export interface EditarLlamadaOperadorInput {
  transcripcionCruda?: string;
  ubicacion?: Partial<Omit<UbicacionNormalizadaProps, 'camposFaltantes'>>;
  descripcionIncidente?: string;
  prioridad?: PrioridadIncidente | null;
  checklist?: ReadonlyArray<{
    preguntaId: number;
    estadoOperador: EstadoPreguntaOperador | null;
    notaOperador?: string | null;
  }>;
  instruccionesPreArribo?: ReadonlyArray<{
    instruccionId: number;
    transmitida: boolean;
  }>;
  riesgosDetectados?: readonly string[];
  recursosRecomendadosDespacho?: readonly string[];
  notasOperativasDespacho?: string;
}

export interface DerivarLlamadaInput {
  cartaDespachoId?: string;
  notasOperativasDespacho?: string;
  ahora?: string;
}

/**
 * Agregado raíz que representa la sesión de trabajo del operador de sala.
 * Mutable únicamente en estado `EN_CURSO`; al derivar genera una `CartaDespacho` inmutable.
 */
export class Llamada {
  readonly id: string;
  readonly origenReporte: OrigenReporte;
  readonly creadaEn: string;

  private _estado: EstadoLlamada;
  private _transcripcion: Transcripcion;
  private _ficha: FichaIncidente;
  private _checklistProtocolo: ChecklistProtocolo;
  private _instruccionesPreArribo: ItemInstruccionPreArribo[];
  private _ultimoAnalisis: AnalisisCopiloto | null;
  private _edicionesOperador: RegistroEdicionesOperador;
  private _actualizadaEn: string;

  private constructor(params: {
    id: string;
    origenReporte: OrigenReporte;
    estado: EstadoLlamada;
    transcripcion: Transcripcion;
    ficha: FichaIncidente;
    checklistProtocolo: ChecklistProtocolo;
    instruccionesPreArribo: ItemInstruccionPreArribo[];
    ultimoAnalisis: AnalisisCopiloto | null;
    edicionesOperador: RegistroEdicionesOperador;
    creadaEn: string;
    actualizadaEn: string;
  }) {
    if (params.id.trim().length === 0) {
      throw new DomainValidationError('El id de Llamada es obligatorio.');
    }
    if (!esOrigenReporte(params.origenReporte)) {
      throw new DomainValidationError(
        `origenReporte inválido: "${String(params.origenReporte)}".`,
        { origenReporte: params.origenReporte },
      );
    }
    if (!esEstadoLlamada(params.estado)) {
      throw new DomainValidationError(
        `estado inválido: "${String(params.estado)}".`,
        { estado: params.estado },
      );
    }
    if (
      params.creadaEn.trim().length === 0 ||
      params.actualizadaEn.trim().length === 0
    ) {
      throw new DomainValidationError(
        'Las fechas creadaEn y actualizadaEn de Llamada son obligatorias.',
      );
    }

    this.id = params.id.trim();
    this.origenReporte = params.origenReporte;
    this._estado = params.estado;
    this._transcripcion = params.transcripcion;
    this._ficha = params.ficha;
    this._checklistProtocolo = params.checklistProtocolo;
    this._instruccionesPreArribo = params.instruccionesPreArribo;
    this._ultimoAnalisis = params.ultimoAnalisis;
    this._edicionesOperador = params.edicionesOperador;
    this.creadaEn = params.creadaEn.trim();
    this._actualizadaEn = params.actualizadaEn.trim();
  }

  static crear(input: CrearLlamadaInput): Llamada {
    const ahora = input.ahora ?? new Date().toISOString();
    return new Llamada({
      id: input.id ?? generarId(),
      origenReporte: input.origenReporte,
      estado: EstadoLlamada.EN_CURSO,
      transcripcion: new Transcripcion(input.transcripcionCruda),
      ficha: FichaIncidente.vacia(),
      checklistProtocolo: ChecklistProtocolo.vacio(),
      instruccionesPreArribo: [],
      ultimoAnalisis: null,
      edicionesOperador: RegistroEdicionesOperador.vacio(),
      creadaEn: ahora,
      actualizadaEn: ahora,
    });
  }

  static rehidratar(snapshot: LlamadaSnapshot): Llamada {
    return new Llamada({
      id: snapshot.id,
      origenReporte: snapshot.origenReporte,
      estado: snapshot.estado,
      transcripcion: new Transcripcion(snapshot.transcripcionCruda),
      ficha: new FichaIncidente({
        categoriaId: snapshot.categoriaId,
        subcategoriaId: snapshot.subcategoriaId,
        descripcionIncidente: snapshot.descripcionIncidente,
        prioridad: snapshot.prioridad,
        ubicacion: snapshot.ubicacion,
        riesgosDetectados: snapshot.riesgosDetectados,
        recursosRecomendadosDespacho: snapshot.recursosRecomendadosDespacho,
        notasOperativasDespacho: snapshot.notasOperativasDespacho,
      }),
      checklistProtocolo: ChecklistProtocolo.desdeSnapshots(snapshot.checklist),
      instruccionesPreArribo: snapshot.instruccionesPreArribo.map(
        (item) => new ItemInstruccionPreArribo(item),
      ),
      ultimoAnalisis: snapshot.ultimoAnalisis
        ? new AnalisisCopiloto(snapshot.ultimoAnalisis)
        : null,
      edicionesOperador: RegistroEdicionesOperador.desdeStrings(
        snapshot.camposEditadosPorOperador,
      ),
      creadaEn: snapshot.creadaEn,
      actualizadaEn: snapshot.actualizadaEn,
    });
  }

  private asegurarEnCurso(accion: string): void {
    if (this._estado !== EstadoLlamada.EN_CURSO) {
      throw new InvalidStateTransitionError(
        `No se puede ${accion} porque la llamada "${this.id}" está en estado ${this._estado}.`,
        { llamadaId: this.id, estadoActual: this._estado, accion },
      );
    }
  }

  private transicionarA(nuevoEstado: EstadoLlamada): void {
    const permitidos = TRANSICIONES_VALIDAS[this._estado];
    if (!permitidos.includes(nuevoEstado)) {
      throw new InvalidStateTransitionError(
        `Transición de estado inválida de ${this._estado} a ${nuevoEstado}.`,
        {
          llamadaId: this.id,
          estadoActual: this._estado,
          nuevoEstado,
        },
      );
    }
    this._estado = nuevoEstado;
  }

  get estado(): EstadoLlamada {
    return this._estado;
  }

  get transcripcion(): Transcripcion {
    return this._transcripcion;
  }

  get transcripcionCruda(): string {
    return this._transcripcion.textoCrudo;
  }

  get ficha(): FichaIncidente {
    return this._ficha;
  }

  get categoriaId(): number | null {
    return this._ficha.categoriaId;
  }

  get subcategoriaId(): number | null {
    return this._ficha.subcategoriaId;
  }

  get descripcionIncidente(): string {
    return this._ficha.descripcionIncidente;
  }

  get prioridad(): PrioridadIncidente | null {
    return this._ficha.prioridad;
  }

  get ubicacion(): UbicacionNormalizada {
    return this._ficha.ubicacion;
  }

  get checklistProtocolo(): ChecklistProtocolo {
    return this._checklistProtocolo;
  }

  get checklist(): readonly ItemChecklistLlamada[] {
    return this._checklistProtocolo.items;
  }

  get instruccionesPreArribo(): readonly ItemInstruccionPreArribo[] {
    return this._instruccionesPreArribo;
  }

  get riesgosDetectados(): readonly string[] {
    return this._ficha.riesgosDetectados;
  }

  get recursosRecomendadosDespacho(): readonly string[] {
    return this._ficha.recursosRecomendadosDespacho;
  }

  get notasOperativasDespacho(): string {
    return this._ficha.notasOperativasDespacho;
  }

  get ultimoAnalisis(): AnalisisCopiloto | null {
    return this._ultimoAnalisis;
  }

  get camposEditadosPorOperador(): CampoEditableLlamada[] {
    return this._edicionesOperador.toArray();
  }

  get actualizadaEn(): string {
    return this._actualizadaEn;
  }

  obtenerTurnos(): TurnoDialogo[] {
    return this._transcripcion.obtenerTurnos();
  }

  agregarTurno(input: {
    hablante: HablanteTurno;
    texto: string;
    ahora?: string;
  }): TurnoDialogo[] {
    this.asegurarEnCurso('agregar un turno');
    this._transcripcion = this._transcripcion.anexarTurno(
      input.hablante,
      input.texto,
    );
    this._actualizadaEn = input.ahora ?? new Date().toISOString();
    return this.obtenerTurnos();
  }

  /**
   * Aplica un nuevo `AnalisisCopiloto` protegiendo los campos editados por el operador,
   * las decisiones del checklist (`estadoOperador`) y las instrucciones `transmitida: true`.
   */
  aplicarAnalisis(
    analisis: AnalisisCopiloto,
    ahora = new Date().toISOString(),
  ): void {
    this.asegurarEnCurso('aplicar un análisis');
    this._ultimoAnalisis = analisis;

    const subcategoriaFijadaPorOperador =
      this._edicionesOperador.estaProtegido(
        CampoEditableLlamada.SUBCATEGORIA_ID,
      ) ||
      this._edicionesOperador.estaProtegido(CampoEditableLlamada.CATEGORIA_ID);

    if (subcategoriaFijadaPorOperador) {
      this._checklistProtocolo =
        this._checklistProtocolo.actualizarEvidenciaSinCambiarProtocolo(
          analisis.checklistProtocolo,
        );
    } else {
      this._checklistProtocolo =
        this._checklistProtocolo.fusionarConNuevoAnalisis(
          analisis.checklistProtocolo,
        );

      const transmitidasPrevias = new Map<number, boolean>(
        this._instruccionesPreArribo.map((item) => [
          item.instruccionId,
          item.transmitida,
        ]),
      );
      this._instruccionesPreArribo = analisis.instruccionesPreArribo.map(
        (item) =>
          item.conTransmitida(
            transmitidasPrevias.get(item.instruccionId) ?? item.transmitida,
          ),
      );
    }

    this._ficha = this._ficha.fusionarConAnalisis(
      analisis,
      this._edicionesOperador,
    );
    this._actualizadaEn = ahora;
  }

  /**
   * Aplica ediciones manuales del operador y registra los campos modificados
   * para protegerlos frente a futuros re-análisis.
   */
  editarPorOperador(
    cambios: EditarLlamadaOperadorInput,
    ahora = new Date().toISOString(),
  ): void {
    this.asegurarEnCurso('editar la llamada');

    if (cambios.transcripcionCruda !== undefined) {
      this._transcripcion = new Transcripcion(cambios.transcripcionCruda);
    }

    const camposModificados: CampoEditableLlamada[] = [];

    if (cambios.descripcionIncidente !== undefined) {
      camposModificados.push(CampoEditableLlamada.DESCRIPCION_INCIDENTE);
    }
    if (cambios.prioridad !== undefined) {
      camposModificados.push(CampoEditableLlamada.PRIORIDAD);
    }
    if (cambios.riesgosDetectados !== undefined) {
      camposModificados.push(CampoEditableLlamada.RIESGOS_DETECTADOS);
    }
    if (cambios.recursosRecomendadosDespacho !== undefined) {
      camposModificados.push(CampoEditableLlamada.RECURSOS_RECOMENDADOS);
    }
    if (cambios.notasOperativasDespacho !== undefined) {
      camposModificados.push(CampoEditableLlamada.NOTAS_OPERATIVAS);
    }
    if (cambios.ubicacion !== undefined) {
      if (cambios.ubicacion.calle !== undefined) {
        camposModificados.push(CampoEditableLlamada.UBICACION_CALLE);
      }
      if (cambios.ubicacion.altura !== undefined) {
        camposModificados.push(CampoEditableLlamada.UBICACION_ALTURA);
      }
      if (cambios.ubicacion.interseccion !== undefined) {
        camposModificados.push(CampoEditableLlamada.UBICACION_INTERSECCION);
      }
      if (cambios.ubicacion.barrioComuna !== undefined) {
        camposModificados.push(CampoEditableLlamada.UBICACION_BARRIO_COMUNA);
      }
      if (cambios.ubicacion.referencia !== undefined) {
        camposModificados.push(CampoEditableLlamada.UBICACION_REFERENCIA);
      }
    }

    this._ficha = this._ficha.conCambios({
      descripcionIncidente: cambios.descripcionIncidente,
      prioridad: cambios.prioridad,
      ubicacion: cambios.ubicacion,
      riesgosDetectados: cambios.riesgosDetectados,
      recursosRecomendadosDespacho: cambios.recursosRecomendadosDespacho,
      notasOperativasDespacho: cambios.notasOperativasDespacho,
    });

    if (cambios.checklist !== undefined) {
      for (const itemCambio of cambios.checklist) {
        this._checklistProtocolo =
          this._checklistProtocolo.actualizarItemOperador(
            itemCambio.preguntaId,
            itemCambio.estadoOperador,
            itemCambio.notaOperador,
          );
      }
    }

    if (cambios.instruccionesPreArribo !== undefined) {
      const porId = new Map<number, boolean>(
        cambios.instruccionesPreArribo.map((i) => [
          i.instruccionId,
          i.transmitida,
        ]),
      );
      for (const instruccionId of porId.keys()) {
        const existe = this._instruccionesPreArribo.some(
          (i) => i.instruccionId === instruccionId,
        );
        if (!existe) {
          throw new DomainValidationError(
            `La instrucción pre-arribo ${instruccionId} no pertenece al protocolo actual de la llamada.`,
            { instruccionId },
          );
        }
      }
      this._instruccionesPreArribo = this._instruccionesPreArribo.map((item) =>
        porId.has(item.instruccionId)
          ? item.conTransmitida(porId.get(item.instruccionId)!)
          : item,
      );
    }

    this._edicionesOperador = this._edicionesOperador.registrar(
      ...camposModificados,
    );
    this._actualizadaEn = ahora;
  }

  /**
   * Cambia manualmente la subcategoría de la llamada sincronizando `categoriaId`,
   * recargando checklist e instrucciones de pre-arribo desde el catálogo y
   * conservando preguntas universales ya confirmadas o respondidas.
   */
  cambiarProtocoloPorOperador(
    protocolo: ProtocoloSubcategoria,
    ahora = new Date().toISOString(),
  ): void {
    this.asegurarEnCurso('cambiar el protocolo');

    this._ficha = this._ficha.conCambios({
      categoriaId: protocolo.categoria.id,
      subcategoriaId: protocolo.subcategoria.id,
    });
    this._edicionesOperador = this._edicionesOperador.registrar(
      CampoEditableLlamada.CATEGORIA_ID,
      CampoEditableLlamada.SUBCATEGORIA_ID,
    );
    this._checklistProtocolo = this._checklistProtocolo.recargarParaProtocolo(
      protocolo.todasLasPreguntas(),
    );
    this._instruccionesPreArribo = protocolo.crearInstruccionesIniciales(
      this._instruccionesPreArribo,
    );
    this._actualizadaEn = ahora;
  }

  faltantesParaDerivar(): string[] {
    return this._ficha.obtenerCamposFaltantesParaCAD();
  }

  /**
   * Valida invariantes mínimos, pasa la llamada a `DERIVADA` y construye
   * la `CartaDespacho` formal e inmutable (sin transcripción cruda).
   */
  derivar(input: DerivarLlamadaInput = {}): CartaDespacho {
    this.asegurarEnCurso('derivar a CAD');

    const ahora = input.ahora ?? new Date().toISOString();
    let fichaParaDerivar = this._ficha;

    if (input.notasOperativasDespacho !== undefined) {
      fichaParaDerivar = fichaParaDerivar.conCambios({
        notasOperativasDespacho: input.notasOperativasDespacho,
      });
    }

    fichaParaDerivar.validarParaDerivacionCAD();

    const carta = CartaDespacho.crearDesdeLlamada({
      id: input.cartaDespachoId,
      llamadaId: this.id,
      origenReporte: this.origenReporte,
      ficha: fichaParaDerivar,
      derivadaEn: ahora,
    });

    this._ficha = fichaParaDerivar;
    if (input.notasOperativasDespacho !== undefined) {
      this._edicionesOperador = this._edicionesOperador.registrar(
        CampoEditableLlamada.NOTAS_OPERATIVAS,
      );
    }
    this.transicionarA(EstadoLlamada.DERIVADA);
    this._actualizadaEn = ahora;

    return carta;
  }

  descartar(ahora = new Date().toISOString()): void {
    this.asegurarEnCurso('descartar la llamada');
    this.transicionarA(EstadoLlamada.DESCARTADA);
    this._actualizadaEn = ahora;
  }

  toSnapshot(): LlamadaSnapshot {
    return {
      id: this.id,
      origenReporte: this.origenReporte,
      estado: this._estado,
      transcripcionCruda: this._transcripcion.textoCrudo,
      categoriaId: this._ficha.categoriaId,
      subcategoriaId: this._ficha.subcategoriaId,
      descripcionIncidente: this._ficha.descripcionIncidente,
      prioridad: this._ficha.prioridad,
      ubicacion: this._ficha.ubicacion.toSnapshot(),
      checklist: this._checklistProtocolo.toSnapshots(),
      instruccionesPreArribo: this._instruccionesPreArribo.map((i) =>
        i.toSnapshot(),
      ),
      riesgosDetectados: [...this._ficha.riesgosDetectados],
      recursosRecomendadosDespacho: [
        ...this._ficha.recursosRecomendadosDespacho,
      ],
      notasOperativasDespacho: this._ficha.notasOperativasDespacho,
      ultimoAnalisis: this._ultimoAnalisis
        ? this._ultimoAnalisis.toSnapshot()
        : null,
      camposEditadosPorOperador: this._edicionesOperador.toArray(),
      creadaEn: this.creadaEn,
      actualizadaEn: this._actualizadaEn,
    };
  }

  toJSON(): LlamadaJson {
    return {
      ...this.toSnapshot(),
      turnos: this.obtenerTurnos().map((t) => t.toSnapshot()),
      faltantesParaDerivar: this.faltantesParaDerivar(),
    };
  }
}

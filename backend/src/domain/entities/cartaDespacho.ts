import {
  esOrigenReporte,
  type OrigenReporte,
} from '../enums/origenReporte.js';
import type { PrioridadIncidente } from '../enums/prioridadIncidente.js';
import { DomainValidationError } from '../errors/DomainError.js';
import { generarId } from '../utils/idGenerator.js';
import { FichaIncidente } from './fichaIncidente.js';
import type {
  UbicacionNormalizada,
  UbicacionNormalizadaSnapshot,
} from './ubicacionNormalizada.js';

export interface CartaDespachoSnapshot {
  id: string;
  llamadaId: string;
  origenReporte: OrigenReporte;
  categoriaId: number;
  subcategoriaId: number;
  descripcionIncidente: string;
  prioridad: PrioridadIncidente;
  ubicacion: UbicacionNormalizadaSnapshot;
  riesgosDetectados: string[];
  recursosRecomendadosDespacho: string[];
  notasOperativasDespacho: string;
  derivadaEn: string;
}

export interface CrearCartaDespachoInput {
  id?: string;
  llamadaId: string;
  origenReporte: OrigenReporte;
  ficha: FichaIncidente;
  derivadaEn?: string;
}

/**
 * Entregable formal e inmutable derivado hacia el sistema CAD (relación 1:1 con Llamada).
 * No contiene transcripción cruda ni metadatos internos de IA.
 */
export class CartaDespacho {
  readonly id: string;
  readonly llamadaId: string;
  readonly origenReporte: OrigenReporte;
  readonly ficha: FichaIncidente;
  readonly derivadaEn: string;

  private constructor(
    id: string,
    llamadaId: string,
    origenReporte: OrigenReporte,
    ficha: FichaIncidente,
    derivadaEn: string,
  ) {
    if (id.trim().length === 0) {
      throw new DomainValidationError(
        'El id de CartaDespacho es obligatorio.',
      );
    }
    if (llamadaId.trim().length === 0) {
      throw new DomainValidationError(
        'El llamadaId de CartaDespacho es obligatorio.',
      );
    }
    if (!esOrigenReporte(origenReporte)) {
      throw new DomainValidationError(
        `origenReporte inválido en CartaDespacho: "${String(origenReporte)}".`,
        { origenReporte },
      );
    }
    if (derivadaEn.trim().length === 0) {
      throw new DomainValidationError(
        'La fecha derivadaEn de CartaDespacho es obligatoria.',
      );
    }

    ficha.validarParaDerivacionCAD();

    this.id = id.trim();
    this.llamadaId = llamadaId.trim();
    this.origenReporte = origenReporte;
    this.ficha =
      ficha.descripcionIncidente.length > 0
        ? ficha
        : ficha.conCambios({ descripcionIncidente: 'Incidente reportado' });
    this.derivadaEn = derivadaEn.trim();
  }

  static crearDesdeLlamada(input: CrearCartaDespachoInput): CartaDespacho {
    return new CartaDespacho(
      input.id ?? generarId(),
      input.llamadaId,
      input.origenReporte,
      input.ficha,
      input.derivadaEn ?? new Date().toISOString(),
    );
  }

  static rehidratar(snapshot: CartaDespachoSnapshot): CartaDespacho {
    const ficha = new FichaIncidente({
      categoriaId: snapshot.categoriaId,
      subcategoriaId: snapshot.subcategoriaId,
      descripcionIncidente: snapshot.descripcionIncidente,
      prioridad: snapshot.prioridad,
      ubicacion: snapshot.ubicacion,
      riesgosDetectados: snapshot.riesgosDetectados,
      recursosRecomendadosDespacho: snapshot.recursosRecomendadosDespacho,
      notasOperativasDespacho: snapshot.notasOperativasDespacho,
    });

    return new CartaDespacho(
      snapshot.id,
      snapshot.llamadaId,
      snapshot.origenReporte,
      ficha,
      snapshot.derivadaEn,
    );
  }

  get categoriaId(): number {
    return this.ficha.categoriaId!;
  }

  get subcategoriaId(): number {
    return this.ficha.subcategoriaId!;
  }

  get descripcionIncidente(): string {
    return this.ficha.descripcionIncidente;
  }

  get prioridad(): PrioridadIncidente {
    return this.ficha.prioridad!;
  }

  get ubicacion(): UbicacionNormalizada {
    return this.ficha.ubicacion;
  }

  get riesgosDetectados(): readonly string[] {
    return this.ficha.riesgosDetectados;
  }

  get recursosRecomendadosDespacho(): readonly string[] {
    return this.ficha.recursosRecomendadosDespacho;
  }

  get notasOperativasDespacho(): string {
    return this.ficha.notasOperativasDespacho;
  }

  toSnapshot(): CartaDespachoSnapshot {
    return {
      id: this.id,
      llamadaId: this.llamadaId,
      origenReporte: this.origenReporte,
      categoriaId: this.categoriaId,
      subcategoriaId: this.subcategoriaId,
      descripcionIncidente: this.descripcionIncidente,
      prioridad: this.prioridad,
      ubicacion: this.ubicacion.toSnapshot(),
      riesgosDetectados: [...this.riesgosDetectados],
      recursosRecomendadosDespacho: [...this.recursosRecomendadosDespacho],
      notasOperativasDespacho: this.notasOperativasDespacho,
      derivadaEn: this.derivadaEn,
    };
  }

  toJSON(): CartaDespachoSnapshot {
    return this.toSnapshot();
  }
}

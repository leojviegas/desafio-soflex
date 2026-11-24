import {
  esProveedorIA,
  type ProveedorIA,
} from '../enums/proveedorIA.js';
import { DomainValidationError } from '../errors/DomainError.js';
import { limpiarTextoOpcional } from '../utils/textoNormalizer.js';

export interface MetadatosEjecucionIAProps {
  proveedorUsado: ProveedorIA;
  modeloUsado: string;
  latenciaMs: number;
  degradado: boolean;
  motivoDegradacion?: string | null;
}

/**
 * Telemetría de ejecución del analizador de IA (proveedor, modelo, latencia y degradación).
 */
export class MetadatosEjecucionIA {
  readonly proveedorUsado: ProveedorIA;
  readonly modeloUsado: string;
  readonly latenciaMs: number;
  readonly degradado: boolean;
  readonly motivoDegradacion: string | null;

  constructor({
    proveedorUsado,
    modeloUsado,
    latenciaMs,
    degradado,
    motivoDegradacion = null,
  }: MetadatosEjecucionIAProps) {
    if (!esProveedorIA(proveedorUsado)) {
      throw new DomainValidationError(
        `ProveedorIA inválido: "${String(proveedorUsado)}".`,
        { proveedorUsado },
      );
    }
    const modeloLimpio = modeloUsado.trim();
    if (modeloLimpio.length === 0) {
      throw new DomainValidationError(
        'El modeloUsado de MetadatosEjecucionIA es obligatorio.',
      );
    }
    if (!Number.isFinite(latenciaMs) || latenciaMs < 0) {
      throw new DomainValidationError(
        'La latenciaMs debe ser un número finito mayor o igual a 0.',
        { latenciaMs },
      );
    }

    this.proveedorUsado = proveedorUsado;
    this.modeloUsado = modeloLimpio;
    this.latenciaMs = latenciaMs;
    this.degradado = Boolean(degradado);
    this.motivoDegradacion = limpiarTextoOpcional(motivoDegradacion);
  }

  toJSON(): Required<MetadatosEjecucionIAProps> {
    return {
      proveedorUsado: this.proveedorUsado,
      modeloUsado: this.modeloUsado,
      latenciaMs: this.latenciaMs,
      degradado: this.degradado,
      motivoDegradacion: this.motivoDegradacion,
    };
  }
}

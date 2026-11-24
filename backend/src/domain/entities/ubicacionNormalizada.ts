import { CampoEditableLlamada } from '../enums/campoEditableLlamada.js';
import { limpiarTextoOpcional } from '../utils/textoNormalizer.js';
import type { RegistroEdicionesOperador } from './registroEdicionesOperador.js';

export interface UbicacionNormalizadaProps {
  calle?: string | null;
  altura?: string | null;
  interseccion?: string | null;
  barrioComuna?: string | null;
  referencia?: string | null;
  camposFaltantes?: readonly string[];
}

export interface UbicacionNormalizadaSnapshot {
  calle: string | null;
  altura: string | null;
  interseccion: string | null;
  barrioComuna: string | null;
  referencia: string | null;
  camposFaltantes: string[];
}

const CAMPOS_UBICACION_OBLIGATORIOS = [
  'calle',
  'altura',
  'interseccion',
  'barrioComuna',
] as const;

/**
 * Objeto de valor inmutable que representa la ubicación normalizada de un incidente.
 * Calcula automáticamente `camposFaltantes` a partir de los valores `null` para evitar alucinaciones.
 */
export class UbicacionNormalizada {
  readonly calle: string | null;
  readonly altura: string | null;
  readonly interseccion: string | null;
  readonly barrioComuna: string | null;
  readonly referencia: string | null;
  readonly camposFaltantes: readonly string[];

  constructor(props: UbicacionNormalizadaProps = {}) {
    this.calle = limpiarTextoOpcional(props.calle);
    this.altura = limpiarTextoOpcional(props.altura);
    this.interseccion = limpiarTextoOpcional(props.interseccion);
    this.barrioComuna = limpiarTextoOpcional(props.barrioComuna);
    this.referencia = limpiarTextoOpcional(props.referencia);

    const faltantes: string[] = [];
    for (const campo of CAMPOS_UBICACION_OBLIGATORIOS) {
      if (this[campo] === null) {
        faltantes.push(campo);
      }
    }
    this.camposFaltantes = Object.freeze(faltantes);
  }

  static vacia(): UbicacionNormalizada {
    return new UbicacionNormalizada();
  }

  /**
   * Indica si existe al menos una referencia espacial mínima para derivar a CAD.
   */
  tieneUbicacionMinima(): boolean {
    return (
      this.calle !== null ||
      this.interseccion !== null ||
      this.referencia !== null
    );
  }

  conCambios(parcial: Partial<UbicacionNormalizadaProps>): UbicacionNormalizada {
    return new UbicacionNormalizada({
      calle: parcial.calle !== undefined ? parcial.calle : this.calle,
      altura: parcial.altura !== undefined ? parcial.altura : this.altura,
      interseccion:
        parcial.interseccion !== undefined
          ? parcial.interseccion
          : this.interseccion,
      barrioComuna:
        parcial.barrioComuna !== undefined
          ? parcial.barrioComuna
          : this.barrioComuna,
      referencia:
        parcial.referencia !== undefined ? parcial.referencia : this.referencia,
    });
  }

  /**
   * Combina esta ubicación actual con una sugerencia entrante de IA,
   * protegiendo individualmente los subcampos editados por el operador.
   */
  fusionarProtegiendo(
    sugerida: UbicacionNormalizada,
    ediciones: RegistroEdicionesOperador,
  ): UbicacionNormalizada {
    return new UbicacionNormalizada({
      calle: ediciones.estaProtegido(CampoEditableLlamada.UBICACION_CALLE)
        ? this.calle
        : sugerida.calle,
      altura: ediciones.estaProtegido(CampoEditableLlamada.UBICACION_ALTURA)
        ? this.altura
        : sugerida.altura,
      interseccion: ediciones.estaProtegido(
        CampoEditableLlamada.UBICACION_INTERSECCION,
      )
        ? this.interseccion
        : sugerida.interseccion,
      barrioComuna: ediciones.estaProtegido(
        CampoEditableLlamada.UBICACION_BARRIO_COMUNA,
      )
        ? this.barrioComuna
        : sugerida.barrioComuna,
      referencia: ediciones.estaProtegido(
        CampoEditableLlamada.UBICACION_REFERENCIA,
      )
        ? this.referencia
        : sugerida.referencia,
    });
  }

  toSnapshot(): UbicacionNormalizadaSnapshot {
    return {
      calle: this.calle,
      altura: this.altura,
      interseccion: this.interseccion,
      barrioComuna: this.barrioComuna,
      referencia: this.referencia,
      camposFaltantes: [...this.camposFaltantes],
    };
  }

  toJSON(): UbicacionNormalizadaSnapshot {
    return this.toSnapshot();
  }
}

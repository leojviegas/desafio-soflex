import { CampoEditableLlamada } from '../enums/campoEditableLlamada.js';
import {
  esPrioridadIncidente,
  type PrioridadIncidente,
} from '../enums/prioridadIncidente.js';
import { DomainValidationError } from '../errors/DomainError.js';
import type { AnalisisCopiloto } from './analisisCopiloto.js';
import type { RegistroEdicionesOperador } from './registroEdicionesOperador.js';
import {
  UbicacionNormalizada,
  type UbicacionNormalizadaProps,
} from './ubicacionNormalizada.js';

export interface FichaIncidenteProps {
  categoriaId?: number | null;
  subcategoriaId?: number | null;
  descripcionIncidente?: string;
  prioridad?: PrioridadIncidente | null;
  ubicacion?: UbicacionNormalizada | UbicacionNormalizadaProps;
  riesgosDetectados?: readonly string[];
  recursosRecomendadosDespacho?: readonly string[];
  notasOperativasDespacho?: string;
}

function normalizarArrayTexto(items: readonly string[]): string[] {
  return items.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Objeto de valor inmutable con los datos operativos del hecho.
 * Actúa como borrador editable en `Llamada` y como ficha validada en `CartaDespacho`.
 */
export class FichaIncidente {
  readonly categoriaId: number | null;
  readonly subcategoriaId: number | null;
  readonly descripcionIncidente: string;
  readonly prioridad: PrioridadIncidente | null;
  readonly ubicacion: UbicacionNormalizada;
  readonly riesgosDetectados: readonly string[];
  readonly recursosRecomendadosDespacho: readonly string[];
  readonly notasOperativasDespacho: string;

  constructor(props: FichaIncidenteProps = {}) {
    const categoriaId = props.categoriaId ?? null;
    if (
      categoriaId !== null &&
      (!Number.isInteger(categoriaId) || categoriaId <= 0)
    ) {
      throw new DomainValidationError(
        'El categoriaId de FichaIncidente debe ser null o un entero positivo.',
        { categoriaId },
      );
    }

    const subcategoriaId = props.subcategoriaId ?? null;
    if (
      subcategoriaId !== null &&
      (!Number.isInteger(subcategoriaId) || subcategoriaId <= 0)
    ) {
      throw new DomainValidationError(
        'El subcategoriaId de FichaIncidente debe ser null o un entero positivo.',
        { subcategoriaId },
      );
    }

    const prioridad = props.prioridad ?? null;
    if (prioridad !== null && !esPrioridadIncidente(prioridad)) {
      throw new DomainValidationError(
        `Prioridad inválida en FichaIncidente: "${String(prioridad)}".`,
        { prioridad },
      );
    }

    this.categoriaId = categoriaId;
    this.subcategoriaId = subcategoriaId;
    this.descripcionIncidente = (props.descripcionIncidente ?? '').trim();
    this.prioridad = prioridad;
    this.ubicacion =
      props.ubicacion instanceof UbicacionNormalizada
        ? props.ubicacion
        : new UbicacionNormalizada(props.ubicacion);
    this.riesgosDetectados = Object.freeze(
      normalizarArrayTexto(props.riesgosDetectados ?? []),
    );
    this.recursosRecomendadosDespacho = Object.freeze(
      normalizarArrayTexto(props.recursosRecomendadosDespacho ?? []),
    );
    this.notasOperativasDespacho = (props.notasOperativasDespacho ?? '').trim();
  }

  static vacia(): FichaIncidente {
    return new FichaIncidente();
  }

  conCambios(parcial: FichaIncidenteProps): FichaIncidente {
    return new FichaIncidente({
      categoriaId:
        parcial.categoriaId !== undefined
          ? parcial.categoriaId
          : this.categoriaId,
      subcategoriaId:
        parcial.subcategoriaId !== undefined
          ? parcial.subcategoriaId
          : this.subcategoriaId,
      descripcionIncidente:
        parcial.descripcionIncidente !== undefined
          ? parcial.descripcionIncidente
          : this.descripcionIncidente,
      prioridad:
        parcial.prioridad !== undefined ? parcial.prioridad : this.prioridad,
      ubicacion:
        parcial.ubicacion !== undefined
          ? parcial.ubicacion instanceof UbicacionNormalizada
            ? parcial.ubicacion
            : this.ubicacion.conCambios(parcial.ubicacion)
          : this.ubicacion,
      riesgosDetectados:
        parcial.riesgosDetectados !== undefined
          ? parcial.riesgosDetectados
          : this.riesgosDetectados,
      recursosRecomendadosDespacho:
        parcial.recursosRecomendadosDespacho !== undefined
          ? parcial.recursosRecomendadosDespacho
          : this.recursosRecomendadosDespacho,
      notasOperativasDespacho:
        parcial.notasOperativasDespacho !== undefined
          ? parcial.notasOperativasDespacho
          : this.notasOperativasDespacho,
    });
  }

  /**
   * Aplica las sugerencias de un `AnalisisCopiloto` protegiendo cada campo
   * registrado en `ediciones` como editado manualmente por el operador.
   */
  fusionarConAnalisis(
    analisis: AnalisisCopiloto,
    ediciones: RegistroEdicionesOperador,
  ): FichaIncidente {
    const subcategoriaProtegida =
      ediciones.estaProtegido(CampoEditableLlamada.SUBCATEGORIA_ID) ||
      ediciones.estaProtegido(CampoEditableLlamada.CATEGORIA_ID);

    return new FichaIncidente({
      categoriaId: subcategoriaProtegida
        ? this.categoriaId
        : analisis.categoriaId,
      subcategoriaId: subcategoriaProtegida
        ? this.subcategoriaId
        : analisis.subcategoriaId,
      descripcionIncidente: ediciones.estaProtegido(
        CampoEditableLlamada.DESCRIPCION_INCIDENTE,
      )
        ? this.descripcionIncidente
        : analisis.descripcionIncidente,
      prioridad: ediciones.estaProtegido(CampoEditableLlamada.PRIORIDAD)
        ? this.prioridad
        : analisis.prioridadSugerida,
      ubicacion: this.ubicacion.fusionarProtegiendo(
        analisis.ubicacion,
        ediciones,
      ),
      riesgosDetectados: ediciones.estaProtegido(
        CampoEditableLlamada.RIESGOS_DETECTADOS,
      )
        ? this.riesgosDetectados
        : analisis.riesgosDetectados,
      recursosRecomendadosDespacho: ediciones.estaProtegido(
        CampoEditableLlamada.RECURSOS_RECOMENDADOS,
      )
        ? this.recursosRecomendadosDespacho
        : analisis.recursosRecomendadosDespacho,
      notasOperativasDespacho: ediciones.estaProtegido(
        CampoEditableLlamada.NOTAS_OPERATIVAS,
      )
        ? this.notasOperativasDespacho
        : analisis.notasOperativasDespacho,
    });
  }

  /**
   * Lista los requisitos mínimos faltantes para poder derivar la ficha al CAD.
   */
  obtenerCamposFaltantesParaCAD(): string[] {
    const faltantes: string[] = [];
    if (this.categoriaId === null) {
      faltantes.push('categoriaId');
    }
    if (this.subcategoriaId === null) {
      faltantes.push('subcategoriaId');
    }
    if (this.prioridad === null) {
      faltantes.push('prioridad');
    }
    if (!this.ubicacion.tieneUbicacionMinima()) {
      faltantes.push('ubicacion (calle, interseccion o referencia)');
    }
    if (this.notasOperativasDespacho.length === 0) {
      faltantes.push('notasOperativasDespacho');
    }
    return faltantes;
  }

  validarParaDerivacionCAD(): void {
    const faltantes = this.obtenerCamposFaltantesParaCAD();
    if (faltantes.length > 0) {
      throw new DomainValidationError(
        `No se puede derivar a CAD porque faltan datos obligatorios: ${faltantes.join(', ')}.`,
        { camposFaltantes: faltantes },
      );
    }
  }
}

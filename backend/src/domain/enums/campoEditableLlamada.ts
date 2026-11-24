export const CampoEditableLlamada = Object.freeze({
  CATEGORIA_ID: 'categoriaId',
  SUBCATEGORIA_ID: 'subcategoriaId',
  DESCRIPCION_INCIDENTE: 'descripcionIncidente',
  PRIORIDAD: 'prioridad',
  UBICACION_CALLE: 'ubicacion.calle',
  UBICACION_ALTURA: 'ubicacion.altura',
  UBICACION_INTERSECCION: 'ubicacion.interseccion',
  UBICACION_BARRIO_COMUNA: 'ubicacion.barrioComuna',
  UBICACION_REFERENCIA: 'ubicacion.referencia',
  RIESGOS_DETECTADOS: 'riesgosDetectados',
  RECURSOS_RECOMENDADOS: 'recursosRecomendadosDespacho',
  NOTAS_OPERATIVAS: 'notasOperativasDespacho',
} as const);

export type CampoEditableLlamada =
  (typeof CampoEditableLlamada)[keyof typeof CampoEditableLlamada];

export const CAMPOS_EDITABLES_LLAMADA = Object.freeze(
  Object.values(CampoEditableLlamada),
) as readonly CampoEditableLlamada[];

export function esCampoEditableLlamada(
  value: unknown,
): value is CampoEditableLlamada {
  return (
    typeof value === 'string' &&
    (CAMPOS_EDITABLES_LLAMADA as readonly string[]).includes(value)
  );
}

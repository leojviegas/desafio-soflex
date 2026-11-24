import { z, type ZodType } from 'zod';
import {
  ESTADOS_PREGUNTA_IA,
  ESTADOS_PREGUNTA_OPERADOR,
  NIVELES_CERTEZA,
  PRIORIDADES_INCIDENTE,
  PROVEEDORES_IA,
  type AnalisisCopilotoSnapshot,
  type ItemChecklistLlamadaSnapshot,
  type ItemInstruccionPreArriboSnapshot,
  type UbicacionNormalizadaSnapshot,
} from '../domain/index.js';
import { RepositoryError } from './errors/RepositoryError.js';

export const StringArrayJsonSchema = z.array(z.string());

export const UbicacionNormalizadaJsonSchema: ZodType<UbicacionNormalizadaSnapshot> =
  z.object({
    calle: z.string().nullable(),
    altura: z.string().nullable(),
    interseccion: z.string().nullable(),
    barrioComuna: z.string().nullable(),
    referencia: z.string().nullable(),
    camposFaltantes: z.array(z.string()),
  });

export const ItemChecklistLlamadaJsonSchema: ZodType<ItemChecklistLlamadaSnapshot> =
  z.object({
    preguntaId: z.number().int().positive(),
    texto: z.string().min(1),
    critica: z.boolean(),
    esUniversal: z.boolean(),
    estadoIA: z.enum(
      ESTADOS_PREGUNTA_IA as [
        (typeof ESTADOS_PREGUNTA_IA)[number],
        ...(typeof ESTADOS_PREGUNTA_IA)[number][],
      ],
    ),
    respuestaIA: z.string().nullable(),
    citaEvidencia: z.string().nullable(),
    evidenciaVerificada: z.boolean(),
    estadoOperador: z
      .enum(
        ESTADOS_PREGUNTA_OPERADOR as [
          (typeof ESTADOS_PREGUNTA_OPERADOR)[number],
          ...(typeof ESTADOS_PREGUNTA_OPERADOR)[number][],
        ],
      )
      .nullable(),
    notaOperador: z.string().nullable(),
  });

export const ChecklistJsonSchema = z.array(ItemChecklistLlamadaJsonSchema);

export const ItemInstruccionPreArriboJsonSchema: ZodType<ItemInstruccionPreArriboSnapshot> =
  z.object({
    instruccionId: z.number().int().positive(),
    texto: z.string().min(1),
    critica: z.boolean(),
    transmitida: z.boolean(),
  });

export const InstruccionesPreArriboJsonSchema = z.array(
  ItemInstruccionPreArriboJsonSchema,
);

export const AnalisisCopilotoJsonSchema: ZodType<AnalisisCopilotoSnapshot> =
  z.object({
    categoriaId: z.number().int().positive(),
    subcategoriaId: z.number().int().positive(),
    descripcionIncidente: z.string().min(1),
    ubicacion: UbicacionNormalizadaJsonSchema,
    prioridadSugerida: z.enum(
      PRIORIDADES_INCIDENTE as [
        (typeof PRIORIDADES_INCIDENTE)[number],
        ...(typeof PRIORIDADES_INCIDENTE)[number][],
      ],
    ),
    checklist: ChecklistJsonSchema,
    instruccionesPreArribo: InstruccionesPreArriboJsonSchema,
    riesgosDetectados: StringArrayJsonSchema,
    recursosRecomendadosDespacho: StringArrayJsonSchema,
    notasOperativasDespacho: z.string(),
    confianzaGlobal: z.enum(
      NIVELES_CERTEZA as [
        (typeof NIVELES_CERTEZA)[number],
        ...(typeof NIVELES_CERTEZA)[number][],
      ],
    ),
    proveedorUsado: z.enum(
      PROVEEDORES_IA as [
        (typeof PROVEEDORES_IA)[number],
        ...(typeof PROVEEDORES_IA)[number][],
      ],
    ),
    modeloUsado: z.string().min(1),
    latenciaMs: z.number().nonnegative(),
    degradado: z.boolean(),
    motivoDegradacion: z.string().nullable(),
  });

export function parseJsonWithSchema<T>(
  raw: string,
  schema: ZodType<T>,
  column: string,
): T {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new RepositoryError(
      `JSON inválido en columna SQLite "${column}": ${(error as Error).message}`,
      { column },
    );
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    throw new RepositoryError(
      `Estructura inválida en columna SQLite "${column}": ${result.error.message}`,
      { column, issues: result.error.issues },
    );
  }
  return result.data;
}

export function parseNullableJsonWithSchema<T>(
  raw: string | null,
  schema: ZodType<T>,
  column: string,
): T | null {
  if (raw === null) {
    return null;
  }
  return parseJsonWithSchema(raw, schema, column);
}

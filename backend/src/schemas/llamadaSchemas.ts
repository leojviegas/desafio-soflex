import { z } from 'zod';
import {
  ESTADOS_LLAMADA,
  ESTADOS_PREGUNTA_OPERADOR,
  HABLANTES_TURNO,
  ORIGENES_REPORTE,
  PRIORIDADES_INCIDENTE,
} from '../domain/index.js';

/**
 * Valida un parámetro de query opcional entero positivo.
 * Trata `undefined` o string vacío `""` como ausente (`undefined`).
 */
export const optionalPositiveIntQuery = z.preprocess((value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    if (!/^\d+$/.test(trimmed)) {
      return Number.NaN;
    }
    return Number(trimmed);
  }
  return value;
}, z.number().int().positive().optional());

/**
 * Crea un validador de enum opcional para query params tratando `""` como `undefined`.
 */
export function optionalEnumQuery<T extends string>(values: readonly T[]) {
  return z.preprocess(
    (value: unknown) => {
      if (value === undefined || value === null) {
        return undefined;
      }
      if (typeof value === 'string' && value.trim().length === 0) {
        return undefined;
      }
      return value;
    },
    z.enum(values as [T, ...T[]]).optional(),
  );
}

export const LlamadaIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'El id de llamada es obligatorio.'),
});

export const CrearLlamadaBodySchema = z
  .object({
    origenReporte: z.enum(ORIGENES_REPORTE),
    transcripcionCruda: z
      .string()
      .refine((v) => v.trim().length > 0, {
        message: 'La transcripción no puede estar vacía.',
      }),
    analizarAhora: z.boolean().optional().default(false),
  })
  .strict();

export const ListarLlamadasQuerySchema = z.object({
  estado: optionalEnumQuery(ESTADOS_LLAMADA),
  categoriaId: optionalPositiveIntQuery,
  subcategoriaId: optionalPositiveIntQuery,
  prioridad: optionalEnumQuery(PRIORIDADES_INCIDENTE),
});

export const AgregarTurnoBodySchema = z
  .object({
    hablante: z.enum(HABLANTES_TURNO),
    texto: z
      .string()
      .refine((v) => v.trim().length > 0, {
        message: 'El texto del turno no puede estar vacío.',
      }),
    reanalizar: z.boolean().optional().default(false),
  })
  .strict();

export const AnalizarLlamadaBodySchema = z
  .object({
    simularDegradado: z.boolean().optional(),
  })
  .strict();

export const PatchLlamadaBodySchema = z
  .object({
    transcripcionCruda: z
      .string()
      .refine((v) => v.trim().length > 0, {
        message: 'La transcripción no puede estar vacía.',
      })
      .optional(),
    ubicacion: z
      .object({
        calle: z.string().nullable().optional(),
        altura: z.string().nullable().optional(),
        interseccion: z.string().nullable().optional(),
        barrioComuna: z.string().nullable().optional(),
        referencia: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    categoriaId: z.number().int().positive().optional(),
    subcategoriaId: z.number().int().positive().optional(),
    descripcionIncidente: z.string().optional(),
    prioridad: z.enum(PRIORIDADES_INCIDENTE).nullable().optional(),
    checklist: z
      .array(
        z
          .object({
            preguntaId: z.number().int().positive(),
            estadoOperador: z.enum(ESTADOS_PREGUNTA_OPERADOR).nullable(),
            notaOperador: z.string().nullable().optional(),
          })
          .strict(),
      )
      .optional(),
    instruccionesPreArribo: z
      .array(
        z
          .object({
            instruccionId: z.number().int().positive(),
            transmitida: z.boolean(),
          })
          .strict(),
      )
      .optional(),
    riesgosDetectados: z.array(z.string()).optional(),
    recursosRecomendadosDespacho: z.array(z.string()).optional(),
    notasOperativasDespacho: z.string().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debe enviar al menos un campo editable para actualizar la llamada.',
  });

export const DerivarLlamadaBodySchema = z
  .object({
    notasOperativasDespacho: z.string().optional(),
  })
  .strict();

export type LlamadaIdParams = z.infer<typeof LlamadaIdParamsSchema>;
export type CrearLlamadaBody = z.infer<typeof CrearLlamadaBodySchema>;
export type ListarLlamadasQuery = z.infer<typeof ListarLlamadasQuerySchema>;
export type AgregarTurnoBody = z.infer<typeof AgregarTurnoBodySchema>;
export type AnalizarLlamadaBody = z.infer<typeof AnalizarLlamadaBodySchema>;
export type PatchLlamadaBody = z.infer<typeof PatchLlamadaBodySchema>;
export type DerivarLlamadaBody = z.infer<typeof DerivarLlamadaBodySchema>;

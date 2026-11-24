import { z } from 'zod';

/**
 * Esquema estricto de ubicación extraída desde la transcripción.
 * Se utiliza `.nullable()` en lugar de `.optional()` por compatibilidad con JSON Schema de proveedores LLM.
 */
export const UbicacionExtraidaSchema = z.object({
  calle: z.string().nullable(),
  altura: z.string().nullable(),
  interseccion: z.string().nullable(),
  barrioComuna: z.string().nullable(),
  referencia: z.string().nullable(),
});

/**
 * Pregunta del protocolo oficial sobre la cual existe evidencia en la transcripción.
 * Las preguntas sin evidencia no deben incluirse aquí; el backend las calcula por resta como `PENDIENTE`.
 */
export const PreguntaDetectadaIASchema = z.object({
  preguntaId: z.number().int().positive(),
  estado: z.enum(['RESPONDIDA', 'AMBIGUA']),
  respuestaExtraida: z.string().min(1),
  citaEvidencia: z.string().min(1),
});

/**
 * Esquema estructurado de salida del LLM para el análisis de una llamada ciudadana.
 */
export const LlmCopilotOutputSchema = z.object({
  categoriaId: z.number().int().positive(),
  subcategoriaId: z.number().int().positive(),
  descripcionIncidente: z.string().min(1),
  ubicacion: UbicacionExtraidaSchema,
  prioridadSugerida: z.enum(['P1', 'P2', 'P3', 'P4']),
  preguntasDetectadas: z.array(PreguntaDetectadaIASchema),
  riesgosDetectados: z.array(z.string()),
  notasOperativasDespacho: z.string().min(1),
  recursosRecomendadosDespacho: z.array(z.string()),
  confianzaGlobal: z.enum(['ALTA', 'MEDIA', 'BAJA']),
});

export type UbicacionExtraida = z.infer<typeof UbicacionExtraidaSchema>;
export type PreguntaDetectadaIA = z.infer<typeof PreguntaDetectadaIASchema>;
export type LlmCopilotOutput = z.infer<typeof LlmCopilotOutputSchema>;

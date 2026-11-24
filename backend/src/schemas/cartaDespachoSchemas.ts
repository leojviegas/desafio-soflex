import { z } from 'zod';
import { PRIORIDADES_INCIDENTE } from '../domain/index.js';
import {
  optionalEnumQuery,
  optionalPositiveIntQuery,
} from './llamadaSchemas.js';

export const CartaDespachoIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'El id de carta de despacho es obligatorio.'),
});

export const ListarCartasDespachoQuerySchema = z.object({
  prioridad: optionalEnumQuery(PRIORIDADES_INCIDENTE),
  categoriaId: optionalPositiveIntQuery,
  subcategoriaId: optionalPositiveIntQuery,
});

export type CartaDespachoIdParams = z.infer<typeof CartaDespachoIdParamsSchema>;
export type ListarCartasDespachoQuery = z.infer<typeof ListarCartasDespachoQuerySchema>;

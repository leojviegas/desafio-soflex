import type {
  CartaDespacho,
  EstadoLlamada,
  Llamada,
  PrioridadIncidente,
} from '../domain/index.js';

export interface ListarLlamadasFiltros {
  estado?: EstadoLlamada;
  categoriaId?: number;
  subcategoriaId?: number;
  prioridad?: PrioridadIncidente;
}

export interface LlamadaRepository {
  save(llamada: Llamada): Promise<void>;
  findById(id: string): Promise<Llamada | null>;
  findAll(filtros?: ListarLlamadasFiltros): Promise<Llamada[]>;
  deleteById(id: string): Promise<boolean>;
  count(): Promise<number>;
  derivarAtomicamente(llamada: Llamada, cartaDespacho: CartaDespacho): Promise<void>;
}

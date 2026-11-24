import type { CartaDespacho, PrioridadIncidente } from '../domain/index.js';

export interface ListarCartasDespachoFiltros {
  prioridad?: PrioridadIncidente;
  categoriaId?: number;
  subcategoriaId?: number;
}

export interface CartaDespachoRepository {
  create(carta: CartaDespacho): Promise<void>;
  findById(id: string): Promise<CartaDespacho | null>;
  findByLlamadaId(llamadaId: string): Promise<CartaDespacho | null>;
  findAll(filtros?: ListarCartasDespachoFiltros): Promise<CartaDespacho[]>;
  count(): Promise<number>;
}

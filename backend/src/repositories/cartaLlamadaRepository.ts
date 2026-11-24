import type {
  CartaLlamada,
  CategoriaIncidente,
  EstadoCartaLlamada,
  PrioridadIncidente,
} from '../domain/index.js';

export interface ListarCartasFiltros {
  estado?: EstadoCartaLlamada;
  categoria?: CategoriaIncidente;
  prioridad?: PrioridadIncidente;
}

export interface CartaLlamadaRepository {
  save(carta: CartaLlamada): Promise<void>;
  findById(id: string): Promise<CartaLlamada | null>;
  findAll(filtros?: ListarCartasFiltros): Promise<CartaLlamada[]>;
  deleteById(id: string): Promise<boolean>;
  count(): Promise<number>;
}

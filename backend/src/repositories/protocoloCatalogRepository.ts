import type { CategoriaIncidente, ProtocoloReferencia } from '../domain/index.js';

export interface ProtocoloPorCategoria {
  categoria: CategoriaIncidente;
  subcategorias: string[];
  preguntasMandatorias: string[];
  instruccionesPreArribo: string[];
  riesgosFrecuentes: string[];
  recursosRecomendados: string[];
  cantidadCasos: number;
}

export interface ProtocoloCatalogRepository {
  findAll(): ProtocoloReferencia[];
  findById(idRegistro: string): ProtocoloReferencia | null;
  findByCategoria(categoria: CategoriaIncidente): ProtocoloReferencia[];
  getProtocolosPorCategoria(): ProtocoloPorCategoria[];
  count(): number;
}

import type {
  InstruccionPreArriboDefProps,
  PreguntaProtocoloDefProps,
} from '../domain/index.js';
import type { ProtocoloRepository } from '../repositories/index.js';

export interface SubcategoriaCatalogoDto {
  id: number;
  categoriaId: number;
  nombre: string;
  etiqueta: string;
  criterio: string;
  preguntas: PreguntaProtocoloDefProps[];
  instruccionesPreArribo: InstruccionPreArriboDefProps[];
}

export interface CategoriaCatalogoDto {
  id: number;
  nombre: string;
  etiqueta: string;
  subcategorias: SubcategoriaCatalogoDto[];
}

export interface CatalogoProtocolosDto {
  preguntasUniversales: PreguntaProtocoloDefProps[];
  categorias: CategoriaCatalogoDto[];
}

/**
 * Servicio de lectura del catálogo normalizado de protocolos operativos.
 */
export class ProtocoloService {
  constructor(private readonly protocoloRepository: ProtocoloRepository) {}

  async obtenerCatalogoCompleto(): Promise<CatalogoProtocolosDto> {
    const catalogo = await this.protocoloRepository.listarCatalogoCompleto();

    return {
      preguntasUniversales: catalogo.preguntasUniversales.map((p) => p.toJSON()),
      categorias: catalogo.categorias.map((cat) => ({
        id: cat.id,
        nombre: cat.nombre,
        etiqueta: cat.etiqueta,
        subcategorias: cat.subcategorias.map((sub) => ({
          id: sub.id,
          categoriaId: sub.categoriaId,
          nombre: sub.nombre,
          etiqueta: sub.etiqueta,
          criterio: sub.criterio,
          preguntas: sub.preguntas.map((p) => p.toJSON()),
          instruccionesPreArribo: sub.instruccionesPreArribo.map((i) =>
            i.toJSON(),
          ),
        })),
      })),
    };
  }
}

import type {
  CategoriaProtocolo,
  InstruccionPreArriboDef,
  PreguntaProtocoloDef,
  SubcategoriaProtocolo,
} from '../domain/index.js';

export interface SubcategoriaCatalogoConDetalles {
  id: number;
  categoriaId: number;
  nombre: string;
  etiqueta: string;
  criterio: string;
  preguntas: PreguntaProtocoloDef[];
  instruccionesPreArribo: InstruccionPreArriboDef[];
}

export interface CategoriaCatalogoConSubcategorias {
  id: number;
  nombre: string;
  etiqueta: string;
  subcategorias: SubcategoriaCatalogoConDetalles[];
}

export interface CatalogoProtocolosCompleto {
  preguntasUniversales: PreguntaProtocoloDef[];
  categorias: CategoriaCatalogoConSubcategorias[];
}

export interface PreguntaPromptResumen {
  id: number;
  texto: string;
  critica: boolean;
}

export interface SubcategoriaPromptResumen {
  id: number;
  nombre: string;
  etiqueta: string;
  criterio: string;
  preguntas: PreguntaPromptResumen[];
}

export interface CategoriaPromptResumen {
  id: number;
  nombre: string;
  etiqueta: string;
  subcategorias: SubcategoriaPromptResumen[];
}

export interface ResumenCatalogoPrompt {
  preguntasUniversales: PreguntaPromptResumen[];
  categorias: CategoriaPromptResumen[];
}

export interface ProtocoloRepository {
  listarCatalogoCompleto(): Promise<CatalogoProtocolosCompleto>;
  listarCategorias(): Promise<CategoriaProtocolo[]>;
  findCategoriaById(id: number): Promise<CategoriaProtocolo | null>;
  findCategoriaByNombre(nombre: string): Promise<CategoriaProtocolo | null>;
  listarSubcategorias(categoriaId?: number): Promise<SubcategoriaProtocolo[]>;
  findSubcategoriaById(id: number): Promise<SubcategoriaProtocolo | null>;
  findSubcategoriaByNombre(nombre: string): Promise<SubcategoriaProtocolo | null>;
  findPreguntasUniversales(): Promise<PreguntaProtocoloDef[]>;
  findPreguntasParaSubcategoria(subcategoriaId: number): Promise<PreguntaProtocoloDef[]>;
  findInstruccionesPreArribo(subcategoriaId: number): Promise<InstruccionPreArriboDef[]>;
  obtenerResumenParaPrompt(): Promise<ResumenCatalogoPrompt>;
  countCategorias(): Promise<number>;
  countSubcategorias(): Promise<number>;
}

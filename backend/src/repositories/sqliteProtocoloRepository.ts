import type { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import {
  CategoriaProtocolo,
  InstruccionPreArriboDef,
  PreguntaProtocoloDef,
  SubcategoriaProtocolo,
} from '../domain/index.js';
import type {
  CatalogoProtocolosCompleto,
  CategoriaCatalogoConSubcategorias,
  CategoriaPromptResumen,
  PreguntaPromptResumen,
  ProtocoloRepository,
  ResumenCatalogoPrompt,
  SubcategoriaCatalogoConDetalles,
  SubcategoriaPromptResumen,
} from './protocoloRepository.js';
import { parseJsonWithSchema, StringArrayJsonSchema } from './sqliteJsonSchemas.js';

type SqlRow = Record<string, SQLOutputValue>;

function expectNumber(row: SqlRow, column: string): number {
  const value = row[column];
  if (typeof value !== 'number') {
    throw new Error(`Columna SQLite "${column}" inválida: se esperaba number.`);
  }
  return value;
}

function expectNullableNumber(row: SqlRow, column: string): number | null {
  const value = row[column];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'number') {
    throw new Error(`Columna SQLite "${column}" inválida: se esperaba number | null.`);
  }
  return value;
}

function expectString(row: SqlRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    throw new Error(`Columna SQLite "${column}" inválida: se esperaba string.`);
  }
  return value;
}

function mapCategoria(row: SqlRow): CategoriaProtocolo {
  return new CategoriaProtocolo({
    id: expectNumber(row, 'id'),
    nombre: expectString(row, 'nombre'),
    etiqueta: expectString(row, 'etiqueta'),
  });
}

function mapSubcategoria(row: SqlRow): SubcategoriaProtocolo {
  return new SubcategoriaProtocolo({
    id: expectNumber(row, 'id'),
    categoriaId: expectNumber(row, 'categoria_id'),
    nombre: expectString(row, 'nombre'),
    etiqueta: expectString(row, 'etiqueta'),
    criterio: expectString(row, 'criterio'),
  });
}

function mapPregunta(row: SqlRow): PreguntaProtocoloDef {
  return new PreguntaProtocoloDef({
    id: expectNumber(row, 'id'),
    subcategoriaId: expectNullableNumber(row, 'subcategoria_id'),
    texto: expectString(row, 'texto'),
    critica: expectNumber(row, 'critica') === 1,
    pistasMock: parseJsonWithSchema(
      expectString(row, 'pistas_mock_json'),
      StringArrayJsonSchema,
      'pistas_mock_json',
    ),
  });
}

function mapInstruccion(row: SqlRow): InstruccionPreArriboDef {
  return new InstruccionPreArriboDef({
    id: expectNumber(row, 'id'),
    subcategoriaId: expectNumber(row, 'subcategoria_id'),
    texto: expectString(row, 'texto'),
    critica: expectNumber(row, 'critica') === 1,
  });
}

export class SqliteProtocoloRepository implements ProtocoloRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async listarCatalogoCompleto(): Promise<CatalogoProtocolosCompleto> {
    const categorias = await this.listarCategorias();
    const subcategorias = await this.listarSubcategorias();
    const universales = await this.findPreguntasUniversales();

    const preguntasRows = this.db
      .prepare(
        'SELECT * FROM preguntas_protocolo WHERE subcategoria_id IS NOT NULL ORDER BY id ASC',
      )
      .all() as SqlRow[];
    const instruccionesRows = this.db
      .prepare(
        'SELECT * FROM instrucciones_prearribo_protocolo ORDER BY id ASC',
      )
      .all() as SqlRow[];

    const preguntasPorSub = new Map<number, PreguntaProtocoloDef[]>();
    for (const row of preguntasRows) {
      const pregunta = mapPregunta(row);
      if (pregunta.subcategoriaId !== null) {
        const list = preguntasPorSub.get(pregunta.subcategoriaId) ?? [];
        list.push(pregunta);
        preguntasPorSub.set(pregunta.subcategoriaId, list);
      }
    }

    const instruccionesPorSub = new Map<number, InstruccionPreArriboDef[]>();
    for (const row of instruccionesRows) {
      const instruccion = mapInstruccion(row);
      const list = instruccionesPorSub.get(instruccion.subcategoriaId) ?? [];
      list.push(instruccion);
      instruccionesPorSub.set(instruccion.subcategoriaId, list);
    }

    const subsPorCat = new Map<number, SubcategoriaCatalogoConDetalles[]>();
    for (const sub of subcategorias) {
      const detalle: SubcategoriaCatalogoConDetalles = {
        id: sub.id,
        categoriaId: sub.categoriaId,
        nombre: sub.nombre,
        etiqueta: sub.etiqueta,
        criterio: sub.criterio,
        preguntas: preguntasPorSub.get(sub.id) ?? [],
        instruccionesPreArribo: instruccionesPorSub.get(sub.id) ?? [],
      };
      const list = subsPorCat.get(sub.categoriaId) ?? [];
      list.push(detalle);
      subsPorCat.set(sub.categoriaId, list);
    }

    const categoriasCompletas: CategoriaCatalogoConSubcategorias[] = categorias.map(
      (cat) => ({
        id: cat.id,
        nombre: cat.nombre,
        etiqueta: cat.etiqueta,
        subcategorias: subsPorCat.get(cat.id) ?? [],
      }),
    );

    return {
      preguntasUniversales: universales,
      categorias: categoriasCompletas,
    };
  }

  async listarCategorias(): Promise<CategoriaProtocolo[]> {
    const rows = this.db
      .prepare('SELECT * FROM categorias ORDER BY id ASC')
      .all() as SqlRow[];
    return rows.map(mapCategoria);
  }

  async findCategoriaById(id: number): Promise<CategoriaProtocolo | null> {
    const row = this.db
      .prepare('SELECT * FROM categorias WHERE id = ?')
      .get(id) as SqlRow | undefined;
    return row ? mapCategoria(row) : null;
  }

  async findCategoriaByNombre(nombre: string): Promise<CategoriaProtocolo | null> {
    const row = this.db
      .prepare('SELECT * FROM categorias WHERE nombre = ?')
      .get(nombre) as SqlRow | undefined;
    return row ? mapCategoria(row) : null;
  }

  async listarSubcategorias(categoriaId?: number): Promise<SubcategoriaProtocolo[]> {
    if (categoriaId !== undefined) {
      const rows = this.db
        .prepare('SELECT * FROM subcategorias WHERE categoria_id = ? ORDER BY id ASC')
        .all(categoriaId) as SqlRow[];
      return rows.map(mapSubcategoria);
    }
    const rows = this.db
      .prepare('SELECT * FROM subcategorias ORDER BY id ASC')
      .all() as SqlRow[];
    return rows.map(mapSubcategoria);
  }

  async findSubcategoriaById(id: number): Promise<SubcategoriaProtocolo | null> {
    const row = this.db
      .prepare('SELECT * FROM subcategorias WHERE id = ?')
      .get(id) as SqlRow | undefined;
    return row ? mapSubcategoria(row) : null;
  }

  async findSubcategoriaByNombre(
    nombre: string,
  ): Promise<SubcategoriaProtocolo | null> {
    const row = this.db
      .prepare('SELECT * FROM subcategorias WHERE nombre = ?')
      .get(nombre) as SqlRow | undefined;
    return row ? mapSubcategoria(row) : null;
  }

  async findPreguntasUniversales(): Promise<PreguntaProtocoloDef[]> {
    const rows = this.db
      .prepare(
        'SELECT * FROM preguntas_protocolo WHERE subcategoria_id IS NULL ORDER BY id ASC',
      )
      .all() as SqlRow[];
    return rows.map(mapPregunta);
  }

  async findPreguntasParaSubcategoria(
    subcategoriaId: number,
  ): Promise<PreguntaProtocoloDef[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM preguntas_protocolo
         WHERE subcategoria_id IS NULL OR subcategoria_id = ?
         ORDER BY CASE WHEN subcategoria_id IS NULL THEN 0 ELSE 1 END, id ASC`,
      )
      .all(subcategoriaId) as SqlRow[];
    return rows.map(mapPregunta);
  }

  async findInstruccionesPreArribo(
    subcategoriaId: number,
  ): Promise<InstruccionPreArriboDef[]> {
    const rows = this.db
      .prepare(
        'SELECT * FROM instrucciones_prearribo_protocolo WHERE subcategoria_id = ? ORDER BY id ASC',
      )
      .all(subcategoriaId) as SqlRow[];
    return rows.map(mapInstruccion);
  }

  async obtenerResumenParaPrompt(): Promise<ResumenCatalogoPrompt> {
    const universalesRows = this.db
      .prepare(
        'SELECT id, texto, critica FROM preguntas_protocolo WHERE subcategoria_id IS NULL ORDER BY id ASC',
      )
      .all() as SqlRow[];

    const preguntasUniversales: PreguntaPromptResumen[] = universalesRows.map((row) => ({
      id: expectNumber(row, 'id'),
      texto: expectString(row, 'texto'),
      critica: expectNumber(row, 'critica') === 1,
    }));

    // JOIN compacto excluyendo explícitamente instrucciones_prearribo_protocolo
    const joinRows = this.db
      .prepare(
        `SELECT
           c.id AS cat_id,
           c.nombre AS cat_nombre,
           c.etiqueta AS cat_etiqueta,
           s.id AS sub_id,
           s.nombre AS sub_nombre,
           s.etiqueta AS sub_etiqueta,
           s.criterio AS sub_criterio,
           p.id AS preg_id,
           p.texto AS preg_texto,
           p.critica AS preg_critica
         FROM categorias c
         INNER JOIN subcategorias s ON s.categoria_id = c.id
         LEFT JOIN preguntas_protocolo p ON p.subcategoria_id = s.id
         ORDER BY c.id ASC, s.id ASC, p.id ASC`,
      )
      .all() as SqlRow[];

    const catMap = new Map<number, CategoriaPromptResumen>();
    const subMap = new Map<number, SubcategoriaPromptResumen>();

    for (const row of joinRows) {
      const catId = expectNumber(row, 'cat_id');
      let cat = catMap.get(catId);
      if (!cat) {
        cat = {
          id: catId,
          nombre: expectString(row, 'cat_nombre'),
          etiqueta: expectString(row, 'cat_etiqueta'),
          subcategorias: [],
        };
        catMap.set(catId, cat);
      }

      const subId = expectNumber(row, 'sub_id');
      let sub = subMap.get(subId);
      if (!sub) {
        sub = {
          id: subId,
          nombre: expectString(row, 'sub_nombre'),
          etiqueta: expectString(row, 'sub_etiqueta'),
          criterio: expectString(row, 'sub_criterio'),
          preguntas: [],
        };
        subMap.set(subId, sub);
        cat.subcategorias.push(sub);
      }

      const pregId = expectNullableNumber(row, 'preg_id');
      if (pregId !== null) {
        sub.preguntas.push({
          id: pregId,
          texto: expectString(row, 'preg_texto'),
          critica: expectNumber(row, 'preg_critica') === 1,
        });
      }
    }

    return {
      preguntasUniversales,
      categorias: [...catMap.values()],
    };
  }

  async countCategorias(): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) AS total FROM categorias')
      .get() as SqlRow | undefined;
    return Number(row?.total ?? 0);
  }

  async countSubcategorias(): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) AS total FROM subcategorias')
      .get() as SqlRow | undefined;
    return Number(row?.total ?? 0);
  }
}

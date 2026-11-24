import type { DatabaseSync, SQLInputValue, SQLOutputValue } from 'node:sqlite';
import {
  CartaDespacho,
  esOrigenReporte,
  esPrioridadIncidente,
  type CartaDespachoSnapshot,
} from '../domain/index.js';
import type {
  CartaDespachoRepository,
  ListarCartasDespachoFiltros,
} from './cartaDespachoRepository.js';
import { DuplicateEntityError } from './errors/RepositoryError.js';
import {
  parseJsonWithSchema,
  StringArrayJsonSchema,
  UbicacionNormalizadaJsonSchema,
} from './sqliteJsonSchemas.js';

type SqlRow = Record<string, SQLOutputValue>;

function expectString(row: SqlRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    throw new Error(`Columna SQLite "${column}" inválida: se esperaba string.`);
  }
  return value;
}

function expectNumber(row: SqlRow, column: string): number {
  const value = row[column];
  if (typeof value !== 'number') {
    throw new Error(`Columna SQLite "${column}" inválida: se esperaba number.`);
  }
  return value;
}

function isSqliteUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toUpperCase();
  return msg.includes('UNIQUE CONSTRAINT FAILED') || msg.includes('SQLITE_CONSTRAINT_UNIQUE');
}

function mapRowToCartaDespacho(row: SqlRow): CartaDespacho {
  const origenRaw = expectString(row, 'origen_reporte');
  if (!esOrigenReporte(origenRaw)) {
    throw new Error(`Valor inválido en origen_reporte: "${origenRaw}".`);
  }

  const prioridadRaw = expectString(row, 'prioridad');
  if (!esPrioridadIncidente(prioridadRaw)) {
    throw new Error(`Valor inválido en prioridad: "${prioridadRaw}".`);
  }

  const snapshot: CartaDespachoSnapshot = {
    id: expectString(row, 'id'),
    llamadaId: expectString(row, 'llamada_id'),
    origenReporte: origenRaw,
    categoriaId: expectNumber(row, 'categoria_id'),
    subcategoriaId: expectNumber(row, 'subcategoria_id'),
    descripcionIncidente: expectString(row, 'descripcion_incidente'),
    prioridad: prioridadRaw,
    ubicacion: parseJsonWithSchema(
      expectString(row, 'ubicacion_json'),
      UbicacionNormalizadaJsonSchema,
      'ubicacion_json',
    ),
    riesgosDetectados: parseJsonWithSchema(
      expectString(row, 'riesgos_detectados_json'),
      StringArrayJsonSchema,
      'riesgos_detectados_json',
    ),
    recursosRecomendadosDespacho: parseJsonWithSchema(
      expectString(row, 'recursos_recomendados_despacho_json'),
      StringArrayJsonSchema,
      'recursos_recomendados_despacho_json',
    ),
    notasOperativasDespacho: expectString(row, 'notas_operativas_despacho'),
    derivadaEn: expectString(row, 'derivada_en'),
  };

  return CartaDespacho.rehidratar(snapshot);
}

const INSERT_SQL = `
INSERT INTO cartas_despacho (
  id,
  llamada_id,
  origen_reporte,
  categoria_id,
  subcategoria_id,
  descripcion_incidente,
  prioridad,
  ubicacion_json,
  riesgos_detectados_json,
  recursos_recomendados_despacho_json,
  notas_operativas_despacho,
  derivada_en
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
`;

export class SqliteCartaDespachoRepository implements CartaDespachoRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async create(carta: CartaDespacho): Promise<void> {
    const s = carta.toSnapshot();
    try {
      this.db
        .prepare(INSERT_SQL)
        .run(
          s.id,
          s.llamadaId,
          s.origenReporte,
          s.categoriaId,
          s.subcategoriaId,
          s.descripcionIncidente,
          s.prioridad,
          JSON.stringify(s.ubicacion),
          JSON.stringify(s.riesgosDetectados),
          JSON.stringify(s.recursosRecomendadosDespacho),
          s.notasOperativasDespacho,
          s.derivadaEn,
        );
    } catch (error) {
      if (isSqliteUniqueConstraintError(error)) {
        throw new DuplicateEntityError(
          `Ya existe una CartaDespacho para la llamada "${s.llamadaId}" o id "${s.id}".`,
          { id: s.id, llamadaId: s.llamadaId },
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<CartaDespacho | null> {
    const row = this.db
      .prepare('SELECT * FROM cartas_despacho WHERE id = ?')
      .get(id) as SqlRow | undefined;
    return row ? mapRowToCartaDespacho(row) : null;
  }

  async findByLlamadaId(llamadaId: string): Promise<CartaDespacho | null> {
    const row = this.db
      .prepare('SELECT * FROM cartas_despacho WHERE llamada_id = ?')
      .get(llamadaId) as SqlRow | undefined;
    return row ? mapRowToCartaDespacho(row) : null;
  }

  async findAll(
    filtros: ListarCartasDespachoFiltros = {},
  ): Promise<CartaDespacho[]> {
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];

    if (filtros.prioridad !== undefined) {
      clauses.push('prioridad = ?');
      params.push(filtros.prioridad);
    }
    if (filtros.categoriaId !== undefined) {
      clauses.push('categoria_id = ?');
      params.push(filtros.categoriaId);
    }
    if (filtros.subcategoriaId !== undefined) {
      clauses.push('subcategoria_id = ?');
      params.push(filtros.subcategoriaId);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM cartas_despacho ${whereClause} ORDER BY derivada_en DESC, rowid DESC`;
    const rows = this.db.prepare(sql).all(...params) as SqlRow[];
    return rows.map(mapRowToCartaDespacho);
  }

  async count(): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) AS total FROM cartas_despacho')
      .get() as SqlRow | undefined;
    return Number(row?.total ?? 0);
  }
}

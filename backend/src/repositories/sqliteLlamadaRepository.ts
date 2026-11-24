import type { DatabaseSync, SQLInputValue, SQLOutputValue } from 'node:sqlite';
import {
  CartaDespacho,
  esEstadoLlamada,
  esOrigenReporte,
  esPrioridadIncidente,
  Llamada,
  type LlamadaSnapshot,
  type PrioridadIncidente,
} from '../domain/index.js';
import { DuplicateEntityError } from './errors/RepositoryError.js';
import type {
  ListarLlamadasFiltros,
  LlamadaRepository,
} from './llamadaRepository.js';
import {
  AnalisisCopilotoJsonSchema,
  ChecklistJsonSchema,
  InstruccionesPreArriboJsonSchema,
  parseJsonWithSchema,
  parseNullableJsonWithSchema,
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

function expectNullableString(row: SqlRow, column: string): string | null {
  const value = row[column];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Columna SQLite "${column}" inválida: se esperaba string | null.`);
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

function isSqliteUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toUpperCase();
  return msg.includes('UNIQUE CONSTRAINT FAILED') || msg.includes('SQLITE_CONSTRAINT_UNIQUE');
}

function mapRowToLlamada(row: SqlRow): Llamada {
  const origenRaw = expectString(row, 'origen_reporte');
  if (!esOrigenReporte(origenRaw)) {
    throw new Error(`Valor inválido en origen_reporte: "${origenRaw}".`);
  }

  const estadoRaw = expectString(row, 'estado');
  if (!esEstadoLlamada(estadoRaw)) {
    throw new Error(`Valor inválido en estado: "${estadoRaw}".`);
  }

  const prioridadRaw = expectNullableString(row, 'prioridad');
  let prioridad: PrioridadIncidente | null = null;
  if (prioridadRaw !== null) {
    if (!esPrioridadIncidente(prioridadRaw)) {
      throw new Error(`Valor inválido en prioridad: "${prioridadRaw}".`);
    }
    prioridad = prioridadRaw;
  }

  const snapshot: LlamadaSnapshot = {
    id: expectString(row, 'id'),
    origenReporte: origenRaw,
    estado: estadoRaw,
    transcripcionCruda: expectString(row, 'transcripcion_cruda'),
    categoriaId: expectNullableNumber(row, 'categoria_id'),
    subcategoriaId: expectNullableNumber(row, 'subcategoria_id'),
    descripcionIncidente: expectString(row, 'descripcion_incidente'),
    prioridad,
    ubicacion: parseJsonWithSchema(
      expectString(row, 'ubicacion_json'),
      UbicacionNormalizadaJsonSchema,
      'ubicacion_json',
    ),
    checklist: parseJsonWithSchema(
      expectString(row, 'checklist_json'),
      ChecklistJsonSchema,
      'checklist_json',
    ),
    instruccionesPreArribo: parseJsonWithSchema(
      expectString(row, 'instrucciones_prearribo_json'),
      InstruccionesPreArriboJsonSchema,
      'instrucciones_prearribo_json',
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
    ultimoAnalisis: parseNullableJsonWithSchema(
      expectNullableString(row, 'ultimo_analisis_json'),
      AnalisisCopilotoJsonSchema,
      'ultimo_analisis_json',
    ),
    camposEditadosPorOperador: parseJsonWithSchema(
      expectString(row, 'campos_editados_json'),
      StringArrayJsonSchema,
      'campos_editados_json',
    ),
    creadaEn: expectString(row, 'creada_en'),
    actualizadaEn: expectString(row, 'actualizada_en'),
  };

  return Llamada.rehidratar(snapshot);
}

const UPSERT_LLAMADA_SQL = `
INSERT INTO llamadas (
  id,
  origen_reporte,
  estado,
  transcripcion_cruda,
  categoria_id,
  subcategoria_id,
  descripcion_incidente,
  prioridad,
  ubicacion_json,
  checklist_json,
  instrucciones_prearribo_json,
  riesgos_detectados_json,
  recursos_recomendados_despacho_json,
  notas_operativas_despacho,
  ultimo_analisis_json,
  campos_editados_json,
  creada_en,
  actualizada_en
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
ON CONFLICT(id) DO UPDATE SET
  origen_reporte = excluded.origen_reporte,
  estado = excluded.estado,
  transcripcion_cruda = excluded.transcripcion_cruda,
  categoria_id = excluded.categoria_id,
  subcategoria_id = excluded.subcategoria_id,
  descripcion_incidente = excluded.descripcion_incidente,
  prioridad = excluded.prioridad,
  ubicacion_json = excluded.ubicacion_json,
  checklist_json = excluded.checklist_json,
  instrucciones_prearribo_json = excluded.instrucciones_prearribo_json,
  riesgos_detectados_json = excluded.riesgos_detectados_json,
  recursos_recomendados_despacho_json = excluded.recursos_recomendados_despacho_json,
  notas_operativas_despacho = excluded.notas_operativas_despacho,
  ultimo_analisis_json = excluded.ultimo_analisis_json,
  campos_editados_json = excluded.campos_editados_json,
  creada_en = excluded.creada_en,
  actualizada_en = excluded.actualizada_en
`;

const INSERT_CARTA_DESPACHO_SQL = `
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

export class SqliteLlamadaRepository implements LlamadaRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async save(llamada: Llamada): Promise<void> {
    const s = llamada.toSnapshot();
    this.db
      .prepare(UPSERT_LLAMADA_SQL)
      .run(
        s.id,
        s.origenReporte,
        s.estado,
        s.transcripcionCruda,
        s.categoriaId,
        s.subcategoriaId,
        s.descripcionIncidente,
        s.prioridad,
        JSON.stringify(s.ubicacion),
        JSON.stringify(s.checklist),
        JSON.stringify(s.instruccionesPreArribo),
        JSON.stringify(s.riesgosDetectados),
        JSON.stringify(s.recursosRecomendadosDespacho),
        s.notasOperativasDespacho,
        s.ultimoAnalisis ? JSON.stringify(s.ultimoAnalisis) : null,
        JSON.stringify(s.camposEditadosPorOperador),
        s.creadaEn,
        s.actualizadaEn,
      );
  }

  async findById(id: string): Promise<Llamada | null> {
    const row = this.db
      .prepare('SELECT * FROM llamadas WHERE id = ?')
      .get(id) as SqlRow | undefined;
    return row ? mapRowToLlamada(row) : null;
  }

  async findAll(filtros: ListarLlamadasFiltros = {}): Promise<Llamada[]> {
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];

    if (filtros.estado !== undefined) {
      clauses.push('estado = ?');
      params.push(filtros.estado);
    }
    if (filtros.categoriaId !== undefined) {
      clauses.push('categoria_id = ?');
      params.push(filtros.categoriaId);
    }
    if (filtros.subcategoriaId !== undefined) {
      clauses.push('subcategoria_id = ?');
      params.push(filtros.subcategoriaId);
    }
    if (filtros.prioridad !== undefined) {
      clauses.push('prioridad = ?');
      params.push(filtros.prioridad);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM llamadas ${whereClause} ORDER BY creada_en DESC, rowid DESC`;
    const rows = this.db.prepare(sql).all(...params) as SqlRow[];
    return rows.map(mapRowToLlamada);
  }

  async deleteById(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM llamadas WHERE id = ?').run(id);
    return Number(result.changes) > 0;
  }

  async count(): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) AS total FROM llamadas')
      .get() as SqlRow | undefined;
    return Number(row?.total ?? 0);
  }

  async derivarAtomicamente(
    llamada: Llamada,
    cartaDespacho: CartaDespacho,
  ): Promise<void> {
    const l = llamada.toSnapshot();
    const c = cartaDespacho.toSnapshot();

    this.db.exec('BEGIN IMMEDIATE;');
    try {
      this.db
        .prepare(UPSERT_LLAMADA_SQL)
        .run(
          l.id,
          l.origenReporte,
          l.estado,
          l.transcripcionCruda,
          l.categoriaId,
          l.subcategoriaId,
          l.descripcionIncidente,
          l.prioridad,
          JSON.stringify(l.ubicacion),
          JSON.stringify(l.checklist),
          JSON.stringify(l.instruccionesPreArribo),
          JSON.stringify(l.riesgosDetectados),
          JSON.stringify(l.recursosRecomendadosDespacho),
          l.notasOperativasDespacho,
          l.ultimoAnalisis ? JSON.stringify(l.ultimoAnalisis) : null,
          JSON.stringify(l.camposEditadosPorOperador),
          l.creadaEn,
          l.actualizadaEn,
        );

      this.db
        .prepare(INSERT_CARTA_DESPACHO_SQL)
        .run(
          c.id,
          c.llamadaId,
          c.origenReporte,
          c.categoriaId,
          c.subcategoriaId,
          c.descripcionIncidente,
          c.prioridad,
          JSON.stringify(c.ubicacion),
          JSON.stringify(c.riesgosDetectados),
          JSON.stringify(c.recursosRecomendadosDespacho),
          c.notasOperativasDespacho,
          c.derivadaEn,
        );

      this.db.exec('COMMIT;');
    } catch (error) {
      this.db.exec('ROLLBACK;');
      if (isSqliteUniqueConstraintError(error)) {
        throw new DuplicateEntityError(
          `Ya existe una CartaDespacho para la llamada "${c.llamadaId}" o id "${c.id}".`,
          { llamadaId: c.llamadaId, cartaDespachoId: c.id },
        );
      }
      throw error;
    }
  }
}

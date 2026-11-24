import type { DatabaseSync, SQLInputValue, SQLOutputValue } from 'node:sqlite';
import {
  CartaLlamada,
  esCategoriaIncidente,
  esEstadoCartaLlamada,
  esOrigenReporte,
  esPrioridadIncidente,
  type AnalisisCopilotoSnapshot,
  type CartaLlamadaSnapshot,
  type CategoriaIncidente,
  type InstruccionPreArriboSnapshot,
  type PreguntaProtocoloSnapshot,
  type PrioridadIncidente,
  type TurnoDialogoSnapshot,
  type UbicacionNormalizadaSnapshot,
} from '../domain/index.js';
import type {
  CartaLlamadaRepository,
  ListarCartasFiltros,
} from './cartaLlamadaRepository.js';

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

function parseJsonColumn<T>(row: SqlRow, column: string): T {
  const raw = expectString(row, column);
  return JSON.parse(raw) as T;
}

function parseNullableJsonColumn<T>(row: SqlRow, column: string): T | null {
  const raw = expectNullableString(row, column);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as T;
}

function mapRowToCarta(row: SqlRow): CartaLlamada {
  const origenRaw = expectString(row, 'origen_reporte');
  if (!esOrigenReporte(origenRaw)) {
    throw new Error(`Valor inválido en origen_reporte: "${origenRaw}".`);
  }

  const estadoRaw = expectString(row, 'estado');
  if (!esEstadoCartaLlamada(estadoRaw)) {
    throw new Error(`Valor inválido en estado: "${estadoRaw}".`);
  }

  const categoriaRaw = expectNullableString(row, 'categoria_validada');
  let categoriaValidada: CategoriaIncidente | null = null;
  if (categoriaRaw !== null) {
    if (!esCategoriaIncidente(categoriaRaw)) {
      throw new Error(`Valor inválido en categoria_validada: "${categoriaRaw}".`);
    }
    categoriaValidada = categoriaRaw;
  }

  const prioridadRaw = expectNullableString(row, 'prioridad_validada');
  let prioridadValidada: PrioridadIncidente | null = null;
  if (prioridadRaw !== null) {
    if (!esPrioridadIncidente(prioridadRaw)) {
      throw new Error(`Valor inválido en prioridad_validada: "${prioridadRaw}".`);
    }
    prioridadValidada = prioridadRaw;
  }

  const snapshot: CartaLlamadaSnapshot = {
    id: expectString(row, 'id'),
    origenReporte: origenRaw,
    estado: estadoRaw,
    datasetRefId: expectNullableString(row, 'dataset_ref_id'),
    transcripcionCruda: expectString(row, 'transcripcion_cruda'),
    turnos: parseJsonColumn<TurnoDialogoSnapshot[]>(row, 'turnos_json'),
    ultimoAnalisis: parseNullableJsonColumn<AnalisisCopilotoSnapshot>(
      row,
      'ultimo_analisis_json',
    ),
    ubicacionValidada: parseJsonColumn<UbicacionNormalizadaSnapshot>(
      row,
      'ubicacion_validada_json',
    ),
    categoriaValidada,
    subcategoriaValidada: expectString(row, 'subcategoria_validada'),
    prioridadValidada,
    preguntasProtocolo: parseJsonColumn<PreguntaProtocoloSnapshot[]>(
      row,
      'preguntas_protocolo_json',
    ),
    instruccionesPreArribo: parseJsonColumn<InstruccionPreArriboSnapshot[]>(
      row,
      'instrucciones_pre_arribo_json',
    ),
    riesgosValidados: parseJsonColumn<string[]>(row, 'riesgos_validados_json'),
    recursosSugeridosCad: parseJsonColumn<string[]>(row, 'recursos_sugeridos_cad_json'),
    notasOperativas: expectString(row, 'notas_operativas'),
    camposEditadosPorOperador: parseJsonColumn<string[]>(row, 'campos_editados_json'),
    creadaEn: expectString(row, 'creada_en'),
    actualizadaEn: expectString(row, 'actualizada_en'),
    derivadaEn: expectNullableString(row, 'derivada_en'),
  };

  return CartaLlamada.rehidratar(snapshot);
}

const UPSERT_SQL = `
INSERT INTO cartas_llamada (
  id,
  origen_reporte,
  estado,
  dataset_ref_id,
  transcripcion_cruda,
  turnos_json,
  ultimo_analisis_json,
  ubicacion_validada_json,
  categoria_validada,
  subcategoria_validada,
  prioridad_validada,
  preguntas_protocolo_json,
  instrucciones_pre_arribo_json,
  riesgos_validados_json,
  recursos_sugeridos_cad_json,
  notas_operativas,
  campos_editados_json,
  creada_en,
  actualizada_en,
  derivada_en
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
ON CONFLICT(id) DO UPDATE SET
  origen_reporte = excluded.origen_reporte,
  estado = excluded.estado,
  dataset_ref_id = excluded.dataset_ref_id,
  transcripcion_cruda = excluded.transcripcion_cruda,
  turnos_json = excluded.turnos_json,
  ultimo_analisis_json = excluded.ultimo_analisis_json,
  ubicacion_validada_json = excluded.ubicacion_validada_json,
  categoria_validada = excluded.categoria_validada,
  subcategoria_validada = excluded.subcategoria_validada,
  prioridad_validada = excluded.prioridad_validada,
  preguntas_protocolo_json = excluded.preguntas_protocolo_json,
  instrucciones_pre_arribo_json = excluded.instrucciones_pre_arribo_json,
  riesgos_validados_json = excluded.riesgos_validados_json,
  recursos_sugeridos_cad_json = excluded.recursos_sugeridos_cad_json,
  notas_operativas = excluded.notas_operativas,
  campos_editados_json = excluded.campos_editados_json,
  creada_en = excluded.creada_en,
  actualizada_en = excluded.actualizada_en,
  derivada_en = excluded.derivada_en
`;

/**
 * Implementación SQLite embebida del repositorio de Cartas de Llamada.
 */
export class SqliteCartaLlamadaRepository implements CartaLlamadaRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async save(carta: CartaLlamada): Promise<void> {
    const s = carta.toSnapshot();
    const stmt = this.db.prepare(UPSERT_SQL);
    stmt.run(
      s.id,
      s.origenReporte,
      s.estado,
      s.datasetRefId,
      s.transcripcionCruda,
      JSON.stringify(s.turnos),
      s.ultimoAnalisis ? JSON.stringify(s.ultimoAnalisis) : null,
      JSON.stringify(s.ubicacionValidada),
      s.categoriaValidada,
      s.subcategoriaValidada,
      s.prioridadValidada,
      JSON.stringify(s.preguntasProtocolo),
      JSON.stringify(s.instruccionesPreArribo),
      JSON.stringify(s.riesgosValidados),
      JSON.stringify(s.recursosSugeridosCad),
      s.notasOperativas,
      JSON.stringify(s.camposEditadosPorOperador),
      s.creadaEn,
      s.actualizadaEn,
      s.derivadaEn,
    );
  }

  async findById(id: string): Promise<CartaLlamada | null> {
    const stmt = this.db.prepare('SELECT * FROM cartas_llamada WHERE id = ?');
    const row = stmt.get(id) as SqlRow | undefined;
    if (!row) {
      return null;
    }
    return mapRowToCarta(row);
  }

  async findAll(filtros: ListarCartasFiltros = {}): Promise<CartaLlamada[]> {
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];

    if (filtros.estado !== undefined) {
      clauses.push('estado = ?');
      params.push(filtros.estado);
    }
    if (filtros.categoria !== undefined) {
      clauses.push('categoria_validada = ?');
      params.push(filtros.categoria);
    }
    if (filtros.prioridad !== undefined) {
      clauses.push('prioridad_validada = ?');
      params.push(filtros.prioridad);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM cartas_llamada ${whereClause} ORDER BY creada_en DESC, rowid DESC`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as SqlRow[];
    return rows.map(mapRowToCarta);
  }

  async deleteById(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM cartas_llamada WHERE id = ?');
    const result = stmt.run(id);
    return Number(result.changes) > 0;
  }

  async count(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) AS total FROM cartas_llamada');
    const row = stmt.get() as SqlRow | undefined;
    return Number(row?.total ?? 0);
  }
}

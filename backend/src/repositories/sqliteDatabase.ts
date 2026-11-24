import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cartas_llamada (
  id TEXT PRIMARY KEY,
  origen_reporte TEXT NOT NULL,
  estado TEXT NOT NULL,
  dataset_ref_id TEXT,
  transcripcion_cruda TEXT NOT NULL,
  turnos_json TEXT NOT NULL,
  ultimo_analisis_json TEXT,
  ubicacion_validada_json TEXT NOT NULL,
  categoria_validada TEXT,
  subcategoria_validada TEXT NOT NULL,
  prioridad_validada TEXT,
  preguntas_protocolo_json TEXT NOT NULL,
  instrucciones_pre_arribo_json TEXT NOT NULL,
  riesgos_validados_json TEXT NOT NULL,
  recursos_sugeridos_cad_json TEXT NOT NULL,
  notas_operativas TEXT NOT NULL,
  campos_editados_json TEXT NOT NULL,
  creada_en TEXT NOT NULL,
  actualizada_en TEXT NOT NULL,
  derivada_en TEXT
);

CREATE INDEX IF NOT EXISTS idx_cartas_llamada_estado_creada
  ON cartas_llamada (estado, creada_en DESC);

CREATE INDEX IF NOT EXISTS idx_cartas_llamada_prioridad
  ON cartas_llamada (prioridad_validada);

CREATE INDEX IF NOT EXISTS idx_cartas_llamada_categoria
  ON cartas_llamada (categoria_validada);
`;

/**
 * Abre una base SQLite embebida (en disco o `:memory:`) e inicializa el esquema híbrido.
 */
export function openSqliteDatabase(dbPath: string): DatabaseSync {
  const isMemory = dbPath === ':memory:';
  if (!isMemory) {
    const dir = path.dirname(path.resolve(dbPath));
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  if (!isMemory) {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec(SCHEMA_SQL);
  return db;
}

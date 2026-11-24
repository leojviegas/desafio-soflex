import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seedCatalogoProtocolos } from './catalogoSeed.js';

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- 1. Catálogo de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  etiqueta TEXT NOT NULL
);

-- 2. Catálogo de subcategorías operativas
CREATE TABLE IF NOT EXISTS subcategorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER NOT NULL,
  nombre TEXT NOT NULL UNIQUE,
  etiqueta TEXT NOT NULL,
  criterio TEXT NOT NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_subcategorias_categoria
  ON subcategorias (categoria_id);

-- 3. Catálogo de preguntas de protocolo (subcategoria_id NULL = universal)
CREATE TABLE IF NOT EXISTS preguntas_protocolo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subcategoria_id INTEGER,
  texto TEXT NOT NULL,
  critica INTEGER NOT NULL DEFAULT 1 CHECK (critica IN (0, 1)),
  pistas_mock_json TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_preguntas_subcategoria
  ON preguntas_protocolo (subcategoria_id);

-- 4. Catálogo de instrucciones de pre-arribo (uso determinista local, no se envía al LLM)
CREATE TABLE IF NOT EXISTS instrucciones_prearribo_protocolo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subcategoria_id INTEGER NOT NULL,
  texto TEXT NOT NULL,
  critica INTEGER NOT NULL DEFAULT 1 CHECK (critica IN (0, 1)),
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_instrucciones_subcategoria
  ON instrucciones_prearribo_protocolo (subcategoria_id);

-- 5. Sesión activa / histórica del operador de sala
CREATE TABLE IF NOT EXISTS llamadas (
  id TEXT PRIMARY KEY,
  origen_reporte TEXT NOT NULL CHECK (
    origen_reporte IN (
      'TELEFONIA_911', 'TELEFONIA_103', 'TELEFONIA_107',
      'TELEFONIA_147', 'APP_CIUDADANA', 'OTRO'
    )
  ),
  estado TEXT NOT NULL CHECK (estado IN ('EN_CURSO', 'DERIVADA', 'DESCARTADA')),
  transcripcion_cruda TEXT NOT NULL,
  categoria_id INTEGER,
  subcategoria_id INTEGER,
  descripcion_incidente TEXT NOT NULL DEFAULT '',
  prioridad TEXT CHECK (prioridad IS NULL OR prioridad IN ('P1', 'P2', 'P3', 'P4')),
  ubicacion_json TEXT NOT NULL,
  checklist_json TEXT NOT NULL DEFAULT '[]',
  instrucciones_prearribo_json TEXT NOT NULL DEFAULT '[]',
  riesgos_detectados_json TEXT NOT NULL DEFAULT '[]',
  recursos_recomendados_despacho_json TEXT NOT NULL DEFAULT '[]',
  notas_operativas_despacho TEXT NOT NULL DEFAULT '',
  ultimo_analisis_json TEXT,
  campos_editados_json TEXT NOT NULL DEFAULT '[]',
  creada_en TEXT NOT NULL,
  actualizada_en TEXT NOT NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_llamadas_estado_creada
  ON llamadas (estado, creada_en DESC);

CREATE INDEX IF NOT EXISTS idx_llamadas_subcategoria
  ON llamadas (subcategoria_id);

-- 6. Carta de Despacho formal e inmutable derivada hacia CAD (1:1 con llamadas)
CREATE TABLE IF NOT EXISTS cartas_despacho (
  id TEXT PRIMARY KEY,
  llamada_id TEXT NOT NULL UNIQUE,
  origen_reporte TEXT NOT NULL CHECK (
    origen_reporte IN (
      'TELEFONIA_911', 'TELEFONIA_103', 'TELEFONIA_107',
      'TELEFONIA_147', 'APP_CIUDADANA', 'OTRO'
    )
  ),
  categoria_id INTEGER NOT NULL,
  subcategoria_id INTEGER NOT NULL,
  descripcion_incidente TEXT NOT NULL,
  prioridad TEXT NOT NULL CHECK (prioridad IN ('P1', 'P2', 'P3', 'P4')),
  ubicacion_json TEXT NOT NULL,
  riesgos_detectados_json TEXT NOT NULL DEFAULT '[]',
  recursos_recomendados_despacho_json TEXT NOT NULL DEFAULT '[]',
  notas_operativas_despacho TEXT NOT NULL,
  derivada_en TEXT NOT NULL,
  FOREIGN KEY (llamada_id) REFERENCES llamadas(id) ON DELETE RESTRICT,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_cartas_despacho_derivada
  ON cartas_despacho (derivada_en DESC);

CREATE INDEX IF NOT EXISTS idx_cartas_despacho_prioridad
  ON cartas_despacho (prioridad);
`;

export interface OpenSqliteOptions {
  seed?: boolean;
}

/**
 * Abre una base SQLite embebida (en disco o `:memory:`), crea las 6 tablas
 * del modelo y siembra el catálogo inicial de protocolos si está vacío.
 */
export function openSqliteDatabase(
  dbPath: string,
  options: OpenSqliteOptions = {},
): DatabaseSync {
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

  if (options.seed !== false) {
    seedCatalogoProtocolos(db);
  }

  return db;
}

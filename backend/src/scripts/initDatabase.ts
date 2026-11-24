import path from 'node:path';
import { loadConfig } from '../config/index.js';
import { openSqliteDatabase } from '../repositories/sqliteDatabase.js';

interface CountRow {
  total: number;
}

const TABLAS = [
  'categorias',
  'subcategorias',
  'preguntas_protocolo',
  'instrucciones_prearribo_protocolo',
  'llamadas',
  'cartas_despacho',
] as const;

function main(): void {
  const config = loadConfig();
  const resolvedPath =
    config.databasePath === ':memory:'
      ? ':memory:'
      : path.resolve(config.databasePath);

  const db = openSqliteDatabase(config.databasePath);
  try {
    const counts: Record<string, number> = {};
    for (const tabla of TABLAS) {
      const row = db
        .prepare(`SELECT COUNT(*) AS total FROM ${tabla}`)
        .get() as CountRow | undefined;
      counts[tabla] = Number(row?.total ?? 0);
    }

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          databasePath: resolvedPath,
          tables: counts,
        },
        null,
        2,
      ),
    );
  } finally {
    db.close();
  }
}

main();

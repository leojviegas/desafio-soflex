import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  openSqliteDatabase,
  seedCatalogoProtocolos,
  SqliteProtocoloRepository,
} from '../../src/repositories/index.js';

describe('repositories/sqliteDatabase y SqliteProtocoloRepository', () => {
  it('crea las 6 tablas e índices, activa foreign_keys y siembra 7 categorías y 21 subcategorías', async () => {
    const db = openSqliteDatabase(':memory:');
    try {
      const fkRow = db.prepare('PRAGMA foreign_keys;').get() as {
        foreign_keys: number;
      };
      expect(fkRow.foreign_keys).toBe(1);

      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC",
        )
        .all() as { name: string }[];

      expect(tables.map((t) => t.name)).toEqual([
        'cartas_despacho',
        'categorias',
        'instrucciones_prearribo_protocolo',
        'llamadas',
        'preguntas_protocolo',
        'subcategorias',
      ]);

      const indexes = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name ASC",
        )
        .all() as { name: string }[];
      expect(indexes.map((i) => i.name)).toEqual([
        'idx_cartas_despacho_derivada',
        'idx_cartas_despacho_prioridad',
        'idx_instrucciones_subcategoria',
        'idx_llamadas_estado_creada',
        'idx_llamadas_subcategoria',
        'idx_preguntas_subcategoria',
        'idx_subcategorias_categoria',
      ]);

      const repo = new SqliteProtocoloRepository(db);
      expect(await repo.countCategorias()).toBe(7);
      expect(await repo.countSubcategorias()).toBe(21);

      const universales = await repo.findPreguntasUniversales();
      expect(universales).toHaveLength(2);
      expect(universales.every((p) => p.esUniversal)).toBe(true);

      const catalogo = await repo.listarCatalogoCompleto();
      expect(catalogo.preguntasUniversales).toHaveLength(2);
      expect(catalogo.categorias).toHaveLength(7);

      const subRespaldo = await repo.findSubcategoriaByNombre('general_otro');
      expect(subRespaldo).not.toBeNull();

      const subLitio = await repo.findSubcategoriaByNombre('incendio_electrico_litio');
      expect(subLitio).not.toBeNull();
      const preguntasLitio = await repo.findPreguntasParaSubcategoria(subLitio!.id);
      expect(preguntasLitio.length).toBeGreaterThanOrEqual(5);
      expect(preguntasLitio[0]?.esUniversal).toBe(true);
      expect(preguntasLitio[1]?.esUniversal).toBe(true);

      const preArriboLitio = await repo.findInstruccionesPreArribo(subLitio!.id);
      expect(preArriboLitio.length).toBeGreaterThanOrEqual(2);
      expect(preArriboLitio[0]?.texto.toUpperCase()).toContain('PROHIBIDO ARROJAR AGUA');

      const resumenPrompt = await repo.obtenerResumenParaPrompt();
      expect(resumenPrompt.preguntasUniversales).toHaveLength(2);
      expect(resumenPrompt.categorias).toHaveLength(7);
      const serializedPrompt = JSON.stringify(resumenPrompt);
      expect(serializedPrompt).not.toContain('PROHIBIDO arrojar agua');
    } finally {
      db.close();
    }
  });

  it('mantiene idempotencia del seed al reabrir una base en disco', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soflex-seed-'));
    const dbPath = path.join(tempDir, 'catalogo.db');

    try {
      const db1 = openSqliteDatabase(dbPath);
      const reseed = seedCatalogoProtocolos(db1);
      expect(reseed.seeded).toBe(false);
      expect(reseed.categorias).toBe(7);
      expect(reseed.subcategorias).toBe(21);
      db1.close();

      const db2 = openSqliteDatabase(dbPath);
      const repo2 = new SqliteProtocoloRepository(db2);
      expect(await repo2.countCategorias()).toBe(7);
      expect(await repo2.countSubcategorias()).toBe(21);
      db2.close();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('aplica restricciones CHECK y FOREIGN KEY en SQLite', () => {
    const db = openSqliteDatabase(':memory:');
    try {
      expect(() =>
        db
          .prepare(
            `INSERT INTO llamadas (
              id, origen_reporte, estado, transcripcion_cruda, ubicacion_json, creada_en, actualizada_en
            ) VALUES ('l1', 'ORIGEN_INVALIDO', 'EN_CURSO', 'hola', '{}', '2026-01-01', '2026-01-01')`,
          )
          .run(),
      ).toThrow();

      expect(() =>
        db
          .prepare(
            `INSERT INTO llamadas (
              id, origen_reporte, estado, transcripcion_cruda, categoria_id, ubicacion_json, creada_en, actualizada_en
            ) VALUES ('l2', 'TELEFONIA_911', 'EN_CURSO', 'hola', 99999, '{}', '2026-01-01', '2026-01-01')`,
          )
          .run(),
      ).toThrow();
    } finally {
      db.close();
    }
  });
});

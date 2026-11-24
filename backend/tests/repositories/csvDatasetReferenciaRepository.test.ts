import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { OrigenReporte, PrioridadIncidente } from '../../src/domain/index.js';
import {
  CsvDatasetReferenciaRepository,
  openSqliteDatabase,
  SqliteProtocoloRepository,
} from '../../src/repositories/index.js';

const DATASET_PATH = path.resolve(
  import.meta.dirname,
  '../../../docs/dataset_challenge_soflex.csv',
);

describe('repositories/CsvDatasetReferenciaRepository', () => {
  it('carga los 30 registros reales del dataset y mapea subcategoria -> descripcionIncidente', () => {
    const repo = CsvDatasetReferenciaRepository.fromFile(DATASET_PATH);

    expect(repo.count()).toBe(30);

    const primero = repo.findById('SFX-REC-2026-001');
    expect(primero).not.toBeNull();
    expect(primero?.origenReporte).toBe(OrigenReporte.TELEFONIA_911);
    expect(primero?.categoria).toBe('INCENDIO_RESCATE');
    expect(primero?.descripcionIncidente).toBe('Incendio en Comercio Gastronómico');
    expect(primero?.prioridadSugerida).toBe(PrioridadIncidente.P1);
    expect(primero?.calleDetectada).toBe('Av. Corrientes');
    expect(primero?.alturaDetectada).toBe('1540');
    expect(primero?.preguntasProtocoloMandatorias).toHaveLength(3);
    expect(primero?.recursosRecomendadosDespacho).toHaveLength(3);
    expect(primero?.transcripcionCruda).toContain('Operador: 911 emergencias');
    expect(primero?.transcripcionCruda).toContain('adentro quedó el cocinero!');

    const subte = repo.findById('SFX-REC-2026-008');
    expect(subte?.origenReporte).toBe(OrigenReporte.TELEFONIA_107);
    expect(subte?.categoria).toBe('EMERGENCIA_MEDICA');

    const convulsion = repo.findById('SFX-REC-2026-026');
    expect(convulsion?.instruccionesPrearribo).toContain('NUNCA introduzca dedos');

    const ultimo = repo.findById('SFX-REC-2026-030');
    expect(ultimo?.barrioComuna).toBe('San Cristóbal (Comuna 3)');
    expect(ultimo?.riesgosDetectados.length).toBeGreaterThanOrEqual(2);
  });

  it('todas las categorías del CSV existen en el catálogo seedeado de SQLite', async () => {
    const csvRepo = CsvDatasetReferenciaRepository.fromFile(DATASET_PATH);
    const db = openSqliteDatabase(':memory:');
    try {
      const protoRepo = new SqliteProtocoloRepository(db);
      const categoriasDb = new Set(
        (await protoRepo.listarCategorias()).map((c) => c.nombre),
      );

      const categoriasCsv = new Set(csvRepo.findAll().map((r) => r.categoria));
      expect(categoriasCsv.size).toBe(6);
      for (const cat of categoriasCsv) {
        expect(categoriasDb.has(cat)).toBe(true);
      }
    } finally {
      db.close();
    }
  });

  it('falla de forma descriptiva si el CSV tiene encabezados inválidos o filas malformadas', () => {
    expect(() =>
      CsvDatasetReferenciaRepository.fromCsvContent('solo,dos\n1,2'),
    ).toThrow(/Cantidad de columnas inválida/);
  });
});

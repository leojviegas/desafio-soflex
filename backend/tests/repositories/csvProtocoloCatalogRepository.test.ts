import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CategoriaIncidente, OrigenReporte, PrioridadIncidente } from '../../src/domain/index.js';
import { CsvProtocoloCatalogRepository } from '../../src/repositories/index.js';

const DATASET_PATH = path.resolve(
  import.meta.dirname,
  '../../../docs/dataset_challenge_soflex.csv',
);

describe('repositories/CsvProtocoloCatalogRepository', () => {
  it('carga los 30 registros reales del dataset sin espacios residuales ni columnas rotas', () => {
    const repo = CsvProtocoloCatalogRepository.fromFile(DATASET_PATH);

    expect(repo.count()).toBe(30);

    const primero = repo.findById('SFX-REC-2026-001');
    expect(primero).not.toBeNull();
    expect(primero?.origenReporte).toBe(OrigenReporte.TELEFONIA_911);
    expect(primero?.categoria).toBe(CategoriaIncidente.INCENDIO_RESCATE);
    expect(primero?.prioridadSugerida).toBe(PrioridadIncidente.P1);
    expect(primero?.calleDetectada).toBe('Av. Corrientes');
    expect(primero?.alturaDetectada).toBe('1540');
    expect(primero?.preguntasProtocoloMandatorias).toHaveLength(3);
    expect(primero?.recursosRecomendadosDespacho).toHaveLength(3);
    expect(primero?.transcripcionCruda).toContain('Operador: 911 emergencias');
    expect(primero?.transcripcionCruda).toContain('adentro quedó el cocinero!');

    const subte = repo.findById('SFX-REC-2026-008');
    expect(subte?.origenReporte).toBe(OrigenReporte.TELEFONIA_107);
    expect(subte?.categoria).toBe(CategoriaIncidente.EMERGENCIA_MEDICA);

    const convulsion = repo.findById('SFX-REC-2026-026');
    expect(convulsion?.instruccionesPrearribo).toContain('NUNCA introduzca dedos');

    const ultimo = repo.findById('SFX-REC-2026-030');
    expect(ultimo?.barrioComuna).toBe('San Cristóbal (Comuna 3)');
    expect(ultimo?.riesgosDetectados.length).toBeGreaterThanOrEqual(2);
  });

  it('agrupa protocolos por las 6 categorías del dataset y deduplica elementos', () => {
    const repo = CsvProtocoloCatalogRepository.fromFile(DATASET_PATH);
    const porCategoria = repo.getProtocolosPorCategoria();

    expect(porCategoria).toHaveLength(6);

    const incendios = repo.findByCategoria(CategoriaIncidente.INCENDIO_RESCATE);
    expect(incendios.length).toBeGreaterThanOrEqual(5);

    const resumenIncendio = porCategoria.find(
      (p) => p.categoria === CategoriaIncidente.INCENDIO_RESCATE,
    );
    expect(resumenIncendio?.cantidadCasos).toBe(incendios.length);
    expect(new Set(resumenIncendio?.preguntasMandatorias).size).toBe(
      resumenIncendio?.preguntasMandatorias.length,
    );
  });

  it('falla de forma descriptiva si el CSV tiene encabezados inválidos o filas malformadas', () => {
    expect(() => CsvProtocoloCatalogRepository.fromCsvContent('solo,dos\n1,2')).toThrow(
      /Cantidad de columnas inválida/,
    );
  });
});

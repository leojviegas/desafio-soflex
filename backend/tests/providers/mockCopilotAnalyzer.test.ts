import { describe, expect, it } from 'vitest';
import { resolveDatasetCsvPath } from '../../src/config/env.js';
import {
  EstadoPreguntaIA,
  OrigenReporte,
  PrioridadIncidente,
  ProveedorIA,
} from '../../src/domain/index.js';
import { MockCopilotAnalyzer } from '../../src/providers/ai/index.js';
import {
  CsvDatasetReferenciaRepository,
  openSqliteDatabase,
  seedCatalogoProtocolos,
  SqliteProtocoloRepository,
} from '../../src/repositories/index.js';

describe('providers/ai/MockCopilotAnalyzer', () => {
  it('procesa los 30 casos reales del CSV sin alucinar ubicaciones ausentes y verificando cada cita', async () => {
    const db = openSqliteDatabase(':memory:');
    seedCatalogoProtocolos(db);
    const protocoloRepo = new SqliteProtocoloRepository(db);
    const datasetRepo = CsvDatasetReferenciaRepository.fromFile(
      resolveDatasetCsvPath(),
    );
    const analyzer = new MockCopilotAnalyzer(protocoloRepo);

    const casos = datasetRepo.findAll();
    expect(casos).toHaveLength(30);

    for (const caso of casos) {
      const analisis = await analyzer.analyze({
        transcripcionCruda: caso.transcripcionCruda,
        origenReporte: caso.origenReporte,
      });

      expect(analisis.proveedorUsado).toBe(ProveedorIA.MOCK);
      expect(analisis.degradado).toBe(false);
      expect(analisis.instruccionesPreArribo.length).toBeGreaterThan(0);
      expect(analisis.checklist.length).toBeGreaterThan(2);

      for (const item of analisis.checklist) {
        if (item.estadoIA !== EstadoPreguntaIA.PENDIENTE) {
          expect(item.evidenciaVerificada).toBe(true);
          expect(item.citaEvidencia).not.toBeNull();
        }
      }
    }

    // Caso 1: "San Nicolás" y "Paraná" NO están en la transcripción cruda -> deben quedar null
    const caso1 = datasetRepo.findById('SFX-REC-2026-001')!;
    const analisis1 = await analyzer.analyze({
      transcripcionCruda: caso1.transcripcionCruda,
      origenReporte: caso1.origenReporte,
    });
    expect(analisis1.prioridadSugerida).toBe(PrioridadIncidente.P1);
    expect(analisis1.ubicacion.calle).toBe('Av. Corrientes');
    expect(analisis1.ubicacion.altura).toBe('1540');
    expect(analisis1.ubicacion.interseccion).toContain('Montevideo');
    expect(analisis1.ubicacion.barrioComuna).toBeNull();
    expect(analisis1.ubicacion.camposFaltantes).toContain('barrioComuna');

    db.close();
  });

  it('clasifica consultas administrativas libres en general_otro con prioridad P4 y respeta overrides/simulación', async () => {
    const db = openSqliteDatabase(':memory:');
    seedCatalogoProtocolos(db);
    const protocoloRepo = new SqliteProtocoloRepository(db);
    const analyzer = new MockCopilotAnalyzer(protocoloRepo);

    const consultaP4 = await analyzer.analyze({
      transcripcionCruda:
        'Operador: 147 Atención Ciudadana. Llamante: Hola, llamo por una consulta administrativa sobre horarios de trámite de licencias, sin urgencia ni peligro.',
      origenReporte: OrigenReporte.TELEFONIA_147,
    });
    const subGeneral =
      await protocoloRepo.findSubcategoriaByNombre('general_otro');
    expect(consultaP4.subcategoriaId).toBe(subGeneral!.id);
    expect(consultaP4.prioridadSugerida).toBe(PrioridadIncidente.P4);
    expect(consultaP4.ubicacion.camposFaltantes).toEqual([
      'calle',
      'altura',
      'interseccion',
      'barrioComuna',
    ]);

    // No debe confundir palabras dichas solo por el Operador como si fueran respuesta del Llamante
    const soloOperador = await analyzer.analyze({
      transcripcionCruda:
        'Operador: 911, ¿hay personas atrapadas o garrafa de gas?\nLlamante: Hay humo en el pasillo.',
    });
    const preguntasConEvidencia = soloOperador.checklist.filter(
      (i) => i.estadoIA !== EstadoPreguntaIA.PENDIENTE,
    );
    for (const item of preguntasConEvidencia) {
      expect(item.citaEvidencia?.toLowerCase()).not.toContain('garrafa');
    }

    // Respeta subcategoriaIdFijadaPorOperador y simularDegradado
    const subFugaGas =
      await protocoloRepo.findSubcategoriaByNombre('dc_fuga_gas');
    const analisisFijado = await analyzer.analyze({
      transcripcionCruda: 'Llamante: Olor fuerte en Thames 1900.',
      subcategoriaIdFijadaPorOperador: subFugaGas!.id,
      simularDegradado: true,
    });
    expect(analisisFijado.subcategoriaId).toBe(subFugaGas!.id);
    expect(analisisFijado.degradado).toBe(true);
    expect(analisisFijado.motivoDegradacion).not.toBeNull();

    db.close();
  });
});

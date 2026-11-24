import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AnalisisCopiloto,
  CartaLlamada,
  CategoriaIncidente,
  EstadoCartaLlamada,
  EstadoPreguntaProtocolo,
  HablanteTurno,
  InstruccionPreArribo,
  NivelCerteza,
  OrigenReporte,
  PreguntaProtocolo,
  PrioridadIncidente,
  ProveedorIA,
  UbicacionNormalizada,
} from '../../src/domain/index.js';
import {
  SqliteCartaLlamadaRepository,
  openSqliteDatabase,
} from '../../src/repositories/index.js';

function crearCartaCompleta(
  id: string,
  calle: string,
  prioridad: PrioridadIncidente,
): CartaLlamada {
  const carta = CartaLlamada.crear({
    id,
    origenReporte: OrigenReporte.TELEFONIA_911,
    transcripcionCruda: `Llamante: Emergencia en ${calle} al 1200.`,
    datasetRefId: 'SFX-REC-2026-001',
    ahora: '2026-10-15T10:00:00.000Z',
  });

  carta.aplicarAnalisis(
    new AnalisisCopiloto({
      ubicacion: new UbicacionNormalizada({
        calle,
        altura: '1200',
        barrioComuna: 'Palermo (Comuna 14)',
      }),
      categoria: CategoriaIncidente.ACCIDENTE_VIAL,
      subcategoria: 'Colisión',
      prioridadSugerida: prioridad,
      riesgosDetectados: ['Tránsito rápido'],
      preguntasProtocolo: [
        new PreguntaProtocolo({
          id: 'p1',
          texto: '¿El conductor responde?',
          obligatoria: true,
          estado: EstadoPreguntaProtocolo.PENDIENTE,
        }),
      ],
      instruccionesPreArribo: [
        new InstruccionPreArribo({
          id: 'i1',
          texto: 'Balizar la zona.',
          critica: true,
          transmitida: true,
        }),
      ],
      recursosRecomendadosCad: ['1x Ambulancia SAME'],
      notasOperativasSugeridas: `Incidente vial en ${calle} 1200.`,
      confianzaGlobal: NivelCerteza.ALTA,
      evidencias: [`${calle} al 1200`],
      proveedorUsado: ProveedorIA.MOCK,
      modeloUsado: 'deterministic-rules-v1',
      latenciaMs: 3,
      degradado: false,
      motivoDegradacion: null,
    }),
    '2026-10-15T10:01:00.000Z',
  );

  return carta;
}

describe('repositories/SqliteCartaLlamadaRepository', () => {
  it('persiste, actualiza, filtra y elimina cartas en SQLite :memory:', async () => {
    const db = openSqliteDatabase(':memory:');
    try {
      const repo = new SqliteCartaLlamadaRepository(db);

      const carta1 = crearCartaCompleta('carta-1', 'Av. Santa Fe', PrioridadIncidente.P1);
      const carta2 = crearCartaCompleta('carta-2', 'Av. Cabildo', PrioridadIncidente.P3);
      carta2.derivar('Derivada desde test', '2026-10-15T10:05:00.000Z');

      await repo.save(carta1);
      await repo.save(carta2);

      expect(await repo.count()).toBe(2);

      const recuperada = await repo.findById('carta-1');
      expect(recuperada).not.toBeNull();
      expect(recuperada?.toSnapshot().ultimoAnalisis?.evidencias).toEqual([
        'Av. Santa Fe al 1200',
      ]);

      carta1.agregarTurno({
        hablante: HablanteTurno.OPERADOR,
        texto: '¿Hay heridos?',
        timestamp: '2026-10-15T10:02:00.000Z',
      });
      await repo.save(carta1);

      const actualizada = await repo.findById('carta-1');
      expect(actualizada?.turnos).toHaveLength(2);

      const derivadas = await repo.findAll({ estado: EstadoCartaLlamada.DERIVADA });
      expect(derivadas).toHaveLength(1);
      expect(derivadas[0]?.id).toBe('carta-2');

      const prioridadP1 = await repo.findAll({ prioridad: PrioridadIncidente.P1 });
      expect(prioridadP1).toHaveLength(1);
      expect(prioridadP1[0]?.id).toBe('carta-1');

      expect(await repo.deleteById('carta-1')).toBe(true);
      expect(await repo.findById('carta-1')).toBeNull();
      expect(await repo.count()).toBe(1);
    } finally {
      db.close();
    }
  });

  it('conserva cartas derivadas tras cerrar y reabrir archivo .db en disco', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soflex-sqlite-'));
    const dbPath = path.join(tempDir, 'copilot.db');

    try {
      const db1 = openSqliteDatabase(dbPath);
      const repo1 = new SqliteCartaLlamadaRepository(db1);
      const carta = crearCartaCompleta('carta-persistida', 'Thames', PrioridadIncidente.P1);
      carta.derivar('Fuga de gas confirmada', '2026-10-15T12:00:00.000Z');
      await repo1.save(carta);
      db1.close();

      const db2 = openSqliteDatabase(dbPath);
      const repo2 = new SqliteCartaLlamadaRepository(db2);
      const recuperada = await repo2.findById('carta-persistida');
      expect(recuperada).not.toBeNull();
      expect(recuperada?.estado).toBe(EstadoCartaLlamada.DERIVADA);
      expect(recuperada?.derivadaEn).toBe('2026-10-15T12:00:00.000Z');
      db2.close();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

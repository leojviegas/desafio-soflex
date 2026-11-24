import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AnalisisCopiloto,
  EstadoLlamada,
  EstadoPreguntaIA,
  HablanteTurno,
  ItemChecklistLlamada,
  ItemInstruccionPreArribo,
  Llamada,
  NivelCerteza,
  OrigenReporte,
  PrioridadIncidente,
  ProveedorIA,
  UbicacionNormalizada,
} from '../../src/domain/index.js';
import {
  DuplicateEntityError,
  openSqliteDatabase,
  RepositoryError,
  SqliteCartaDespachoRepository,
  SqliteLlamadaRepository,
} from '../../src/repositories/index.js';

function crearLlamadaCompleta(
  id: string,
  calle: string,
  prioridad: PrioridadIncidente,
): Llamada {
  const llamada = Llamada.crear({
    id,
    origenReporte: OrigenReporte.TELEFONIA_911,
    transcripcionCruda: `Llamante: Emergencia en ${calle} al 1200.`,
    ahora: '2026-10-15T10:00:00.000Z',
  });

  llamada.aplicarAnalisis(
    new AnalisisCopiloto({
      categoriaId: 2,
      subcategoriaId: 6,
      descripcionIncidente: 'Colisión en vía pública',
      ubicacion: new UbicacionNormalizada({
        calle,
        altura: '1200',
        barrioComuna: 'Palermo (Comuna 14)',
      }),
      prioridadSugerida: prioridad,
      checklist: [
        new ItemChecklistLlamada({
          preguntaId: 1,
          texto: '¿Cuál es la dirección exacta, altura o intersección del incidente?',
          critica: true,
          esUniversal: true,
          estadoIA: EstadoPreguntaIA.RESPONDIDA,
          respuestaIA: `${calle} al 1200`,
          citaEvidencia: `${calle} al 1200`,
          evidenciaVerificada: true,
        }),
      ],
      instruccionesPreArribo: [
        new ItemInstruccionPreArribo({
          instruccionId: 1,
          texto: 'Señalizar la zona para evitar otro choque.',
          critica: true,
          transmitida: true,
        }),
      ],
      riesgosDetectados: ['Tránsito rápido'],
      recursosRecomendadosDespacho: ['1x Ambulancia SAME'],
      notasOperativasDespacho: `Incidente vial en ${calle} 1200.`,
      confianzaGlobal: NivelCerteza.ALTA,
      proveedorUsado: ProveedorIA.MOCK,
      modeloUsado: 'deterministic-rules-v1',
      latenciaMs: 3,
      degradado: false,
      motivoDegradacion: null,
    }),
    '2026-10-15T10:01:00.000Z',
  );

  return llamada;
}

describe('repositories/SqliteLlamadaRepository y SqliteCartaDespachoRepository', () => {
  it('persiste, actualiza, filtra, deriva atómicamente y elimina llamadas en SQLite :memory:', async () => {
    const db = openSqliteDatabase(':memory:');
    try {
      const llamadaRepo = new SqliteLlamadaRepository(db);
      const despachoRepo = new SqliteCartaDespachoRepository(db);

      const llamada1 = crearLlamadaCompleta(
        'llamada-1',
        'Av. Santa Fe',
        PrioridadIncidente.P1,
      );
      const llamada2 = crearLlamadaCompleta(
        'llamada-2',
        'Av. Cabildo',
        PrioridadIncidente.P3,
      );

      await llamadaRepo.save(llamada1);
      await llamadaRepo.save(llamada2);
      expect(await llamadaRepo.count()).toBe(2);

      const recuperada = await llamadaRepo.findById('llamada-1');
      expect(recuperada).not.toBeNull();
      expect(recuperada?.ultimoAnalisis?.descripcionIncidente).toBe(
        'Colisión en vía pública',
      );

      llamada1.agregarTurno({
        hablante: HablanteTurno.OPERADOR,
        texto: '¿Hay heridos?',
        ahora: '2026-10-15T10:02:00.000Z',
      });
      await llamadaRepo.save(llamada1);

      const actualizada = await llamadaRepo.findById('llamada-1');
      expect(actualizada?.obtenerTurnos()).toHaveLength(2);

      const carta2 = llamada2.derivar({
        cartaDespachoId: 'despacho-2',
        notasOperativasDespacho: 'Derivada desde test',
        ahora: '2026-10-15T10:05:00.000Z',
      });
      await llamadaRepo.derivarAtomicamente(llamada2, carta2);

      expect(await despachoRepo.count()).toBe(1);
      const despachoRecuperado = await despachoRepo.findByLlamadaId('llamada-2');
      expect(despachoRecuperado?.id).toBe('despacho-2');
      expect(despachoRecuperado?.notasOperativasDespacho).toBe(
        'Derivada desde test',
      );

      // Verifica que cartas_despacho no almacena transcripcion_cruda
      const columnasDespacho = db
        .prepare('PRAGMA table_info(cartas_despacho);')
        .all() as { name: string }[];
      expect(columnasDespacho.map((c) => c.name)).not.toContain(
        'transcripcion_cruda',
      );

      // No permite duplicar carta de despacho para la misma llamada
      await expect(despachoRepo.create(carta2)).rejects.toThrow(
        DuplicateEntityError,
      );

      const derivadas = await llamadaRepo.findAll({
        estado: EstadoLlamada.DERIVADA,
      });
      expect(derivadas).toHaveLength(1);
      expect(derivadas[0]?.id).toBe('llamada-2');

      const prioridadP1 = await llamadaRepo.findAll({
        prioridad: PrioridadIncidente.P1,
      });
      expect(prioridadP1).toHaveLength(1);
      expect(prioridadP1[0]?.id).toBe('llamada-1');

      expect(await llamadaRepo.deleteById('llamada-1')).toBe(true);
      expect(await llamadaRepo.findById('llamada-1')).toBeNull();
      expect(await llamadaRepo.count()).toBe(1);
    } finally {
      db.close();
    }
  });

  it('rechaza columnas _json corruptas mediante validación Zod', async () => {
    const db = openSqliteDatabase(':memory:');
    try {
      const llamadaRepo = new SqliteLlamadaRepository(db);
      db.prepare(
        `INSERT INTO llamadas (
          id, origen_reporte, estado, transcripcion_cruda, ubicacion_json, creada_en, actualizada_en
        ) VALUES ('corrupta', 'TELEFONIA_911', 'EN_CURSO', 'hola', '{"calle": 123}', '2026-01-01', '2026-01-01')`,
      ).run();

      await expect(llamadaRepo.findById('corrupta')).rejects.toThrow(
        RepositoryError,
      );
    } finally {
      db.close();
    }
  });

  it('conserva llamadas y cartas derivadas tras cerrar y reabrir archivo .db en disco', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soflex-sqlite-'));
    const dbPath = path.join(tempDir, 'copilot.db');

    try {
      const db1 = openSqliteDatabase(dbPath);
      const llamadaRepo1 = new SqliteLlamadaRepository(db1);
      const llamada = crearLlamadaCompleta(
        'llamada-persistida',
        'Thames',
        PrioridadIncidente.P1,
      );
      const carta = llamada.derivar({
        cartaDespachoId: 'despacho-persistido',
        notasOperativasDespacho: 'Fuga de gas confirmada',
        ahora: '2026-10-15T12:00:00.000Z',
      });
      await llamadaRepo1.derivarAtomicamente(llamada, carta);
      db1.close();

      const db2 = openSqliteDatabase(dbPath);
      const llamadaRepo2 = new SqliteLlamadaRepository(db2);
      const despachoRepo2 = new SqliteCartaDespachoRepository(db2);

      const recuperada = await llamadaRepo2.findById('llamada-persistida');
      expect(recuperada).not.toBeNull();
      expect(recuperada?.estado).toBe(EstadoLlamada.DERIVADA);

      const despacho = await despachoRepo2.findById('despacho-persistido');
      expect(despacho).not.toBeNull();
      expect(despacho?.derivadaEn).toBe('2026-10-15T12:00:00.000Z');
      db2.close();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

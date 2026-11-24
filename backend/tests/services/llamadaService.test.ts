import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EstadoLlamada,
  EstadoPreguntaOperador,
  HablanteTurno,
  InvalidStateTransitionError,
  OrigenReporte,
  PrioridadIncidente,
} from '../../src/domain/index.js';
import { MockCopilotAnalyzer } from '../../src/providers/ai/index.js';
import {
  openSqliteDatabase,
  SqliteCartaDespachoRepository,
  SqliteLlamadaRepository,
  SqliteProtocoloRepository,
} from '../../src/repositories/index.js';
import {
  BusinessRuleError,
  LlamadaService,
  NotFoundError,
} from '../../src/services/index.js';

describe('LlamadaService', () => {
  let db: DatabaseSync;
  let service: LlamadaService;
  let protocoloRepo: SqliteProtocoloRepository;
  let cartaRepo: SqliteCartaDespachoRepository;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    protocoloRepo = new SqliteProtocoloRepository(db);
    const llamadaRepo = new SqliteLlamadaRepository(db);
    cartaRepo = new SqliteCartaDespachoRepository(db);
    const copilotAnalyzer = new MockCopilotAnalyzer(protocoloRepo);

    service = new LlamadaService({
      llamadaRepository: llamadaRepo,
      cartaDespachoRepository: cartaRepo,
      protocoloRepository: protocoloRepo,
      copilotAnalyzer,
    });
  });

  afterEach(() => {
    db.close();
  });

  it('crea llamada sin análisis y luego con analizarAhora=true usando MockCopilotAnalyzer', async () => {
    const sinAnalisis = await service.crearLlamada({
      origenReporte: OrigenReporte.TELEFONIA_911,
      transcripcionCruda: 'Llamante: Hay un incidente en la esquina.',
      analizarAhora: false,
    });

    expect(sinAnalisis.estado).toBe(EstadoLlamada.EN_CURSO);
    expect(sinAnalisis.ultimoAnalisis).toBeNull();
    expect(sinAnalisis.checklist).toEqual([]);
    expect(sinAnalisis.cartaDespacho).toBeNull();
    expect(sinAnalisis.turnos.length).toBeGreaterThan(0);

    const conAnalisis = await service.crearLlamada({
      origenReporte: OrigenReporte.TELEFONIA_911,
      transcripcionCruda:
        'Operador: 911 emergencias.\nLlamante: Se incendia la cocina de la pizzería en Av. Corrientes 1540, hay humo negro y un empleado atrapado.',
      analizarAhora: true,
    });

    expect(conAnalisis.ultimoAnalisis).not.toBeNull();
    expect(conAnalisis.categoriaId).not.toBeNull();
    expect(conAnalisis.subcategoriaId).not.toBeNull();
    expect(conAnalisis.prioridad).toBe(PrioridadIncidente.P1);
    expect(conAnalisis.ubicacion.calle).toContain('Corrientes');
    expect(conAnalisis.ubicacion.altura).toBe('1540');
    expect(conAnalisis.checklist.length).toBeGreaterThan(2);
    expect(conAnalisis.instruccionesPreArribo.length).toBeGreaterThan(0);
  });

  it('protege los overrides humanos ante agregarTurno con reanalizar=true', async () => {
    const creada = await service.crearLlamada({
      origenReporte: OrigenReporte.TELEFONIA_911,
      transcripcionCruda:
        'Operador: 911.\nLlamante: Hay humo en una pizzería sobre Corrientes.',
      analizarAhora: true,
    });

    const preguntaUniversal = creada.checklist.find((p) => p.esUniversal);
    const instruccionPreArribo = creada.instruccionesPreArribo[0];
    expect(preguntaUniversal).toBeDefined();
    expect(instruccionPreArribo).toBeDefined();

    const editada = await service.actualizarPorOperador(creada.id, {
      prioridad: PrioridadIncidente.P2,
      ubicacion: { calle: 'Av. Corrientes Editada' },
      notasOperativasDespacho: 'Nota validada por operador de sala.',
      checklist: [
        {
          preguntaId: preguntaUniversal!.preguntaId,
          estadoOperador: EstadoPreguntaOperador.CONFIRMADA,
          notaOperador: 'Confirmado por el llamante',
        },
      ],
      instruccionesPreArribo: [
        {
          instruccionId: instruccionPreArribo!.instruccionId,
          transmitida: true,
        },
      ],
    });

    expect(editada.camposEditadosPorOperador).toContain('prioridad');
    expect(editada.camposEditadosPorOperador).toContain('ubicacion.calle');
    expect(editada.camposEditadosPorOperador).toContain('notasOperativasDespacho');

    const reanalizada = await service.agregarTurno(creada.id, {
      hablante: HablanteTurno.LLAMANTE,
      texto: 'Estamos al 1540, hay llamas y gente atrapada adentro.',
      reanalizar: true,
    });

    expect(reanalizada.prioridad).toBe(PrioridadIncidente.P2);
    expect(reanalizada.ubicacion.calle).toBe('Av. Corrientes Editada');
    expect(reanalizada.ubicacion.altura).toBe('1540');
    expect(reanalizada.notasOperativasDespacho).toBe(
      'Nota validada por operador de sala.',
    );

    const universalTrasReanalisis = reanalizada.checklist.find(
      (p) => p.preguntaId === preguntaUniversal!.preguntaId,
    );
    expect(universalTrasReanalisis?.estadoOperador).toBe(
      EstadoPreguntaOperador.CONFIRMADA,
    );
    expect(universalTrasReanalisis?.notaOperador).toBe(
      'Confirmado por el llamante',
    );

    const instruccionTrasReanalisis = reanalizada.instruccionesPreArribo.find(
      (i) => i.instruccionId === instruccionPreArribo!.instruccionId,
    );
    expect(instruccionTrasReanalisis?.transmitida).toBe(true);
  });

  it('recarga checklist y pre-arribo al cambiar subcategoriaId manualmente conservando universales confirmadas', async () => {
    const creada = await service.crearLlamada({
      origenReporte: OrigenReporte.TELEFONIA_911,
      transcripcionCruda:
        'Llamante: Hay fuego en un local de Av. Rivadavia 2200.',
      analizarAhora: true,
    });

    const universal = creada.checklist.find((p) => p.esUniversal)!;
    await service.actualizarPorOperador(creada.id, {
      checklist: [
        {
          preguntaId: universal.preguntaId,
          estadoOperador: EstadoPreguntaOperador.CONFIRMADA,
          notaOperador: 'Dirección verificada',
        },
      ],
    });

    const subFugaGas = await protocoloRepo.findSubcategoriaByNombre('dc_fuga_gas');
    expect(subFugaGas).not.toBeNull();

    const cambiada = await service.actualizarPorOperador(creada.id, {
      subcategoriaId: subFugaGas!.id,
    });

    expect(cambiada.subcategoriaId).toBe(subFugaGas!.id);
    expect(cambiada.categoriaId).toBe(subFugaGas!.categoriaId);
    expect(cambiada.camposEditadosPorOperador).toContain('subcategoriaId');
    expect(cambiada.camposEditadosPorOperador).toContain('categoriaId');

    const universalConservada = cambiada.checklist.find(
      (p) => p.preguntaId === universal.preguntaId,
    );
    expect(universalConservada?.estadoOperador).toBe(
      EstadoPreguntaOperador.CONFIRMADA,
    );
    expect(universalConservada?.notaOperador).toBe('Dirección verificada');

    // Un re-análisis posterior mantiene fijada la subcategoría elegida por el operador
    const reanalizada = await service.analizarLlamada(creada.id);
    expect(reanalizada.subcategoriaId).toBe(subFugaGas!.id);
  });

  it('deriva atómicamente a CartaDespacho y bloquea mutaciones posteriores', async () => {
    const creada = await service.crearLlamada({
      origenReporte: OrigenReporte.TELEFONIA_103,
      transcripcionCruda:
        'Llamante: Se rompió un caño de gas en Av. Santa Fe 3100, Palermo, se escucha un soplido fuerte.',
      analizarAhora: true,
    });

    const resultado = await service.derivarLlamada(creada.id, {
      notasOperativasDespacho: 'Fuga activa en vía pública, perímetro requerido.',
    });

    expect(resultado.llamada.estado).toBe(EstadoLlamada.DERIVADA);
    expect(resultado.llamada.cartaDespacho?.id).toBe(resultado.cartaDespacho.id);
    expect('transcripcionCruda' in resultado.cartaDespacho).toBe(false);

    const persistida = await cartaRepo.findById(resultado.cartaDespacho.id);
    expect(persistida).not.toBeNull();

    await expect(
      service.actualizarPorOperador(creada.id, {
        prioridad: PrioridadIncidente.P3,
      }),
    ).rejects.toThrow(InvalidStateTransitionError);

    await expect(service.descartarLlamada(creada.id)).rejects.toThrow(
      InvalidStateTransitionError,
    );
  });

  it('lanza NotFoundError o BusinessRuleError ante ids inexistentes', async () => {
    await expect(service.obtenerLlamadaPorId('no-existe')).rejects.toThrow(
      NotFoundError,
    );

    const creada = await service.crearLlamada({
      origenReporte: OrigenReporte.OTRO,
      transcripcionCruda: 'Llamante: Consulta general.',
      analizarAhora: false,
    });

    await expect(
      service.actualizarPorOperador(creada.id, { subcategoriaId: 9999 }),
    ).rejects.toThrow(BusinessRuleError);
  });
});

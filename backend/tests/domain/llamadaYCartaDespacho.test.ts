import { describe, expect, it } from 'vitest';
import {
  AnalisisCopiloto,
  CampoEditableLlamada,
  CartaDespacho,
  CategoriaProtocolo,
  DomainValidationError,
  EstadoLlamada,
  EstadoPreguntaIA,
  EstadoPreguntaOperador,
  HablanteTurno,
  InstruccionPreArriboDef,
  InvalidStateTransitionError,
  Llamada,
  NivelCerteza,
  OrigenReporte,
  PreguntaProtocoloDef,
  PrioridadIncidente,
  ProtocoloSubcategoria,
  ProveedorIA,
  SubcategoriaProtocolo,
  Transcripcion,
} from '../../src/domain/index.js';

function crearProtocolo(subId = 1): ProtocoloSubcategoria {
  return new ProtocoloSubcategoria({
    categoria: new CategoriaProtocolo({
      id: 1,
      nombre: 'INCENDIO_RESCATE',
      etiqueta: 'Incendio y Rescate',
    }),
    subcategoria: new SubcategoriaProtocolo({
      id: subId,
      categoriaId: 1,
      nombre: subId === 1 ? 'incendio_estructural' : 'incendio_electrico_litio',
      etiqueta: subId === 1 ? 'Incendio estructural' : 'Incendio eléctrico',
      criterio: 'Criterio operativo',
    }),
    preguntasUniversales: [
      new PreguntaProtocoloDef({
        id: 1,
        subcategoriaId: null,
        texto: '¿Dirección exacta?',
        critica: true,
      }),
    ],
    preguntasEspecificas: [
      new PreguntaProtocoloDef({
        id: subId === 1 ? 3 : 10,
        subcategoriaId: subId,
        texto:
          subId === 1
            ? '¿Hay personas atrapadas?'
            : '¿Se cortó el suministro eléctrico?',
        critica: true,
      }),
    ],
    instruccionesPreArribo: [
      new InstruccionPreArriboDef({
        id: subId === 1 ? 100 : 200,
        subcategoriaId: subId,
        texto:
          subId === 1
            ? 'No reingresar al inmueble.'
            : 'Prohibido arrojar agua sobre el tablero.',
        critica: true,
      }),
    ],
  });
}

describe('domain/Llamada y CartaDespacho', () => {
  it('protege ediciones humanas (Human-in-the-Loop) e instrucciones transmitidas ante re-análisis', () => {
    const protocolo = crearProtocolo(1);
    const llamada = Llamada.crear({
      id: 'llamada-hitl',
      origenReporte: OrigenReporte.TELEFONIA_911,
      transcripcionCruda: 'Llamante: Fuego en cocina de Corrientes al 1500.',
      ahora: '2026-11-24T10:00:00.000Z',
    });

    const analisis1 = AnalisisCopiloto.consolidarDesdeDetecciones({
      protocolo,
      transcripcion: llamada.transcripcion,
      descripcionIncidente: 'Fuego en cocina',
      ubicacion: { calle: 'Corrientes', altura: '1500' },
      prioridadSugerida: PrioridadIncidente.P2,
      preguntasDetectadas: [
        {
          preguntaId: 1,
          estado: EstadoPreguntaIA.RESPONDIDA,
          respuestaExtraida: 'Corrientes al 1500',
          citaEvidencia: 'Corrientes al 1500',
        },
      ],
      riesgosDetectados: ['Humo'],
      recursosRecomendadosDespacho: ['1x Autobomba'],
      notasOperativasDespacho: 'Fuego en cocina.',
      confianzaGlobal: NivelCerteza.MEDIA,
      metadatos: {
        proveedorUsado: ProveedorIA.MOCK,
        modeloUsado: 'deterministic-rules-v1',
        latenciaMs: 2,
        degradado: false,
      },
    });

    llamada.aplicarAnalisis(analisis1, '2026-11-24T10:00:10.000Z');

    llamada.editarPorOperador(
      {
        prioridad: PrioridadIncidente.P1,
        ubicacion: { calle: 'Av. Corrientes' },
        checklist: [
          {
            preguntaId: 3,
            estadoOperador: EstadoPreguntaOperador.CONFIRMADA,
            notaOperador: 'Cocinero en el fondo',
          },
        ],
        instruccionesPreArribo: [{ instruccionId: 100, transmitida: true }],
      },
      '2026-11-24T10:00:20.000Z',
    );

    expect(llamada.camposEditadosPorOperador).toEqual(
      expect.arrayContaining([
        CampoEditableLlamada.PRIORIDAD,
        CampoEditableLlamada.UBICACION_CALLE,
      ]),
    );

    llamada.agregarTurno({
      hablante: HablanteTurno.LLAMANTE,
      texto: 'Estamos en San Nicolás.',
      ahora: '2026-11-24T10:00:30.000Z',
    });

    const analisis2 = AnalisisCopiloto.consolidarDesdeDetecciones({
      protocolo,
      transcripcion: llamada.transcripcion,
      descripcionIncidente: 'Incendio en pizzería',
      ubicacion: {
        calle: 'Corrientes',
        altura: '1500',
        barrioComuna: 'San Nicolás (Comuna 1)',
      },
      prioridadSugerida: PrioridadIncidente.P3,
      preguntasDetectadas: [],
      riesgosDetectados: ['Humo', 'Gas'],
      recursosRecomendadosDespacho: ['1x Autobomba', '1x SAME'],
      notasOperativasDespacho: 'Fuego en cocina con persona atrapada.',
      confianzaGlobal: NivelCerteza.ALTA,
      metadatos: {
        proveedorUsado: ProveedorIA.MOCK,
        modeloUsado: 'deterministic-rules-v1',
        latenciaMs: 2,
        degradado: false,
      },
    });

    llamada.aplicarAnalisis(analisis2, '2026-11-24T10:00:40.000Z');

    expect(llamada.prioridad).toBe(PrioridadIncidente.P1);
    expect(llamada.ubicacion.calle).toBe('Av. Corrientes');
    expect(llamada.ubicacion.barrioComuna).toBe('San Nicolás (Comuna 1)');
    expect(llamada.descripcionIncidente).toBe('Incendio en pizzería');
    expect(
      llamada.checklist.find((i) => i.preguntaId === 3)?.estadoOperador,
    ).toBe(EstadoPreguntaOperador.CONFIRMADA);
    expect(llamada.instruccionesPreArribo[0]?.transmitida).toBe(true);
  });

  it('recarga protocolo manualmente preservando universales confirmadas y deriva a CartaDespacho sin transcripción', () => {
    const protocolo1 = crearProtocolo(1);
    const protocolo2 = crearProtocolo(2);

    const llamada = Llamada.crear({
      id: 'llamada-derivar',
      origenReporte: OrigenReporte.TELEFONIA_911,
      transcripcionCruda: 'Llamante: Sale humo del tablero en Yerbal 2450.',
    });

    const analisis = AnalisisCopiloto.consolidarDesdeDetecciones({
      protocolo: protocolo1,
      transcripcion: new Transcripcion(llamada.transcripcionCruda),
      descripcionIncidente: 'Humo en edificio',
      ubicacion: { calle: 'Yerbal', altura: '2450' },
      prioridadSugerida: PrioridadIncidente.P1,
      preguntasDetectadas: [
        {
          preguntaId: 1,
          estado: EstadoPreguntaIA.RESPONDIDA,
          respuestaExtraida: 'Yerbal 2450',
          citaEvidencia: 'Yerbal 2450',
        },
      ],
      riesgosDetectados: ['Riesgo eléctrico'],
      recursosRecomendadosDespacho: ['1x Autobomba'],
      notasOperativasDespacho: 'Tablero eléctrico en hall.',
      confianzaGlobal: NivelCerteza.ALTA,
      metadatos: {
        proveedorUsado: ProveedorIA.MOCK,
        modeloUsado: 'deterministic-rules-v1',
        latenciaMs: 1,
        degradado: false,
      },
    });

    llamada.aplicarAnalisis(analisis);
    llamada.cambiarProtocoloPorOperador(protocolo2);

    expect(llamada.subcategoriaId).toBe(2);
    expect(llamada.checklist.find((i) => i.preguntaId === 1)?.estadoIA).toBe(
      EstadoPreguntaIA.RESPONDIDA,
    );
    expect(llamada.checklist.find((i) => i.preguntaId === 10)).toBeDefined();
    expect(llamada.instruccionesPreArribo[0]?.instruccionId).toBe(200);

    const carta = llamada.derivar({
      cartaDespachoId: 'carta-1',
      ahora: '2026-11-24T10:15:00.000Z',
    });

    expect(llamada.estado).toBe(EstadoLlamada.DERIVADA);
    expect(carta).toBeInstanceOf(CartaDespacho);
    expect(carta.llamadaId).toBe('llamada-derivar');
    expect('transcripcionCruda' in carta.toSnapshot()).toBe(false);

    const rehidratada = Llamada.rehidratar(llamada.toSnapshot());
    expect(rehidratada.toSnapshot()).toEqual(llamada.toSnapshot());

    const cartaRehidratada = CartaDespacho.rehidratar(carta.toSnapshot());
    expect(cartaRehidratada.toSnapshot()).toEqual(carta.toSnapshot());

    expect(() =>
      llamada.editarPorOperador({ descripcionIncidente: 'Cambio tardío' }),
    ).toThrow(InvalidStateTransitionError);
    expect(() =>
      llamada.agregarTurno({
        hablante: HablanteTurno.LLAMANTE,
        texto: 'Otro dato',
      }),
    ).toThrow(InvalidStateTransitionError);
    expect(() => llamada.derivar()).toThrow(InvalidStateTransitionError);
    expect(() => llamada.descartar()).toThrow(InvalidStateTransitionError);
  });

  it('bloquea derivación incompleta y permite descartar solo desde EN_CURSO', () => {
    const llamada = Llamada.crear({
      id: 'llamada-incompleta',
      origenReporte: OrigenReporte.TELEFONIA_147,
      transcripcionCruda: 'Llamante: Hay un árbol caído.',
    });

    expect(() => llamada.derivar()).toThrow(DomainValidationError);

    llamada.descartar('2026-11-24T10:20:00.000Z');
    expect(llamada.estado).toBe(EstadoLlamada.DESCARTADA);
    expect(() => llamada.descartar()).toThrow(InvalidStateTransitionError);
  });
});

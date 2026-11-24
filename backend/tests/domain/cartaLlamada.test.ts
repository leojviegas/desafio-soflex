import { describe, expect, it } from 'vitest';
import {
  AnalisisCopiloto,
  CartaLlamada,
  CategoriaIncidente,
  DomainValidationError,
  EstadoCartaLlamada,
  EstadoPreguntaProtocolo,
  HablanteTurno,
  InstruccionPreArribo,
  InvalidStateTransitionError,
  NivelCerteza,
  OrigenReporte,
  PreguntaProtocolo,
  PrioridadIncidente,
  ProveedorIA,
  TurnoDialogo,
  UbicacionNormalizada,
  type AnalisisCopilotoProps,
} from '../../src/domain/index.js';

function crearAnalisisBase(overrides: Partial<AnalisisCopilotoProps> = {}): AnalisisCopiloto {
  return new AnalisisCopiloto({
    ubicacion: new UbicacionNormalizada({
      calle: 'Av. Corrientes',
      altura: null,
      interseccion: 'Montevideo y Paraná',
      barrioComuna: 'San Nicolás (Comuna 1)',
      referencia: 'Pizzería',
    }),
    categoria: CategoriaIncidente.INCENDIO_RESCATE,
    subcategoria: 'Incendio en Comercio Gastronómico',
    prioridadSugerida: PrioridadIncidente.P1,
    riesgosDetectados: ['Grasa inflamada en conductos', 'Personas atrapadas'],
    preguntasProtocolo: [
      new PreguntaProtocolo({
        id: 'preg-1',
        texto: '¿Hay personas atrapadas en el interior?',
        obligatoria: true,
        estado: EstadoPreguntaProtocolo.RESPONDIDA_EN_RELATO,
        respuestaDetectada: 'Sí, el cocinero quedó adentro',
        evidencia: 'adentro quedó el cocinero',
      }),
      new PreguntaProtocolo({
        id: 'preg-2',
        texto: '¿Pudo cortar la llave de gas general?',
        obligatoria: true,
        estado: EstadoPreguntaProtocolo.PENDIENTE,
        respuestaDetectada: null,
        evidencia: null,
      }),
    ],
    instruccionesPreArribo: [
      new InstruccionPreArribo({
        id: 'inst-1',
        texto: 'No reingresar al local por ningún motivo.',
        critica: true,
        transmitida: false,
      }),
    ],
    recursosRecomendadosCad: ['1x Autobomba de ataque rápido', '1x Ambulancia SAME preventiva'],
    notasOperativasSugeridas: 'Incendio en cocina de pizzería sobre Corrientes.',
    confianzaGlobal: NivelCerteza.MEDIA,
    evidencias: ['se prendió fuego la campana de la cocina'],
    proveedorUsado: ProveedorIA.MOCK,
    modeloUsado: 'deterministic-rules-v1',
    latenciaMs: 4,
    degradado: false,
    motivoDegradacion: null,
    ...overrides,
  });
}

describe('domain/CartaLlamada y clases de dominio', () => {
  it('valida invariantes en constructores de clases individuales', () => {
    expect(
      () => new TurnoDialogo({ hablante: HablanteTurno.LLAMANTE, texto: '   ' }),
    ).toThrow(DomainValidationError);
    expect(() => new PreguntaProtocolo({ texto: '' })).toThrow(DomainValidationError);
    expect(() => new InstruccionPreArribo({ texto: '   ' })).toThrow(
      DomainValidationError,
    );

    const ubicacion = new UbicacionNormalizada({
      calle: '  Av. Corrientes ',
      altura: ' ',
    });
    expect(ubicacion.calle).toBe('Av. Corrientes');
    expect(ubicacion.altura).toBeNull();
    expect(ubicacion.camposFaltantes).toEqual(['altura', 'interseccion', 'barrioComuna']);
    expect(ubicacion.tieneUbicacionMinima()).toBe(true);
  });

  it('rechaza crear una CartaLlamada con transcripción vacía', () => {
    expect(() =>
      CartaLlamada.crear({
        origenReporte: OrigenReporte.TELEFONIA_911,
        transcripcionCruda: '   ',
      }),
    ).toThrow(DomainValidationError);
  });

  it('parsea turnos con etiquetas Operador/Llamante y texto libre sin etiquetas', () => {
    const conEtiquetas = CartaLlamada.crear({
      origenReporte: OrigenReporte.TELEFONIA_911,
      transcripcionCruda:
        'Operador: 911 emergencias, ¿dónde es? Llamante: En Av. Corrientes, se prendió fuego la cocina.',
    });

    expect(conEtiquetas.turnos).toHaveLength(2);
    expect(conEtiquetas.turnos[0]).toBeInstanceOf(TurnoDialogo);
    expect(conEtiquetas.turnos[0]?.hablante).toBe(HablanteTurno.OPERADOR);
    expect(conEtiquetas.turnos[1]?.hablante).toBe(HablanteTurno.LLAMANTE);
    expect(conEtiquetas.ubicacionValidada.camposFaltantes).toEqual([
      'calle',
      'altura',
      'interseccion',
      'barrioComuna',
    ]);

    const textoLibre = CartaLlamada.crear({
      transcripcionCruda: 'Choque en esquina de Rivadavia y Medrano.',
    });
    expect(textoLibre.turnos).toHaveLength(1);
    expect(textoLibre.turnos[0]?.hablante).toBe(HablanteTurno.LLAMANTE);
  });

  it('preserva overrides manuales granulares e indicadores transmitidos al re-analizar', () => {
    const carta = CartaLlamada.crear({
      origenReporte: OrigenReporte.TELEFONIA_911,
      transcripcionCruda: 'Llamante: Fuego en pizzería de Av. Corrientes.',
    });

    carta.aplicarAnalisis(crearAnalisisBase());

    carta.actualizarPorOperador({
      ubicacionValidada: { altura: '1540' },
      prioridadValidada: PrioridadIncidente.P2,
      instruccionesPreArribo: [
        {
          id: 'inst-1',
          texto: 'No reingresar al local por ningún motivo.',
          critica: true,
          transmitida: true,
        },
      ],
      preguntasProtocolo: [
        {
          id: 'preg-1',
          texto: '¿Hay personas atrapadas en el interior?',
          obligatoria: true,
          estado: EstadoPreguntaProtocolo.RESPONDIDA_EN_RELATO,
          respuestaDetectada: 'Sí, el cocinero quedó adentro',
          evidencia: 'adentro quedó el cocinero',
        },
        {
          id: 'preg-2',
          texto: '¿Pudo cortar la llave de gas general?',
          obligatoria: true,
          estado: EstadoPreguntaProtocolo.CONFIRMADA_OPERADOR,
          respuestaDetectada: 'Sí, cortada',
          evidencia: 'Confirmado por operador',
        },
      ],
    });

    carta.agregarTurno({
      hablante: HablanteTurno.LLAMANTE,
      texto: 'Confirmamos que es en Av. Corrientes 1548.',
    });

    carta.aplicarAnalisis(
      crearAnalisisBase({
        ubicacion: new UbicacionNormalizada({
          calle: 'Av. Corrientes',
          altura: '1548',
          interseccion: 'Montevideo y Paraná',
          barrioComuna: 'San Nicolás (Comuna 1)',
        }),
        prioridadSugerida: PrioridadIncidente.P1,
      }),
    );

    const snapshot = carta.toSnapshot();
    expect(snapshot.ubicacionValidada.altura).toBe('1540');
    expect(snapshot.ubicacionValidada.calle).toBe('Av. Corrientes');
    expect(snapshot.prioridadValidada).toBe(PrioridadIncidente.P2);
    expect(snapshot.instruccionesPreArribo[0]?.transmitida).toBe(true);
    expect(snapshot.preguntasProtocolo[1]?.estado).toBe(
      EstadoPreguntaProtocolo.CONFIRMADA_OPERADOR,
    );
    expect(snapshot.preguntasProtocolo[1]?.respuestaDetectada).toBe('Sí, cortada');
    expect(snapshot.camposEditadosPorOperador).toContain('ubicacionValidada.altura');
    expect(snapshot.camposEditadosPorOperador).toContain('prioridadValidada');
  });

  it('valida requisitos mínimos al derivar y bloquea mutaciones posteriores', () => {
    const carta = CartaLlamada.crear({
      transcripcionCruda: 'Llamante: Hay humo en un edificio.',
    });

    expect(() => carta.derivar()).toThrow(DomainValidationError);
    expect(carta.obtenerFaltantesParaDerivacion()).toEqual([
      'ubicacionValidada',
      'categoriaValidada',
      'prioridadValidada',
      'notasOperativas',
    ]);

    carta.aplicarAnalisis(crearAnalisisBase());
    carta.derivar('Derivada con prioridad crítica.');

    const snap = carta.toSnapshot();
    expect(snap.estado).toBe(EstadoCartaLlamada.DERIVADA);
    expect(snap.derivadaEn).not.toBeNull();

    expect(() =>
      carta.actualizarPorOperador({ notasOperativas: 'Intento tardío' }),
    ).toThrow(InvalidStateTransitionError);
    expect(() =>
      carta.agregarTurno({ hablante: HablanteTurno.LLAMANTE, texto: 'Algo más' }),
    ).toThrow(InvalidStateTransitionError);
    expect(() => carta.aplicarAnalisis(crearAnalisisBase())).toThrow(
      InvalidStateTransitionError,
    );
    expect(() => carta.derivar()).toThrow(InvalidStateTransitionError);
    expect(() => carta.descartar()).toThrow(InvalidStateTransitionError);
  });

  it('permite descartar una carta en curso y bloquea mutaciones posteriores', () => {
    const carta = CartaLlamada.crear({
      transcripcionCruda: 'Llamante: Llamada de prueba equivocada.',
    });

    carta.descartar();
    expect(carta.estado).toBe(EstadoCartaLlamada.DESCARTADA);
    expect(() => carta.derivar()).toThrow(InvalidStateTransitionError);
  });
});

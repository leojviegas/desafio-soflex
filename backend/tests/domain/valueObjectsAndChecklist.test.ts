import { describe, expect, it } from 'vitest';
import {
  AnalisisCopiloto,
  CampoEditableLlamada,
  CategoriaProtocolo,
  ChecklistProtocolo,
  DomainValidationError,
  EstadoPreguntaIA,
  EstadoPreguntaOperador,
  HablanteTurno,
  InstruccionPreArriboDef,
  NivelCerteza,
  PreguntaProtocoloDef,
  PrioridadIncidente,
  ProtocoloSubcategoria,
  ProveedorIA,
  RegistroEdicionesOperador,
  SubcategoriaProtocolo,
  Transcripcion,
  UbicacionNormalizada,
} from '../../src/domain/index.js';

function crearProtocoloEjemplo(): ProtocoloSubcategoria {
  const categoria = new CategoriaProtocolo({
    id: 1,
    nombre: 'INCENDIO_RESCATE',
    etiqueta: 'Incendio y Rescate',
  });
  const subcategoria = new SubcategoriaProtocolo({
    id: 1,
    categoriaId: 1,
    nombre: 'incendio_estructural',
    etiqueta: 'Incendio estructural',
    criterio: 'Fuego o humo en vivienda o comercio',
  });
  const universales = [
    new PreguntaProtocoloDef({
      id: 1,
      subcategoriaId: null,
      texto: '¿Cuál es la dirección exacta, altura o intersección del incidente?',
      critica: true,
    }),
    new PreguntaProtocoloDef({
      id: 2,
      subcategoriaId: null,
      texto: '¿Usted o las personas cercanas se encuentran en un lugar seguro?',
      critica: true,
    }),
  ];
  const especificas = [
    new PreguntaProtocoloDef({
      id: 3,
      subcategoriaId: 1,
      texto: '¿Hay personas atrapadas en el interior?',
      critica: true,
    }),
    new PreguntaProtocoloDef({
      id: 4,
      subcategoriaId: 1,
      texto: '¿Pudo cortar la llave de gas general?',
      critica: false,
    }),
  ];
  const instruccionesPreArribo = [
    new InstruccionPreArriboDef({
      id: 10,
      subcategoriaId: 1,
      texto: 'No reingresar al local por ningún motivo.',
      critica: true,
    }),
  ];

  return new ProtocoloSubcategoria({
    categoria,
    subcategoria,
    preguntasUniversales: universales,
    preguntasEspecificas: especificas,
    instruccionesPreArribo,
  });
}

describe('domain/Value Objects y Paso 4 determinista (Opción B1)', () => {
  it('UbicacionNormalizada calcula camposFaltantes sin incluir referencia y protege subcampos editados', () => {
    const ubicacion = new UbicacionNormalizada({
      calle: 'Av. Corrientes',
      altura: '   ',
      referencia: 'Pizzería',
    });

    expect(ubicacion.altura).toBeNull();
    expect(ubicacion.camposFaltantes).toEqual([
      'altura',
      'interseccion',
      'barrioComuna',
    ]);
    expect(ubicacion.tieneUbicacionMinima()).toBe(true);
    expect(UbicacionNormalizada.vacia().tieneUbicacionMinima()).toBe(false);

    const ediciones = RegistroEdicionesOperador.vacio().registrar(
      CampoEditableLlamada.UBICACION_CALLE,
    );
    const sugerida = new UbicacionNormalizada({
      calle: 'Corrientes',
      altura: '1540',
      barrioComuna: 'San Nicolás (Comuna 1)',
    });

    const fusionada = ubicacion.fusionarProtegiendo(sugerida, ediciones);
    expect(fusionada.calle).toBe('Av. Corrientes');
    expect(fusionada.altura).toBe('1540');
    expect(fusionada.barrioComuna).toBe('San Nicolás (Comuna 1)');
  });

  it('Transcripcion rechaza vacíos, parsea turnos sin SISTEMA y verifica citas normalizadas', () => {
    expect(() => new Transcripcion('   ')).toThrow(DomainValidationError);

    const sinPrefijo = new Transcripcion('Se incendia el tablero de la esquina.');
    expect(sinPrefijo.obtenerTurnos().map((t) => t.toSnapshot())).toEqual([
      {
        indice: 1,
        hablante: HablanteTurno.LLAMANTE,
        texto: 'Se incendia el tablero de la esquina.',
      },
    ]);

    const conDialogo = new Transcripcion(
      'Nota previa suelta. Operador: 911, ¿dónde es? Llamante: En Av. Corrientes 1540, ¡quedó el cocinero adentro!',
    );
    const turnos = conDialogo.obtenerTurnos();
    expect(turnos).toHaveLength(3);
    expect(turnos[0]?.hablante).toBe(HablanteTurno.LLAMANTE);
    expect(turnos[1]?.hablante).toBe(HablanteTurno.OPERADOR);
    expect(turnos[2]?.hablante).toBe(HablanteTurno.LLAMANTE);

    const ampliada = conDialogo.anexarTurno(
      HablanteTurno.OPERADOR,
      '¿Pudo cortar el gas?',
    );
    expect(ampliada.obtenerTurnos()).toHaveLength(4);

    expect(ampliada.contieneEvidencia('av corrientes 1540 quedo el cocinero')).toBe(
      true,
    );
    expect(ampliada.contieneEvidencia('Av. Santa Fe 9999')).toBe(false);
    expect(ampliada.contieneEvidencia('a')).toBe(false);
  });

  it('ChecklistProtocolo descarta IDs ajenos, degrada citas no verificadas y calcula PENDIENTE por resta', () => {
    const protocolo = crearProtocoloEjemplo();
    const transcripcion = new Transcripcion(
      'Operador: 911. Llamante: En Av. Corrientes 1540 se incendia la cocina y quedó el cocinero adentro.',
    );

    const analisis = AnalisisCopiloto.consolidarDesdeDetecciones({
      protocolo,
      transcripcion,
      descripcionIncidente: 'Incendio en cocina comercial',
      ubicacion: {
        calle: 'Av. Corrientes',
        altura: '1540',
      },
      prioridadSugerida: PrioridadIncidente.P1,
      preguntasDetectadas: [
        {
          preguntaId: 1,
          estado: EstadoPreguntaIA.RESPONDIDA,
          respuestaExtraida: 'Av. Corrientes 1540',
          citaEvidencia: 'En Av. Corrientes 1540',
        },
        {
          preguntaId: 3,
          estado: EstadoPreguntaIA.RESPONDIDA,
          respuestaExtraida: 'Sí, el cocinero',
          citaEvidencia: 'Cita inventada por el modelo que no existe',
        },
        {
          preguntaId: 999,
          estado: EstadoPreguntaIA.RESPONDIDA,
          respuestaExtraida: 'Pregunta de otro protocolo',
          citaEvidencia: 'cocina',
        },
      ],
      riesgosDetectados: ['Personas atrapadas'],
      recursosRecomendadosDespacho: ['1x Autobomba'],
      notasOperativasDespacho: 'Fuego en cocina con atrapado.',
      confianzaGlobal: NivelCerteza.ALTA,
      metadatos: {
        proveedorUsado: ProveedorIA.MOCK,
        modeloUsado: 'deterministic-rules-v1',
        latenciaMs: 4,
        degradado: false,
      },
    });

    expect(analisis.checklist).toHaveLength(4);

    const p1 = analisis.checklist.find((i) => i.preguntaId === 1)!;
    expect(p1.estadoIA).toBe(EstadoPreguntaIA.RESPONDIDA);
    expect(p1.evidenciaVerificada).toBe(true);

    const p3 = analisis.checklist.find((i) => i.preguntaId === 3)!;
    expect(p3.estadoIA).toBe(EstadoPreguntaIA.AMBIGUA);
    expect(p3.evidenciaVerificada).toBe(false);

    const p2 = analisis.checklist.find((i) => i.preguntaId === 2)!;
    const p4 = analisis.checklist.find((i) => i.preguntaId === 4)!;
    expect(p2.estadoIA).toBe(EstadoPreguntaIA.PENDIENTE);
    expect(p4.estadoIA).toBe(EstadoPreguntaIA.PENDIENTE);

    expect(analisis.instruccionesPreArribo).toHaveLength(1);
    expect(analisis.instruccionesPreArribo[0]?.transmitida).toBe(false);
  });

  it('recarga protocolo conservando preguntas universales con intervención humana o evidencia', () => {
    const protocolo = crearProtocoloEjemplo();
    const inicial = ChecklistProtocolo.construirDesdeDetecciones(
      protocolo.todasLasPreguntas(),
      [
        {
          preguntaId: 1,
          estado: EstadoPreguntaIA.RESPONDIDA,
          respuestaExtraida: 'Av. Corrientes 1540',
          citaEvidencia: 'Av. Corrientes 1540',
        },
      ],
      new Transcripcion('Llamante: En Av. Corrientes 1540.'),
    ).actualizarItemOperador(1, EstadoPreguntaOperador.CONFIRMADA, 'Verificada');

    const nuevaSub = new SubcategoriaProtocolo({
      id: 2,
      categoriaId: 1,
      nombre: 'incendio_electrico_litio',
      etiqueta: 'Incendio eléctrico',
      criterio: 'Tablero o litio',
    });
    const nuevaPregunta = new PreguntaProtocoloDef({
      id: 50,
      subcategoriaId: 2,
      texto: '¿Se cortó el disyuntor general?',
      critica: true,
    });

    const recargado = inicial.recargarParaProtocolo([
      ...protocolo.preguntasUniversales,
      nuevaPregunta,
    ]);

    expect(recargado.items).toHaveLength(3);
    const universalConfirmada = recargado.items.find((i) => i.preguntaId === 1)!;
    expect(universalConfirmada.estadoOperador).toBe(
      EstadoPreguntaOperador.CONFIRMADA,
    );
    expect(universalConfirmada.notaOperador).toBe('Verificada');

    const especificaNueva = recargado.items.find(
      (i) => i.preguntaId === nuevaPregunta.id,
    )!;
    expect(especificaNueva.estadoIA).toBe(EstadoPreguntaIA.PENDIENTE);

    expect(
      () =>
        new ProtocoloSubcategoria({
          categoria: new CategoriaProtocolo({
            id: 99,
            nombre: 'OTRA',
            etiqueta: 'Otra',
          }),
          subcategoria: nuevaSub,
          preguntasUniversales: protocolo.preguntasUniversales,
          preguntasEspecificas: [nuevaPregunta],
          instruccionesPreArribo: [],
        }),
    ).toThrow(DomainValidationError);
  });
});

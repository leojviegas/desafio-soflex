import {
  AnalisisCopiloto,
  HablanteTurno,
  MetadatosEjecucionIA,
  NivelCerteza,
  normalizarParaComparacion,
  PrioridadIncidente,
  ProveedorIA,
  Transcripcion,
} from '../../domain/index.js';
import type {
  CatalogoProtocolosCompleto,
  ProtocoloRepository,
  SubcategoriaCatalogoConDetalles,
} from '../../repositories/index.js';
import type { LlmCopilotOutput, PreguntaDetectadaIA } from '../../schemas/index.js';
import type {
  AnalyzeCallInput,
  CopilotAnalyzerMetadata,
  CopilotAnalyzerProvider,
} from './copilotAnalyzerProvider.js';
import { consolidarSalidaCopiloto } from './copilotPostProcessor.js';
import { MOCK_MODEL_NAME } from './llm.js';
import { extraerUbicacionDesdeTranscripcion } from './mockLocationExtractor.js';

interface ReglaSubcategoriaMock {
  keywords: readonly string[];
  prioridadBase: PrioridadIncidente;
  riesgosBase: readonly string[];
  recursosBase: readonly string[];
}

const REGLAS_SUBCATEGORIA: Readonly<Record<string, ReglaSubcategoriaMock>> = {
  incendio_estructural: {
    keywords: ['pizzeria', 'cocina', 'campana', 'vivienda', 'local', 'humo negro', 'salon', 'cocinero'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Propagación rápida de fuego y humo', 'Posibles personas atrapadas'],
    recursosBase: ['1x Autobomba de ataque rápido', '1x Unidad de Rescate', '1x Ambulancia SAME preventiva'],
  },
  incendio_electrico_litio: {
    keywords: ['litio', 'monopatin', 'tablero', 'trifasica', 'subestacion', 'transformador', 'aceite quemado', 'llamarada'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Riesgo eléctrico de alta tensión o explosión térmica', 'Humos tóxicos'],
    recursosBase: ['1x Dotación Bomberos incendios eléctricos/Hazmat', '1x Cuadrilla eléctrica de corte', '1x Ambulancia SAME preventiva'],
  },
  incendio_via_publica_pastizal: {
    keywords: ['contenedor', 'basura', 'pastos', 'pastizal', 'parque', 'optica', 'quema', 'juegos infantiles'],
    prioridadBase: PrioridadIncidente.P2,
    riesgosBase: ['Propagación por viento o a vehículos linderos', 'Inhalación de humo'],
    recursosBase: ['1x Cisterna liviana / Autobomba de Bomberos', '1x Móvil policial preventivo'],
  },
  rescate_ascensor: {
    keywords: ['ascensor', 'cabina', 'pisos', 'trabo el ascensor', 'encargado', 'embarazada'],
    prioridadBase: PrioridadIncidente.P2,
    riesgosBase: ['Claustrofobia o crisis de ansiedad', 'Riesgo mecánico por maniobras inexpertas'],
    recursosBase: ['1x Móvil de Rescate de Bomberos', '1x Ambulancia SAME preventiva'],
  },
  derrame_materiales_peligrosos: {
    keywords: ['cisterna', 'gasoil', 'nafta', 'combustible', 'derrame', 'cordon cuneta', 'rotonda'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Inflamabilidad masiva y calzada resbaladiza', 'Contaminación de desagües pluviales'],
    recursosBase: ['2x Dotaciones de Bomberos con espuma química', '1x Móvil de Tránsito corte total'],
  },
  vial_moto_ciclista: {
    keywords: ['moto', 'motocicleta', 'bicicleta', 'ciclista', 'ciclovia', 'monopatin', 'delivery', 'casco', 'estribo'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Politraumatismo y posible lesión cervical', 'Tránsito activo en avenida'],
    recursosBase: ['1x Ambulancia SAME Código Rojo', '1x Móvil Tránsito / Comisaría para corte'],
  },
  vial_colision_multiple_vuelco: {
    keywords: ['choque en cadena', 'autopista', 'volco', 'volcado', 'zanja', 'cinturon', 'guardarrail', 'carril rapido'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Atrapamiento en habitáculo', 'Colisión secundaria en vía rápida'],
    recursosBase: ['1x Unidad de Rescate de Bomberos', '2x Ambulancias SAME', '1x Móvil Seguridad Vial'],
  },
  vial_obstruccion_vehiculo_pesado: {
    keywords: ['camion', 'acoplado', 'bajo puente', 'encajado', 'altura maxima', 'viaducto'],
    prioridadBase: PrioridadIncidente.P3,
    riesgosBase: ['Compromiso estructural de viaducto', 'Congestión vehicular severa'],
    recursosBase: ['1x Grúa pesada de Tránsito', '1x Cuadrilla de Infraestructura', '1x Móvil Comisaría'],
  },
  medica_respiratoria_anafilaxia: {
    keywords: ['broncoespasmo', 'salbutamol', 'labios morados', 'tiraje', 'alergico', 'nueces', 'garganta', 'hinchada', 'tragar'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Insuficiencia respiratoria aguda / edema de glotis'],
    recursosBase: ['1x Ambulancia SAME Código Rojo / Terapia Intensiva Móvil'],
  },
  medica_sincope_descompensacion: {
    keywords: ['desmayo', 'anden', 'subte', 'transpira frio', 'blanca como un papel', 'calor', 'no siente las piernas'],
    prioridadBase: PrioridadIncidente.P2,
    riesgosBase: ['Lipotimia severa o hipotensión', 'Posible traumatismo en caída'],
    recursosBase: ['1x Unidad Móvil de Auxilio SAME'],
  },
  medica_trauma_fractura_caida: {
    keywords: ['cadera', 'tropezo', 'fractura expuesta', 'hueso asomando', 'tibia', 'perone', 'no se puede incorporar'],
    prioridadBase: PrioridadIncidente.P2,
    riesgosBase: ['Fractura de miembro o cadera', 'Dolor agudo y posible hemorragia'],
    recursosBase: ['1x Ambulancia SAME con inmovilización y analgesia'],
  },
  medica_convulsion: {
    keywords: ['convulsionando', 'convulsion', 'sacudidas', 'espuma en la boca', 'temblar', 'cayo de la silla'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Estatus epiléptico y broncoaspiración', 'Traumatismo craneal secundario'],
    recursosBase: ['1x Ambulancia de Alta Complejidad SAME'],
  },
  dc_fuga_gas: {
    keywords: ['cano de gas', 'olor a gas', 'soplido', 'fibra optica', 'zanja', 'picando la vereda'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Peligro inminente de explosión', 'Intoxicación en viviendas linderas'],
    recursosBase: ['1x Dotación Bomberos', 'Alerta inmediata Metrogas Emergencias', 'Vallado policial'],
  },
  dc_colapso_estructura_arbolado: {
    keywords: ['arbol', 'tipa', 'marquesina', 'medianera', 'desmorono', 'ladrillos colgando', 'perno', 'aplasto'],
    prioridadBase: PrioridadIncidente.P2,
    riesgosBase: ['Desmoronamiento residual o caída de elementos en altura', 'Posible contacto con cables'],
    recursosBase: ['1x Móvil Guardia de Auxilio / Defensa Civil', '1x Móvil Policial para perímetro'],
  },
  dc_anegamiento_inundacion: {
    keywords: ['inundo', 'bajo nivel', 'techos', 'viaducto', 'agua llega', 'mitad de las puertas'],
    prioridadBase: PrioridadIncidente.P2,
    riesgosBase: ['Atrapamiento en bajo nivel anegado', 'Succión por sumideros abiertos'],
    recursosBase: ['1x Bote/Rescate de Bomberos', '1x Bomba de desagote Defensa Civil'],
  },
  sp_riesgo_electrico_via_publica: {
    keywords: ['chispeando', 'cables aereos', 'postes de madera', 'asfalto mojado', 'camion de mudanzas', 'cable grueso'],
    prioridadBase: PrioridadIncidente.P1,
    riesgosBase: ['Electrocución por tensión de paso en calzada húmeda'],
    recursosBase: ['1x Móvil Policial para vallado estricto', '1x Cuadrilla Urgencia Eléctrica'],
  },
  sp_rotura_agua_socavon: {
    keywords: ['pozo', 'socavon', 'fosa', 'cano maestro', 'chorro de agua', 'subsuelos', 'garaje', 'metrobus'],
    prioridadBase: PrioridadIncidente.P2,
    riesgosBase: ['Colapso progresivo de calzada', 'Riesgo eléctrico en subsuelos inundados'],
    recursosBase: ['1x Cuadrilla AySA Redes', '1x Unidad de Tránsito', 'Defensa Civil'],
  },
  sp_semaforizacion_infraestructura: {
    keywords: ['semaforo', 'semaforos', 'bateria de semaforos', 'casi atropellan', 'maestras', 'luminaria', 'bache'],
    prioridadBase: PrioridadIncidente.P3,
    riesgosBase: ['Siniestro vial por cruce sin señalización'],
    recursosBase: ['1x Pareja Agentes de Tránsito', '1x Cuadrilla Técnica de Semaforización'],
  },
  seg_disturbio_violencia: {
    keywords: ['pelea', 'jovenes', 'sillas', 'botellas', 'vidriera', 'kiosco', 'raspon', 'agresion'],
    prioridadBase: PrioridadIncidente.P2,
    riesgosBase: ['Lesiones por elementos cortantes o contundentes', 'Daño a propiedad comercial'],
    recursosBase: ['2x Patrulleros Comisaría Vecinal', '1x Móvil de Tránsito'],
  },
  seg_animal_peligroso: {
    keywords: ['perro', 'dogo', 'pitbull', 'bozal', 'canil', 'grunendo', 'ataco', 'perrito'],
    prioridadBase: PrioridadIncidente.P3,
    riesgosBase: ['Mordeduras a transeúntes o animales'],
    recursosBase: ['1x Móvil Unidad de Sanidad y Protección Animal', 'Personal policial de custodia'],
  },
  general_otro: {
    keywords: ['consulta', 'informacion', 'horario', 'tramite', 'numero', 'donde puedo', 'reclamo administrativo'],
    prioridadBase: PrioridadIncidente.P4,
    riesgosBase: ['Sin riesgo físico inmediato reportado'],
    recursosBase: ['Derivación administrativa / orientación ciudadana'],
  },
};

const SENALES_CRITICAS_P1: readonly string[] = [
  'atrapado',
  'atrapada',
  'atrapados',
  'no respira',
  'no le entra el aire',
  'labios morados',
  'cerrando la garganta',
  'convulsionando',
  'inconsciente',
  'no responde',
  'no se mueve',
  'fuga de gas',
  'soplido',
  'chispeando',
  'exploto',
  'bateria de litio',
  'gasoil',
  'volcado',
  'boca abajo',
  'llamarada',
  'tablero',
  'subestacion',
];

const MARCADORES_DUDA: readonly string[] = [
  'parece',
  'creo',
  'posiblemente',
  'no estoy seguro',
  'no estoy segura',
  'no se si',
  'quizas',
];

function extraerClausulaLiteral(
  textoOriginal: string,
  pista: string,
): string | null {
  const normTexto = normalizarParaComparacion(textoOriginal);
  const normPista = normalizarParaComparacion(pista);
  if (!normPista || !normTexto.includes(normPista)) {
    return null;
  }

  // Buscar primero por segmentos divididos por puntuación fuerte
  const segmentos = textoOriginal
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const seg of segmentos) {
    if (normalizarParaComparacion(seg).includes(normPista)) {
      if (seg.length <= 220) {
        return seg;
      }
      const subSegmentos = seg
        .split(/,\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const sub of subSegmentos) {
        if (normalizarParaComparacion(sub).includes(normPista)) {
          return sub;
        }
      }
      return seg.slice(0, 220).trim();
    }
  }

  return null;
}

export interface MockCopilotAnalyzerOptions {
  defaultDegradado?: boolean;
  defaultMotivoDegradacion?: string | null;
}

/**
 * Motor determinista offline (`LLM_PROVIDER=mock`) y respaldo de degradación controlada.
 * Opera 100% sobre el catálogo en SQLite y reglas léxicas sin credenciales externas.
 */
export class MockCopilotAnalyzer implements CopilotAnalyzerProvider {
  private readonly defaultDegradado: boolean;
  private readonly defaultMotivoDegradacion: string | null;

  constructor(
    private readonly protocoloRepository: ProtocoloRepository,
    options: MockCopilotAnalyzerOptions = {},
  ) {
    this.defaultDegradado = options.defaultDegradado ?? false;
    this.defaultMotivoDegradacion = options.defaultMotivoDegradacion ?? null;
  }

  getMetadata(): CopilotAnalyzerMetadata {
    return {
      provider: ProveedorIA.MOCK,
      model: MOCK_MODEL_NAME,
      fallbackEnabled: true,
    };
  }

  async analyze(input: AnalyzeCallInput): Promise<AnalisisCopiloto> {
    const degradado = Boolean(input.simularDegradado) || this.defaultDegradado;
    const motivoDegradacion = input.simularDegradado
      ? 'Simulación de degradación solicitada explícitamente.'
      : this.defaultMotivoDegradacion;

    return this.analyzeWithMetadata(input, {
      degradado,
      motivoDegradacion,
    });
  }

  async analyzeWithMetadata(
    input: AnalyzeCallInput,
    override: { degradado: boolean; motivoDegradacion: string | null },
  ): Promise<AnalisisCopiloto> {
    const startedAt = Date.now();
    const catalogo = await this.protocoloRepository.listarCatalogoCompleto();
    const transcripcion = new Transcripcion(input.transcripcionCruda);

    const textoLlamante = transcripcion
      .obtenerTurnos()
      .filter((t) => t.hablante === HablanteTurno.LLAMANTE)
      .map((t) => t.texto)
      .join(' ');
    const textoAnalisis =
      textoLlamante.trim().length > 0 ? textoLlamante : transcripcion.textoCrudo;
    const normLlamante = normalizarParaComparacion(textoAnalisis);

    const subcategoria = this.seleccionarSubcategoria(
      catalogo,
      normLlamante,
      input.subcategoriaIdFijadaPorOperador,
    );

    const ubicacionRes = extraerUbicacionDesdeTranscripcion(
      transcripcion.textoCrudo,
    );
    const prioridadSugerida = this.inferirPrioridad(subcategoria, normLlamante);

    const preguntasDetectadas = this.detectarPreguntas(
      catalogo,
      subcategoria,
      transcripcion,
      textoAnalisis,
      normLlamante,
      ubicacionRes,
    );

    const regla = REGLAS_SUBCATEGORIA[subcategoria.nombre];
    const tieneUbicacionCompleta =
      ubicacionRes.ubicacion.calle !== null &&
      (ubicacionRes.ubicacion.altura !== null ||
        ubicacionRes.ubicacion.interseccion !== null);
    const confianzaGlobal = tieneUbicacionCompleta
      ? NivelCerteza.ALTA
      : ubicacionRes.ubicacion.calle !== null ||
          ubicacionRes.ubicacion.referencia !== null
        ? NivelCerteza.MEDIA
        : NivelCerteza.BAJA;

    const rawOutput: LlmCopilotOutput = {
      categoriaId: subcategoria.categoriaId,
      subcategoriaId: subcategoria.id,
      descripcionIncidente: this.construirDescripcion(
        subcategoria,
        ubicacionRes.ubicacion.referencia,
      ),
      ubicacion: ubicacionRes.ubicacion,
      prioridadSugerida,
      preguntasDetectadas,
      riesgosDetectados: [...(regla?.riesgosBase ?? ['Evaluación operativa en curso'])],
      recursosRecomendadosDespacho: [
        ...(regla?.recursosBase ?? ['1x Móvil de verificación preventiva']),
      ],
      notasOperativasDespacho: this.construirNotaDespacho(
        subcategoria,
        ubicacionRes.ubicacion,
        prioridadSugerida,
      ),
      confianzaGlobal,
    };

    const latenciaMs = Math.max(1, Date.now() - startedAt);
    const metadatos = new MetadatosEjecucionIA({
      proveedorUsado: ProveedorIA.MOCK,
      modeloUsado: MOCK_MODEL_NAME,
      latenciaMs,
      degradado: override.degradado,
      motivoDegradacion: override.motivoDegradacion,
    });

    return consolidarSalidaCopiloto({
      rawOutput,
      transcripcionCruda: transcripcion.textoCrudo,
      protocoloRepository: this.protocoloRepository,
      metadatos,
      subcategoriaIdFijadaPorOperador: input.subcategoriaIdFijadaPorOperador,
    });
  }

  private seleccionarSubcategoria(
    catalogo: CatalogoProtocolosCompleto,
    normLlamante: string,
    subcategoriaIdFijada?: number | null,
  ): SubcategoriaCatalogoConDetalles {
    const todas = catalogo.categorias.flatMap((c) => c.subcategorias);

    if (
      subcategoriaIdFijada !== null &&
      subcategoriaIdFijada !== undefined &&
      Number.isInteger(subcategoriaIdFijada) &&
      subcategoriaIdFijada > 0
    ) {
      const fijada = todas.find((s) => s.id === subcategoriaIdFijada);
      if (fijada) {
        return fijada;
      }
    }

    let mejorSub: SubcategoriaCatalogoConDetalles | undefined;
    let mejorScore = 0;

    for (const sub of todas) {
      let score = 0;
      const regla = REGLAS_SUBCATEGORIA[sub.nombre];
      if (regla) {
        for (const kw of regla.keywords) {
          if (normLlamante.includes(normalizarParaComparacion(kw))) {
            score += 5;
          }
        }
      }

      for (const preg of sub.preguntas) {
        for (const pista of preg.pistasMock) {
          if (normLlamante.includes(normalizarParaComparacion(pista))) {
            score += 3;
          }
        }
      }

      const tokensCriterio = normalizarParaComparacion(
        `${sub.etiqueta} ${sub.criterio}`,
      )
        .split(' ')
        .filter((t) => t.length >= 5);
      for (const token of tokensCriterio) {
        if (normLlamante.includes(token)) {
          score += 1;
        }
      }

      if (score > mejorScore) {
        mejorScore = score;
        mejorSub = sub;
      }
    }

    if (mejorSub && mejorScore >= 3) {
      return mejorSub;
    }

    return (
      todas.find((s) => s.nombre === 'general_otro') ??
      todas[0]!
    );
  }

  private inferirPrioridad(
    subcategoria: SubcategoriaCatalogoConDetalles,
    normLlamante: string,
  ): PrioridadIncidente {
    if (subcategoria.nombre === 'general_otro') {
      const tieneRiesgo = SENALES_CRITICAS_P1.some((s) =>
        normLlamante.includes(s),
      );
      return tieneRiesgo ? PrioridadIncidente.P2 : PrioridadIncidente.P4;
    }

    if (SENALES_CRITICAS_P1.some((s) => normLlamante.includes(s))) {
      return PrioridadIncidente.P1;
    }

    const regla = REGLAS_SUBCATEGORIA[subcategoria.nombre];
    return regla?.prioridadBase ?? PrioridadIncidente.P2;
  }

  private detectarPreguntas(
    catalogo: CatalogoProtocolosCompleto,
    subcategoria: SubcategoriaCatalogoConDetalles,
    transcripcion: Transcripcion,
    textoLlamante: string,
    normLlamante: string,
    ubicacionRes: ReturnType<typeof extraerUbicacionDesdeTranscripcion>,
  ): PreguntaDetectadaIA[] {
    const detecciones: PreguntaDetectadaIA[] = [];
    const hayDudaEnRelato = MARCADORES_DUDA.some((m) => normLlamante.includes(m));
    const todasLasPreguntas = [
      ...catalogo.preguntasUniversales,
      ...subcategoria.preguntas,
    ];

    for (const pregunta of todasLasPreguntas) {
      // Pregunta universal de ubicación
      if (
        pregunta.esUniversal &&
        normalizarParaComparacion(pregunta.texto).includes('direccion')
      ) {
        const tieneAlgoUbicacion =
          ubicacionRes.ubicacion.calle !== null ||
          ubicacionRes.ubicacion.interseccion !== null ||
          ubicacionRes.ubicacion.referencia !== null;
        if (
          tieneAlgoUbicacion &&
          ubicacionRes.fragmentoEvidencia &&
          transcripcion.contieneEvidencia(ubicacionRes.fragmentoEvidencia)
        ) {
          const completa =
            ubicacionRes.ubicacion.calle !== null &&
            (ubicacionRes.ubicacion.altura !== null ||
              ubicacionRes.ubicacion.interseccion !== null);
          const partes = [
            ubicacionRes.ubicacion.calle,
            ubicacionRes.ubicacion.altura,
            ubicacionRes.ubicacion.interseccion,
          ].filter((x): x is string => x !== null);
          detecciones.push({
            preguntaId: pregunta.id,
            estado: completa ? 'RESPONDIDA' : 'AMBIGUA',
            respuestaExtraida:
              partes.length > 0
                ? partes.join(' · ')
                : (ubicacionRes.ubicacion.referencia ?? 'Referencia parcial'),
            citaEvidencia: ubicacionRes.fragmentoEvidencia,
          });
        }
        continue;
      }

      const pistaCoincidente = pregunta.pistasMock.find((pista) =>
        normLlamante.includes(normalizarParaComparacion(pista)),
      );
      if (!pistaCoincidente) {
        continue;
      }

      const cita = extraerClausulaLiteral(textoLlamante, pistaCoincidente);
      if (!cita || !transcripcion.contieneEvidencia(cita)) {
        continue;
      }

      detecciones.push({
        preguntaId: pregunta.id,
        estado: hayDudaEnRelato ? 'AMBIGUA' : 'RESPONDIDA',
        respuestaExtraida: `Mención en relato sobre "${pistaCoincidente.trim()}".`,
        citaEvidencia: cita,
      });
    }

    return detecciones;
  }

  private construirDescripcion(
    subcategoria: SubcategoriaCatalogoConDetalles,
    referencia: string | null,
  ): string {
    if (referencia) {
      return `${subcategoria.etiqueta} (${referencia})`;
    }
    return subcategoria.etiqueta;
  }

  private construirNotaDespacho(
    subcategoria: SubcategoriaCatalogoConDetalles,
    ubicacion: {
      calle: string | null;
      altura: string | null;
      interseccion: string | null;
      barrioComuna: string | null;
    },
    prioridad: PrioridadIncidente,
  ): string {
    const lugar = [
      ubicacion.calle,
      ubicacion.altura,
      ubicacion.interseccion ? `(${ubicacion.interseccion})` : null,
      ubicacion.barrioComuna,
    ]
      .filter((x): x is string => x !== null)
      .join(' ');

    return lugar.length > 0
      ? `[${prioridad}] ${subcategoria.etiqueta} en ${lugar}. Requiere verificación operativa en sala.`
      : `[${prioridad}] ${subcategoria.etiqueta}. Ubicación pendiente de completar con el llamante.`;
  }
}

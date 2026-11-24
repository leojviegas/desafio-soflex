import catalogoRaw from '../data/catalogoProtocolos.json';
import datasetRaw from '../data/datasetLlamadas.json';
import type {
  AppendTurnoPayload,
  CopilotApiClient,
  CreateLlamadaPayload,
  DerivarLlamadaPayload,
  DerivarLlamadaResponse,
  HealthResponse,
  ListCartasDespachoFilters,
  ListLlamadasFilters,
  PatchLlamadaPayload,
} from '../types/api';
import type {
  AnalisisCopiloto,
  CartaDespacho,
  CasoReferenciaCsv,
  CatalogoProtocolos,
  ItemChecklistLlamada,
  ItemInstruccionPreArribo,
  Llamada,
  NivelCerteza,
  PreguntaProtocoloDef,
  PrioridadIncidente,
  SubcategoriaProtocolo,
  UbicacionNormalizada,
} from '../types/domain';
import { appendTurnoToTranscripcion, parseTurnosFromTranscripcion } from '../utils/transcript';
import { ApiClientError } from './httpApiClient';

const catalogo = catalogoRaw as CatalogoProtocolos;
const dataset = datasetRaw as CasoReferenciaCsv[];

const DATASET_SUBCATEGORIA_MAP: Record<string, string> = {
  'SFX-REC-2026-001': 'incendio_estructural',
  'SFX-REC-2026-002': 'incendio_via_publica_pastizal',
  'SFX-REC-2026-003': 'rescate_ascensor',
  'SFX-REC-2026-004': 'incendio_via_publica_pastizal',
  'SFX-REC-2026-005': 'vial_moto_ciclista',
  'SFX-REC-2026-006': 'vial_colision_multiple_vuelco',
  'SFX-REC-2026-007': 'vial_obstruccion_vehiculo_pesado',
  'SFX-REC-2026-008': 'medica_sincope_descompensacion',
  'SFX-REC-2026-009': 'medica_respiratoria_anafilaxia',
  'SFX-REC-2026-010': 'medica_trauma_fractura_caida',
  'SFX-REC-2026-011': 'dc_colapso_estructura_arbolado',
  'SFX-REC-2026-012': 'dc_fuga_gas',
  'SFX-REC-2026-013': 'sp_rotura_agua_socavon',
  'SFX-REC-2026-014': 'dc_colapso_estructura_arbolado',
  'SFX-REC-2026-015': 'seg_disturbio_violencia',
  'SFX-REC-2026-016': 'seg_animal_peligroso',
  'SFX-REC-2026-017': 'incendio_electrico_litio',
  'SFX-REC-2026-018': 'vial_moto_ciclista',
  'SFX-REC-2026-019': 'medica_respiratoria_anafilaxia',
  'SFX-REC-2026-020': 'sp_riesgo_electrico_via_publica',
  'SFX-REC-2026-021': 'dc_anegamiento_inundacion',
  'SFX-REC-2026-022': 'derrame_materiales_peligrosos',
  'SFX-REC-2026-023': 'medica_trauma_fractura_caida',
  'SFX-REC-2026-024': 'sp_semaforizacion_infraestructura',
  'SFX-REC-2026-025': 'incendio_electrico_litio',
  'SFX-REC-2026-026': 'medica_convulsion',
  'SFX-REC-2026-027': 'dc_colapso_estructura_arbolado',
  'SFX-REC-2026-028': 'sp_rotura_agua_socavon',
  'SFX-REC-2026-029': 'vial_colision_multiple_vuelco',
  'SFX-REC-2026-030': 'incendio_electrico_litio',
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function makeUuid(prefix: string): string {
  const random = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `${prefix}-${random}`;
}

function findSubcategoriaById(subcategoriaId: number): SubcategoriaProtocolo | undefined {
  for (const cat of catalogo.categorias) {
    const found = cat.subcategorias.find((s) => s.id === subcategoriaId);
    if (found) return found;
  }
  return undefined;
}

function findSubcategoriaByNombre(nombre: string): SubcategoriaProtocolo | undefined {
  for (const cat of catalogo.categorias) {
    const found = cat.subcategorias.find((s) => s.nombre === nombre);
    if (found) return found;
  }
  return undefined;
}

function computeCamposFaltantes(ubicacion: Omit<UbicacionNormalizada, 'camposFaltantes'>): string[] {
  const missing: string[] = [];
  if (!ubicacion.calle?.trim()) missing.push('calle');
  if (!ubicacion.altura?.trim() && !ubicacion.interseccion?.trim()) {
    missing.push('altura');
    missing.push('interseccion');
  }
  if (!ubicacion.barrioComuna?.trim()) missing.push('barrioComuna');
  return missing;
}

function createEmptyUbicacion(): UbicacionNormalizada {
  return {
    calle: null,
    altura: null,
    interseccion: null,
    barrioComuna: null,
    referencia: null,
    camposFaltantes: ['calle', 'altura', 'interseccion', 'barrioComuna'],
  };
}

function extractSentenceAround(raw: string, keyword: string): string | null {
  const normRaw = normalizeText(raw);
  const normKey = normalizeText(keyword);
  const idx = normRaw.indexOf(normKey);
  if (idx === -1) return null;

  const start = Math.max(
    raw.lastIndexOf('.', idx) + 1,
    raw.lastIndexOf('\n', idx) + 1,
    raw.lastIndexOf(':', idx) + 1,
  );
  const nextDot = raw.indexOf('.', idx);
  const nextExcl = raw.indexOf('!', idx);
  const nextLine = raw.indexOf('\n', idx);
  const candidates = [nextDot, nextExcl, nextLine].filter((n) => n !== -1);
  const end = candidates.length > 0 ? Math.min(...candidates) + 1 : raw.length;
  const snippet = raw.slice(start, end).trim();
  return snippet.length > 140 ? `${snippet.slice(0, 137).trim()}...` : snippet;
}

function extractLocationFromFreeText(raw: string): UbicacionNormalizada {
  const streetMatch = raw.match(
    /(?:en\s+|sobre\s+|de\s+)((?:Av\.?\s+|Avenida\s+|Autopista\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ0-9][a-záéíóúñ0-9]+){0,3})(?:\s+(?:al\s+)?(\d{2,5}))?/,
  );
  const interseccionMatch = raw.match(
    /(?:esquina|casi|entre|y)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2}(?:\s+y\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})?)/,
  );

  const calle = streetMatch?.[1]?.trim() ?? null;
  const altura = streetMatch?.[2]?.trim() ?? null;
  const interseccion = interseccionMatch?.[1]?.trim() ?? null;

  const base = {
    calle,
    altura,
    interseccion,
    barrioComuna: null,
    referencia: null,
  };
  return {
    ...base,
    camposFaltantes: computeCamposFaltantes(base),
  };
}

function matchDatasetCase(transcripcionCruda: string): CasoReferenciaCsv | undefined {
  const normInput = normalizeText(transcripcionCruda);
  return dataset.find((item) => {
    const normCase = normalizeText(item.transcripcionCruda);
    return normInput.includes(normCase.slice(0, 85)) || normCase.includes(normInput.slice(0, 85));
  });
}

function inferSubcategoriaFromText(transcripcionCruda: string): SubcategoriaProtocolo {
  const norm = normalizeText(transcripcionCruda);
  let bestSub: SubcategoriaProtocolo | undefined;
  let bestScore = -1;

  for (const cat of catalogo.categorias) {
    for (const sub of cat.subcategorias) {
      let score = 0;
      const criterioTokens = normalizeText(`${sub.etiqueta} ${sub.criterio}`)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3);
      for (const token of criterioTokens) {
        if (norm.includes(token)) score += 2;
      }
      for (const preg of sub.preguntas) {
        for (const pista of preg.pistasMock ?? []) {
          if (norm.includes(normalizeText(pista))) {
            score += 3;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestSub = sub;
      }
    }
  }

  return bestSub ?? findSubcategoriaByNombre('general_otro') ?? catalogo.categorias[0].subcategorias[0];
}

function inferPrioridad(transcripcionCruda: string, subcategoria: SubcategoriaProtocolo): PrioridadIncidente {
  const norm = normalizeText(transcripcionCruda);
  const p1Signals = [
    'atrapad',
    'no respira',
    'morados',
    'convulsion',
    'fuga de gas',
    'soplido',
    'chispeando',
    'exploto',
    'litio',
    'garganta',
    'inconsciente',
    'no se mueve',
    'fuego',
    'derrame',
    'gasoil',
    'tablero',
  ];
  if (p1Signals.some((s) => norm.includes(s))) return 'P1';
  if (subcategoria.nombre.startsWith('medica_') || subcategoria.nombre.startsWith('dc_')) return 'P2';
  if (norm.includes('semaforo') || norm.includes('contenedor') || norm.includes('reclamo')) return 'P3';
  if (subcategoria.nombre === 'general_otro') return 'P4';
  return 'P2';
}

function buildChecklistForSubcategoria(
  subcategoria: SubcategoriaProtocolo,
  transcripcionCruda: string,
  previousChecklist: ItemChecklistLlamada[],
): ItemChecklistLlamada[] {
  const normRaw = normalizeText(transcripcionCruda);
  const prevById = new Map(previousChecklist.map((item) => [item.preguntaId, item]));
  const allDefs: Array<{ def: PreguntaProtocoloDef; esUniversal: boolean }> = [
    ...catalogo.preguntasUniversales.map((def) => ({ def, esUniversal: true })),
    ...subcategoria.preguntas.map((def) => ({ def, esUniversal: false })),
  ];

  return allDefs.map(({ def, esUniversal }) => {
    const prev = prevById.get(def.id);
    const pistas = def.pistasMock ?? [];
    const matchedPista = pistas.find((p) => normRaw.includes(normalizeText(p)));

    let estadoIA: ItemChecklistLlamada['estadoIA'] = 'PENDIENTE';
    let respuestaIA: string | null = null;
    let citaEvidencia: string | null = null;
    let evidenciaVerificada = false;

    if (matchedPista) {
      const snippet = extractSentenceAround(transcripcionCruda, matchedPista);
      const isAmbiguous =
        normRaw.includes('parece') ||
        normRaw.includes('creo') ||
        normRaw.includes('no estoy seguro') ||
        normRaw.includes('posiblemente');

      if (snippet && normRaw.includes(normalizeText(snippet.replace(/\.\.\.$/, '')))) {
        estadoIA = isAmbiguous && !esUniversal ? 'AMBIGUA' : 'RESPONDIDA';
        respuestaIA = `Mención detectada en relato (${matchedPista}).`;
        citaEvidencia = snippet;
        evidenciaVerificada = true;
      } else {
        estadoIA = 'AMBIGUA';
        respuestaIA = 'Mención indirecta; confirmar con el llamante.';
        citaEvidencia = snippet;
        evidenciaVerificada = false;
      }
    }

    return {
      preguntaId: def.id,
      texto: def.texto,
      critica: def.critica,
      esUniversal,
      estadoIA,
      respuestaIA,
      citaEvidencia,
      evidenciaVerificada,
      estadoOperador: prev?.estadoOperador ?? null,
      notaOperador: prev?.notaOperador ?? null,
    };
  });
}

function buildPreArriboForSubcategoria(
  subcategoria: SubcategoriaProtocolo,
  previous: ItemInstruccionPreArribo[],
): ItemInstruccionPreArribo[] {
  const prevMap = new Map(previous.map((item) => [item.instruccionId, item.transmitida]));
  return subcategoria.instruccionesPreArribo.map((ins) => ({
    instruccionId: ins.id,
    texto: ins.texto,
    critica: ins.critica,
    transmitida: prevMap.get(ins.id) ?? false,
  }));
}

function buildSeedCartasDespacho(): CartaDespacho[] {
  const sampleIds = ['SFX-REC-2026-005', 'SFX-REC-2026-012'];
  const now = Date.now();
  return sampleIds
    .map((idReg, idx) => {
      const caso = dataset.find((d) => d.idRegistro === idReg);
      if (!caso) return null;
      const subName = DATASET_SUBCATEGORIA_MAP[idReg];
      const sub = findSubcategoriaByNombre(subName);
      if (!sub) return null;
      const baseUb: Omit<UbicacionNormalizada, 'camposFaltantes'> = {
        calle: caso.calleDetectada,
        altura: caso.alturaDetectada,
        interseccion: caso.interseccionDetectada,
        barrioComuna: caso.barrioComuna,
        referencia: null,
      };
      const carta: CartaDespacho = {
        id: `CAD-${202600 + idx + 1}`,
        llamadaId: `LLAM-HIST-${idx + 1}`,
        origenReporte: caso.origenReporte,
        categoriaId: sub.categoriaId,
        subcategoriaId: sub.id,
        descripcionIncidente: caso.descripcionIncidente,
        prioridad: caso.prioridadSugerida,
        ubicacion: {
          ...baseUb,
          camposFaltantes: computeCamposFaltantes(baseUb),
        },
        riesgosDetectados: [...caso.riesgosDetectados],
        recursosRecomendadosDespacho: [...caso.recursosRecomendadosDespacho],
        notasOperativasDespacho: caso.notasOperativasDespacho,
        derivadaEn: new Date(now - (idx + 1) * 14 * 60_000).toISOString(),
      };
      return carta;
    })
    .filter((item): item is CartaDespacho => item !== null);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockCopilotApiClient implements CopilotApiClient {
  private readonly llamadas = new Map<string, Llamada>();
  private readonly cartasDespacho: CartaDespacho[] = buildSeedCartasDespacho();

  async getHealth(): Promise<HealthResponse> {
    const subcategorias = catalogo.categorias.reduce((acc, c) => acc + c.subcategorias.length, 0);
    return {
      status: 'ok',
      ai: {
        provider: 'mock',
        model: 'deterministic-rules-v1',
        fallbackEnabled: true,
      },
      catalog: {
        categorias: catalogo.categorias.length,
        subcategorias,
      },
      datasetLoaded: dataset.length,
    };
  }

  async getProtocolos(): Promise<CatalogoProtocolos> {
    return structuredClone(catalogo);
  }

  async getDatasetLlamadas(): Promise<CasoReferenciaCsv[]> {
    return structuredClone(dataset);
  }

  async createLlamada(payload: CreateLlamadaPayload): Promise<Llamada> {
    if (!payload.transcripcionCruda.trim()) {
      throw new ApiClientError('La transcripción no puede estar vacía.', 400);
    }

    const now = new Date().toISOString();
    const id = makeUuid('LLAM');
    const nueva: Llamada = {
      id,
      origenReporte: payload.origenReporte,
      estado: 'EN_CURSO',
      transcripcionCruda: payload.transcripcionCruda.trim(),
      turnos: parseTurnosFromTranscripcion(payload.transcripcionCruda),
      categoriaId: null,
      subcategoriaId: null,
      descripcionIncidente: '',
      prioridad: null,
      ubicacion: createEmptyUbicacion(),
      checklist: [],
      instruccionesPreArribo: [],
      riesgosDetectados: [],
      recursosRecomendadosDespacho: [],
      notasOperativasDespacho: '',
      ultimoAnalisis: null,
      camposEditadosPorOperador: [],
      cartaDespacho: null,
      creadaEn: now,
      actualizadaEn: now,
    };

    this.llamadas.set(id, nueva);

    if (payload.analizarAhora) {
      return this.analizarLlamada(id);
    }

    return structuredClone(nueva);
  }

  async listLlamadas(filters?: ListLlamadasFilters): Promise<Llamada[]> {
    const items = Array.from(this.llamadas.values()).filter((l) => {
      if (filters?.estado && l.estado !== filters.estado) return false;
      if (filters?.categoriaId && l.categoriaId !== filters.categoriaId) return false;
      if (filters?.subcategoriaId && l.subcategoriaId !== filters.subcategoriaId) return false;
      if (filters?.prioridad && l.prioridad !== filters.prioridad) return false;
      return true;
    });
    return structuredClone(items.sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)));
  }

  async getLlamada(id: string): Promise<Llamada> {
    const found = this.llamadas.get(id);
    if (!found) throw new ApiClientError('Llamada no encontrada.', 404);
    return structuredClone(found);
  }

  async appendTurno(id: string, payload: AppendTurnoPayload): Promise<Llamada> {
    const llamada = this.llamadas.get(id);
    if (!llamada) throw new ApiClientError('Llamada no encontrada.', 404);
    if (llamada.estado !== 'EN_CURSO') {
      throw new ApiClientError('No se pueden agregar turnos a una llamada cerrada.', 409);
    }
    if (!payload.texto.trim()) {
      throw new ApiClientError('El texto del turno no puede estar vacío.', 400);
    }

    llamada.transcripcionCruda = appendTurnoToTranscripcion(
      llamada.transcripcionCruda,
      payload.hablante,
      payload.texto,
    );
    llamada.turnos = parseTurnosFromTranscripcion(llamada.transcripcionCruda);
    llamada.actualizadaEn = new Date().toISOString();

    if (payload.reanalizar) {
      return this.analizarLlamada(id);
    }

    return structuredClone(llamada);
  }

  async analizarLlamada(
    id: string,
    opciones?: { simularDegradado?: boolean },
  ): Promise<Llamada> {
    const llamada = this.llamadas.get(id);
    if (!llamada) throw new ApiClientError('Llamada no encontrada.', 404);
    if (llamada.estado !== 'EN_CURSO') {
      throw new ApiClientError('No se puede analizar una llamada ya derivada o descartada.', 409);
    }

    const latency = 240 + Math.floor(Math.random() * 140);
    await delay(latency);

    const matchedCase = matchDatasetCase(llamada.transcripcionCruda);
    const subName = matchedCase ? DATASET_SUBCATEGORIA_MAP[matchedCase.idRegistro] : undefined;
    const subFromCase = subName ? findSubcategoriaByNombre(subName) : undefined;
    const subcategoria = subFromCase ?? inferSubcategoriaFromText(llamada.transcripcionCruda);

    const freeLoc = extractLocationFromFreeText(llamada.transcripcionCruda);
    const detectedBaseLoc = matchedCase
      ? {
          calle: matchedCase.calleDetectada,
          altura: matchedCase.alturaDetectada,
          interseccion: matchedCase.interseccionDetectada,
          barrioComuna: matchedCase.barrioComuna,
          referencia: null,
        }
      : {
          calle: freeLoc.calle,
          altura: freeLoc.altura,
          interseccion: freeLoc.interseccion,
          barrioComuna: freeLoc.barrioComuna,
          referencia: freeLoc.referencia,
        };

    const detectedLocation: UbicacionNormalizada = {
      ...detectedBaseLoc,
      camposFaltantes: computeCamposFaltantes(detectedBaseLoc),
    };

    const prioridadSugerida =
      matchedCase?.prioridadSugerida ?? inferPrioridad(llamada.transcripcionCruda, subcategoria);

    const checklist = buildChecklistForSubcategoria(
      subcategoria,
      llamada.transcripcionCruda,
      llamada.checklist,
    );
    const instruccionesPreArribo = buildPreArriboForSubcategoria(
      subcategoria,
      llamada.instruccionesPreArribo,
    );

    const confianzaGlobal: NivelCerteza = matchedCase
      ? 'ALTA'
      : detectedLocation.calle
        ? 'MEDIA'
        : 'BAJA';

    const analisis: AnalisisCopiloto = {
      categoriaId: subcategoria.categoriaId,
      subcategoriaId: subcategoria.id,
      descripcionIncidente: matchedCase?.descripcionIncidente ?? subcategoria.etiqueta,
      ubicacion: detectedLocation,
      prioridadSugerida,
      checklist,
      instruccionesPreArribo,
      riesgosDetectados:
        matchedCase?.riesgosDetectados.length
          ? [...matchedCase.riesgosDetectados]
          : ['Evaluar riesgos en el lugar según protocolo vigente'],
      recursosRecomendadosDespacho:
        matchedCase?.recursosRecomendadosDespacho.length
          ? [...matchedCase.recursosRecomendadosDespacho]
          : ['1x Móvil de primera respuesta según tipología'],
      notasOperativasDespacho:
        matchedCase?.notasOperativasDespacho ??
        `Incidente clasificado como ${subcategoria.etiqueta}. Verificar ubicación y condiciones de seguridad en arribo.`,
      confianzaGlobal,
      proveedorUsado: 'mock',
      modeloUsado: 'deterministic-rules-v1',
      latenciaMs: latency,
      degradado: Boolean(opciones?.simularDegradado),
      motivoDegradacion: opciones?.simularDegradado
        ? 'Timeout del proveedor LLM externo; se aplicó el motor determinista local.'
        : null,
    };

    const edited = new Set(llamada.camposEditadosPorOperador);

    if (!edited.has('subcategoriaId')) {
      llamada.categoriaId = analisis.categoriaId;
      llamada.subcategoriaId = analisis.subcategoriaId;
      llamada.checklist = analisis.checklist;
      llamada.instruccionesPreArribo = analisis.instruccionesPreArribo;
    } else if (llamada.subcategoriaId) {
      const currentSub = findSubcategoriaById(llamada.subcategoriaId);
      if (currentSub) {
        llamada.checklist = buildChecklistForSubcategoria(
          currentSub,
          llamada.transcripcionCruda,
          llamada.checklist,
        );
      }
    }

    if (!edited.has('descripcionIncidente')) {
      llamada.descripcionIncidente = analisis.descripcionIncidente;
    }
    if (!edited.has('prioridad')) {
      llamada.prioridad = analisis.prioridadSugerida;
    }

    const mergedLoc = {
      calle: edited.has('ubicacion.calle') ? llamada.ubicacion.calle : analisis.ubicacion.calle,
      altura: edited.has('ubicacion.altura') ? llamada.ubicacion.altura : analisis.ubicacion.altura,
      interseccion: edited.has('ubicacion.interseccion')
        ? llamada.ubicacion.interseccion
        : analisis.ubicacion.interseccion,
      barrioComuna: edited.has('ubicacion.barrioComuna')
        ? llamada.ubicacion.barrioComuna
        : analisis.ubicacion.barrioComuna,
      referencia: edited.has('ubicacion.referencia')
        ? llamada.ubicacion.referencia
        : analisis.ubicacion.referencia,
    };
    llamada.ubicacion = {
      ...mergedLoc,
      camposFaltantes: computeCamposFaltantes(mergedLoc),
    };

    if (!edited.has('riesgosDetectados')) {
      llamada.riesgosDetectados = [...analisis.riesgosDetectados];
    }
    if (!edited.has('recursosRecomendadosDespacho')) {
      llamada.recursosRecomendadosDespacho = [...analisis.recursosRecomendadosDespacho];
    }
    if (!edited.has('notasOperativasDespacho')) {
      llamada.notasOperativasDespacho = analisis.notasOperativasDespacho;
    }

    llamada.ultimoAnalisis = analisis;
    llamada.turnos = parseTurnosFromTranscripcion(llamada.transcripcionCruda);
    llamada.actualizadaEn = new Date().toISOString();

    return structuredClone(llamada);
  }

  async patchLlamada(id: string, payload: PatchLlamadaPayload): Promise<Llamada> {
    const llamada = this.llamadas.get(id);
    if (!llamada) throw new ApiClientError('Llamada no encontrada.', 404);
    if (llamada.estado !== 'EN_CURSO') {
      throw new ApiClientError('No se puede editar una llamada ya cerrada.', 409);
    }

    const edited = new Set(llamada.camposEditadosPorOperador);

    if (payload.transcripcionCruda !== undefined) {
      llamada.transcripcionCruda = payload.transcripcionCruda;
      llamada.turnos = parseTurnosFromTranscripcion(payload.transcripcionCruda);
    }

    if (payload.ubicacion) {
      const fields = ['calle', 'altura', 'interseccion', 'barrioComuna', 'referencia'] as const;
      const nextBase = {
        calle: llamada.ubicacion.calle,
        altura: llamada.ubicacion.altura,
        interseccion: llamada.ubicacion.interseccion,
        barrioComuna: llamada.ubicacion.barrioComuna,
        referencia: llamada.ubicacion.referencia,
      };
      for (const field of fields) {
        if (payload.ubicacion[field] !== undefined) {
          const val = payload.ubicacion[field];
          nextBase[field] = val && val.trim() ? val.trim() : null;
          edited.add(`ubicacion.${field}`);
        }
      }
      llamada.ubicacion = {
        ...nextBase,
        camposFaltantes: computeCamposFaltantes(nextBase),
      };
    }

    if (payload.subcategoriaId !== undefined && payload.subcategoriaId !== null) {
      const sub = findSubcategoriaById(payload.subcategoriaId);
      if (!sub) throw new ApiClientError('Subcategoría inexistente en catálogo.', 400);
      const changed = llamada.subcategoriaId !== sub.id;
      llamada.subcategoriaId = sub.id;
      llamada.categoriaId = sub.categoriaId;
      edited.add('categoriaId');
      edited.add('subcategoriaId');
      if (changed) {
        const preservedUniversal = llamada.checklist.filter((c) => c.esUniversal);
        llamada.checklist = buildChecklistForSubcategoria(
          sub,
          llamada.transcripcionCruda,
          preservedUniversal,
        );
        llamada.instruccionesPreArribo = buildPreArriboForSubcategoria(sub, []);
      }
    } else if (payload.categoriaId !== undefined) {
      llamada.categoriaId = payload.categoriaId;
      edited.add('categoriaId');
    }

    if (payload.descripcionIncidente !== undefined) {
      llamada.descripcionIncidente = payload.descripcionIncidente;
      edited.add('descripcionIncidente');
    }

    if (payload.prioridad !== undefined) {
      llamada.prioridad = payload.prioridad;
      edited.add('prioridad');
    }

    if (payload.checklist) {
      const updates = new Map(payload.checklist.map((u) => [u.preguntaId, u]));
      llamada.checklist = llamada.checklist.map((item) => {
        const upd = updates.get(item.preguntaId);
        if (!upd) return item;
        return {
          ...item,
          estadoOperador: upd.estadoOperador,
          notaOperador: upd.notaOperador !== undefined ? upd.notaOperador : item.notaOperador,
        };
      });
    }

    if (payload.instruccionesPreArribo) {
      const updates = new Map(
        payload.instruccionesPreArribo.map((u) => [u.instruccionId, u.transmitida]),
      );
      llamada.instruccionesPreArribo = llamada.instruccionesPreArribo.map((ins) => {
        const nextVal = updates.get(ins.instruccionId);
        return nextVal === undefined ? ins : { ...ins, transmitida: nextVal };
      });
    }

    if (payload.riesgosDetectados !== undefined) {
      llamada.riesgosDetectados = payload.riesgosDetectados;
      edited.add('riesgosDetectados');
    }

    if (payload.recursosRecomendadosDespacho !== undefined) {
      llamada.recursosRecomendadosDespacho = payload.recursosRecomendadosDespacho;
      edited.add('recursosRecomendadosDespacho');
    }

    if (payload.notasOperativasDespacho !== undefined) {
      llamada.notasOperativasDespacho = payload.notasOperativasDespacho;
      edited.add('notasOperativasDespacho');
    }

    llamada.camposEditadosPorOperador = Array.from(edited);
    llamada.actualizadaEn = new Date().toISOString();

    return structuredClone(llamada);
  }

  async derivarLlamada(
    id: string,
    payload?: DerivarLlamadaPayload,
  ): Promise<DerivarLlamadaResponse> {
    const llamada = this.llamadas.get(id);
    if (!llamada) throw new ApiClientError('Llamada no encontrada.', 404);
    if (llamada.estado !== 'EN_CURSO') {
      throw new ApiClientError('La llamada ya fue derivada o descartada.', 409);
    }

    const notas =
      payload?.notasOperativasDespacho !== undefined
        ? payload.notasOperativasDespacho.trim()
        : llamada.notasOperativasDespacho.trim();

    const missing: string[] = [];
    if (!llamada.categoriaId) missing.push('Categoría');
    if (!llamada.subcategoriaId) missing.push('Subcategoría');
    if (!llamada.prioridad) missing.push('Prioridad (P1-P4)');
    if (
      !llamada.ubicacion.calle?.trim() &&
      !llamada.ubicacion.interseccion?.trim() &&
      !llamada.ubicacion.referencia?.trim()
    ) {
      missing.push('Ubicación mínima (calle, intersección o referencia)');
    }
    if (!notas) missing.push('Notas operativas para despacho');

    if (missing.length > 0) {
      throw new ApiClientError(
        `Faltan campos mínimos obligatorios: ${missing.join(', ')}.`,
        400,
        { missing },
      );
    }

    const now = new Date().toISOString();
    llamada.notasOperativasDespacho = notas;
    llamada.estado = 'DERIVADA';
    llamada.actualizadaEn = now;

    const cartaDespacho: CartaDespacho = {
      id: makeUuid('CAD'),
      llamadaId: llamada.id,
      origenReporte: llamada.origenReporte,
      categoriaId: llamada.categoriaId!,
      subcategoriaId: llamada.subcategoriaId!,
      descripcionIncidente:
        llamada.descripcionIncidente.trim() ||
        findSubcategoriaById(llamada.subcategoriaId!)?.etiqueta ||
        'Incidente derivado',
      prioridad: llamada.prioridad!,
      ubicacion: structuredClone(llamada.ubicacion),
      riesgosDetectados: [...llamada.riesgosDetectados],
      recursosRecomendadosDespacho: [...llamada.recursosRecomendadosDespacho],
      notasOperativasDespacho: notas,
      derivadaEn: now,
    };

    llamada.cartaDespacho = cartaDespacho;
    this.cartasDespacho.unshift(cartaDespacho);

    return {
      llamada: structuredClone(llamada),
      cartaDespacho: structuredClone(cartaDespacho),
    };
  }

  async descartarLlamada(id: string): Promise<Llamada> {
    const llamada = this.llamadas.get(id);
    if (!llamada) throw new ApiClientError('Llamada no encontrada.', 404);
    if (llamada.estado !== 'EN_CURSO') {
      throw new ApiClientError('Solo se pueden descartar llamadas en curso.', 409);
    }
    llamada.estado = 'DESCARTADA';
    llamada.actualizadaEn = new Date().toISOString();
    return structuredClone(llamada);
  }

  async listCartasDespacho(filters?: ListCartasDespachoFilters): Promise<CartaDespacho[]> {
    const filtered = this.cartasDespacho.filter((carta) => {
      if (filters?.prioridad && carta.prioridad !== filters.prioridad) return false;
      if (filters?.categoriaId && carta.categoriaId !== filters.categoriaId) return false;
      return true;
    });
    return structuredClone(filtered.sort((a, b) => b.derivadaEn.localeCompare(a.derivadaEn)));
  }

  async getCartaDespacho(id: string): Promise<CartaDespacho> {
    const found = this.cartasDespacho.find((c) => c.id === id);
    if (!found) throw new ApiClientError('Carta de despacho no encontrada.', 404);
    return structuredClone(found);
  }
}

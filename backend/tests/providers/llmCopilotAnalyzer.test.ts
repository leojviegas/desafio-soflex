import { RetryError, type LanguageModel } from 'ai';
import { describe, expect, it } from 'vitest';
import { resolveDatasetCsvPath } from '../../src/config/env.js';
import {
  EstadoPreguntaIA,
  OrigenReporte,
  PrioridadIncidente,
  ProveedorIA,
} from '../../src/domain/index.js';
import {
  AiProviderUnavailableError,
  CsvFewShotRetriever,
  LlmCopilotAnalyzer,
  MOCK_MODEL_NAME,
  MockCopilotAnalyzer,
  type GenerateStructuredObjectFn,
} from '../../src/providers/ai/index.js';
import {
  CsvDatasetReferenciaRepository,
  openSqliteDatabase,
  seedCatalogoProtocolos,
  SqliteProtocoloRepository,
} from '../../src/repositories/index.js';
import type { LlmCopilotOutput } from '../../src/schemas/index.js';

const DUMMY_MODEL = {} as LanguageModel;
const SILENT_LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function setupRepos() {
  const db = openSqliteDatabase(':memory:');
  seedCatalogoProtocolos(db);
  const protocoloRepository = new SqliteProtocoloRepository(db);
  const datasetRepository = CsvDatasetReferenciaRepository.fromFile(
    resolveDatasetCsvPath(),
  );
  const fewShotRetriever = new CsvFewShotRetriever(datasetRepository);
  const mockFallback = new MockCopilotAnalyzer(protocoloRepository);
  return { db, protocoloRepository, fewShotRetriever, mockFallback };
}

describe('providers/ai/LlmCopilotAnalyzer', () => {
  it('ejecuta flujo exitoso y aplica el Paso 4 determinista (citas, pendientes por resta, pre-arribo y cruce de IDs)', async () => {
    const { db, protocoloRepository, fewShotRetriever, mockFallback } =
      setupRepos();
    const subIncendio = await protocoloRepository.findSubcategoriaByNombre(
      'incendio_estructural',
    );
    const preguntas = await protocoloRepository.findPreguntasParaSubcategoria(
      subIncendio!.id,
    );
    const pregAtrapadas = preguntas.find((p) =>
      p.texto.includes('personas atrapadas'),
    )!;

    const transcripcion =
      'Operador: 911 emergencias. Llamante: Hay fuego en Av. Corrientes 1540 y adentro quedó el cocinero.';

    const fakeOutput: LlmCopilotOutput = {
      // Categoría incorrecta intencional: el backend debe derivar categoriaId desde subcategoria.categoriaId
      categoriaId: 99,
      subcategoriaId: subIncendio!.id,
      descripcionIncidente: 'Incendio en cocina comercial',
      ubicacion: {
        calle: 'Av. Corrientes',
        altura: '1540',
        interseccion: null,
        barrioComuna: null,
        referencia: null,
      },
      prioridadSugerida: 'P1',
      preguntasDetectadas: [
        {
          preguntaId: pregAtrapadas.id,
          estado: 'RESPONDIDA',
          respuestaExtraida: 'El cocinero quedó adentro.',
          citaEvidencia: 'adentro quedó el cocinero',
        },
        {
          // Cita alucinada: no existe en transcripción -> debe degradarse a AMBIGUA con evidenciaVerificada=false
          preguntaId: 1,
          estado: 'RESPONDIDA',
          respuestaExtraida: 'Dirección exacta inventada',
          citaEvidencia: 'en la esquina de Florida y Lavalle',
        },
        {
          // ID inexistente en este protocolo -> debe descartarse
          preguntaId: 9999,
          estado: 'RESPONDIDA',
          respuestaExtraida: 'Irrelevante',
          citaEvidencia: 'Hay fuego',
        },
      ],
      riesgosDetectados: ['Humo denso', 'Persona atrapada'],
      notasOperativasDespacho: 'Fuego en cocina sobre Av. Corrientes 1540.',
      recursosRecomendadosDespacho: ['1x Autobomba', '1x Unidad de Rescate'],
      confianzaGlobal: 'ALTA',
    };

    const fakeGenerate: GenerateStructuredObjectFn = async () => ({
      object: fakeOutput,
      usage: { inputTokens: 420, outputTokens: 160, totalTokens: 580 },
    });

    const analyzer = new LlmCopilotAnalyzer({
      model: DUMMY_MODEL,
      provider: ProveedorIA.GEMINI,
      modelId: 'gemini-2.5-flash',
      protocoloRepository,
      fewShotRetriever,
      mockFallback,
      generateStructuredObject: fakeGenerate,
      logger: SILENT_LOGGER,
    });

    const resultado = await analyzer.analyze({
      transcripcionCruda: transcripcion,
      origenReporte: OrigenReporte.TELEFONIA_911,
    });

    expect(resultado.proveedorUsado).toBe(ProveedorIA.GEMINI);
    expect(resultado.modeloUsado).toBe('gemini-2.5-flash');
    expect(resultado.degradado).toBe(false);
    expect(resultado.categoriaId).toBe(subIncendio!.categoriaId);
    expect(resultado.subcategoriaId).toBe(subIncendio!.id);
    expect(resultado.ubicacion.camposFaltantes).toEqual([
      'interseccion',
      'barrioComuna',
    ]);
    expect(resultado.instruccionesPreArribo.length).toBeGreaterThan(0);

    // ID 9999 descartado; preguntas oficiales completas presentes
    expect(resultado.checklist.some((i) => i.preguntaId === 9999)).toBe(false);
    expect(resultado.checklist).toHaveLength(preguntas.length);

    const itemAtrapadas = resultado.checklist.find(
      (i) => i.preguntaId === pregAtrapadas.id,
    )!;
    expect(itemAtrapadas.estadoIA).toBe(EstadoPreguntaIA.RESPONDIDA);
    expect(itemAtrapadas.evidenciaVerificada).toBe(true);

    const itemDireccion = resultado.checklist.find((i) => i.preguntaId === 1)!;
    expect(itemDireccion.estadoIA).toBe(EstadoPreguntaIA.AMBIGUA);
    expect(itemDireccion.evidenciaVerificada).toBe(false);

    const itemsPendientes = resultado.checklist.filter(
      (i) => i.estadoIA === EstadoPreguntaIA.PENDIENTE,
    );
    expect(itemsPendientes.length).toBe(preguntas.length - 2);

    db.close();
  });

  it('hace fallback seguro a general_otro si el LLM devuelve un subcategoriaId inexistente', async () => {
    const { db, protocoloRepository, fewShotRetriever, mockFallback } =
      setupRepos();
    const subGeneral =
      await protocoloRepository.findSubcategoriaByNombre('general_otro');

    const fakeGenerate: GenerateStructuredObjectFn = async () => ({
      object: {
        categoriaId: 888,
        subcategoriaId: 9999,
        descripcionIncidente: 'Incidente no catalogado',
        ubicacion: {
          calle: null,
          altura: null,
          interseccion: null,
          barrioComuna: null,
          referencia: null,
        },
        prioridadSugerida: 'P3',
        preguntasDetectadas: [],
        riesgosDetectados: [],
        notasOperativasDespacho: 'Verificar situación.',
        recursosRecomendadosDespacho: [],
        confianzaGlobal: 'BAJA',
      },
    });

    const analyzer = new LlmCopilotAnalyzer({
      model: DUMMY_MODEL,
      provider: ProveedorIA.OPENAI,
      modelId: 'gpt-4o-mini',
      protocoloRepository,
      fewShotRetriever,
      mockFallback,
      generateStructuredObject: fakeGenerate,
      logger: SILENT_LOGGER,
    });

    const resultado = await analyzer.analyze({
      transcripcionCruda: 'Llamante: Quiero hacer una consulta.',
    });

    expect(resultado.subcategoriaId).toBe(subGeneral!.id);
    expect(resultado.categoriaId).toBe(subGeneral!.categoriaId);
    expect(resultado.prioridadSugerida).toBe(PrioridadIncidente.P3);

    db.close();
  });

  it('degrada a MockCopilotAnalyzer sanitizando credenciales ante fallo de red/timeout cuando fallbackToMock=true', async () => {
    const { db, protocoloRepository, fewShotRetriever, mockFallback } =
      setupRepos();

    const failingGenerate: GenerateStructuredObjectFn = async () => {
      throw new RetryError({
        message:
          'Request failed to https://generativelanguage.googleapis.com/v1?key=AIzaSySecretTestKey1234567890',
        reason: 'maxRetriesExceeded',
        errors: [new Error('timeout')],
      });
    };

    const analyzer = new LlmCopilotAnalyzer({
      model: DUMMY_MODEL,
      provider: ProveedorIA.GEMINI,
      modelId: 'gemini-2.5-flash',
      protocoloRepository,
      fewShotRetriever,
      mockFallback,
      fallbackToMock: true,
      generateStructuredObject: failingGenerate,
      logger: SILENT_LOGGER,
    });

    const resultado = await analyzer.analyze({
      transcripcionCruda: 'Llamante: Choque de moto en Av. San Juan y Entre Ríos.',
    });

    expect(resultado.degradado).toBe(true);
    expect(resultado.proveedorUsado).toBe(ProveedorIA.MOCK);
    expect(resultado.modeloUsado).toBe(MOCK_MODEL_NAME);
    expect(resultado.motivoDegradacion).toContain('gemini/gemini-2.5-flash');
    expect(resultado.motivoDegradacion).not.toContain('AIzaSySecretTestKey');
    expect(resultado.motivoDegradacion).toContain('[REDACTED]');

    db.close();
  });

  it('lanza AiProviderUnavailableError cuando el proveedor falla y fallbackToMock=false', async () => {
    const { db, protocoloRepository, fewShotRetriever, mockFallback } =
      setupRepos();

    const failingGenerate: GenerateStructuredObjectFn = async () => {
      throw new Error('Service unavailable 503');
    };

    const analyzer = new LlmCopilotAnalyzer({
      model: DUMMY_MODEL,
      provider: ProveedorIA.OLLAMA,
      modelId: 'qwen2.5:7b',
      protocoloRepository,
      fewShotRetriever,
      mockFallback,
      fallbackToMock: false,
      generateStructuredObject: failingGenerate,
      logger: SILENT_LOGGER,
    });

    await expect(
      analyzer.analyze({
        transcripcionCruda: 'Llamante: Fuego en contenedor.',
      }),
    ).rejects.toThrow(AiProviderUnavailableError);

    db.close();
  });
});

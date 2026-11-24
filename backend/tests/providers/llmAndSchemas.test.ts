import { describe, expect, it } from 'vitest';
import { parseEnv, resolveDatasetCsvPath } from '../../src/config/env.js';
import { ProveedorIA } from '../../src/domain/index.js';
import {
  AiProviderConfigError,
  buildCopilotAnalyzer,
  buildLanguageModel,
  LlmCopilotAnalyzer,
  MOCK_MODEL_NAME,
  MockCopilotAnalyzer,
  resolveModelName,
} from '../../src/providers/ai/index.js';
import {
  CsvDatasetReferenciaRepository,
  openSqliteDatabase,
  seedCatalogoProtocolos,
  SqliteProtocoloRepository,
} from '../../src/repositories/index.js';
import { LlmCopilotOutputSchema } from '../../src/schemas/index.js';

describe('schemas/copilotOutputSchemas', () => {
  const validPayload = {
    categoriaId: 1,
    subcategoriaId: 1,
    descripcionIncidente: 'Incendio en cocina de pizzería',
    ubicacion: {
      calle: 'Av. Corrientes',
      altura: '1540',
      interseccion: 'Montevideo',
      barrioComuna: null,
      referencia: 'Pizzería',
    },
    prioridadSugerida: 'P1',
    preguntasDetectadas: [
      {
        preguntaId: 3,
        estado: 'RESPONDIDA',
        respuestaExtraida: 'El cocinero quedó adentro.',
        citaEvidencia: 'adentro quedó el cocinero',
      },
    ],
    riesgosDetectados: ['Grasa inflamada', 'Persona atrapada'],
    notasOperativasDespacho: 'Incendio en cocina con posible atrapado.',
    recursosRecomendadosDespacho: ['1x Autobomba', '1x Ambulancia SAME'],
    confianzaGlobal: 'ALTA',
  };

  it('valida una salida estructurada completa del LLM con campos nullable', () => {
    const parsed = LlmCopilotOutputSchema.parse(validPayload);
    expect(parsed.ubicacion.barrioComuna).toBeNull();
    expect(parsed.preguntasDetectadas).toHaveLength(1);
  });

  it('rechaza preguntas con estado PENDIENTE, preguntaId inválido o campos faltantes', () => {
    expect(() =>
      LlmCopilotOutputSchema.parse({
        ...validPayload,
        preguntasDetectadas: [
          {
            preguntaId: 3,
            estado: 'PENDIENTE',
            respuestaExtraida: 'N/A',
            citaEvidencia: 'N/A',
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      LlmCopilotOutputSchema.parse({
        ...validPayload,
        preguntasDetectadas: [
          {
            preguntaId: 0,
            estado: 'RESPONDIDA',
            respuestaExtraida: 'Sí',
            citaEvidencia: 'texto',
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      LlmCopilotOutputSchema.parse({
        ...validPayload,
        ubicacion: {
          calle: 'Av. Corrientes',
        },
      }),
    ).toThrow();
  });
});

describe('providers/ai/llm & buildCopilotAnalyzer', () => {
  it('resuelve los modelos por defecto y personalizados para cada proveedor', () => {
    expect(resolveModelName({ provider: 'mock' })).toBe(MOCK_MODEL_NAME);
    expect(resolveModelName({ provider: 'gemini' })).toBe('gemini-2.5-flash');
    expect(resolveModelName({ provider: 'ollama' })).toBe('qwen2.5:7b');
    expect(resolveModelName({ provider: 'openai' })).toBe('gpt-4o-mini');
    expect(resolveModelName({ provider: 'openai-compatible' })).toBe(
      'Qwen/Qwen2.5-7B-Instruct',
    );
    expect(
      resolveModelName({ provider: 'gemini', model: 'gemini-2.5-pro' }),
    ).toBe('gemini-2.5-pro');
  });

  it('construye LanguageModel para gemini, ollama, openai y openai-compatible y valida credenciales', () => {
    const baseCfg = parseEnv({}).llm;

    const gemini = buildLanguageModel({
      ...baseCfg,
      provider: 'gemini',
      geminiApiKey: 'fake-gemini-key',
    });
    expect(gemini.provider).toBe(ProveedorIA.GEMINI);
    expect(gemini.modelId).toBe('gemini-2.5-flash');

    const ollama = buildLanguageModel({
      ...baseCfg,
      provider: 'ollama',
    });
    expect(ollama.provider).toBe(ProveedorIA.OLLAMA);
    expect(ollama.modelId).toBe('qwen2.5:7b');

    const openai = buildLanguageModel({
      ...baseCfg,
      provider: 'openai',
      openaiApiKey: 'fake-openai-key',
    });
    expect(openai.provider).toBe(ProveedorIA.OPENAI);

    const compatible = buildLanguageModel({
      ...baseCfg,
      provider: 'openai-compatible',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'fake-groq-key',
    });
    expect(compatible.provider).toBe(ProveedorIA.OPENAI_COMPATIBLE);

    expect(() =>
      buildLanguageModel({ ...baseCfg, provider: 'gemini' }),
    ).toThrow(AiProviderConfigError);
    expect(() =>
      buildLanguageModel({ ...baseCfg, provider: 'openai' }),
    ).toThrow(AiProviderConfigError);
    expect(() =>
      buildLanguageModel({ ...baseCfg, provider: 'openai-compatible' }),
    ).toThrow(AiProviderConfigError);
    expect(() =>
      buildLanguageModel({ ...baseCfg, provider: 'mock' }),
    ).toThrow(AiProviderConfigError);
  });

  it('buildCopilotAnalyzer selecciona mock, modo real o degradación controlada ante falta de clave', async () => {
    const db = openSqliteDatabase(':memory:');
    seedCatalogoProtocolos(db);
    const protocoloRepository = new SqliteProtocoloRepository(db);
    const datasetRepository = CsvDatasetReferenciaRepository.fromFile(
      resolveDatasetCsvPath(),
    );
    const baseCfg = parseEnv({}).llm;

    const mockAnalyzer = buildCopilotAnalyzer({
      llmConfig: baseCfg,
      protocoloRepository,
      datasetRepository,
    });
    expect(mockAnalyzer).toBeInstanceOf(MockCopilotAnalyzer);
    expect(mockAnalyzer.getMetadata().provider).toBe(ProveedorIA.MOCK);

    const realAnalyzer = buildCopilotAnalyzer({
      llmConfig: {
        ...baseCfg,
        provider: 'gemini',
        geminiApiKey: 'fake-key-for-test',
      },
      protocoloRepository,
      datasetRepository,
    });
    expect(realAnalyzer).toBeInstanceOf(LlmCopilotAnalyzer);
    expect(realAnalyzer.getMetadata().provider).toBe(ProveedorIA.GEMINI);

    const silentLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    const degradedFallback = buildCopilotAnalyzer({
      llmConfig: {
        ...baseCfg,
        provider: 'gemini',
        fallbackToMock: true,
      },
      protocoloRepository,
      datasetRepository,
      logger: silentLogger,
    });
    expect(degradedFallback).toBeInstanceOf(MockCopilotAnalyzer);
    const analisisDegradado = await degradedFallback.analyze({
      transcripcionCruda: 'Llamante: Fuego en cocina de Av. Corrientes 1540.',
    });
    expect(analisisDegradado.degradado).toBe(true);
    expect(analisisDegradado.motivoDegradacion).toContain('Configuración incompleta');

    expect(() =>
      buildCopilotAnalyzer({
        llmConfig: {
          ...baseCfg,
          provider: 'gemini',
          fallbackToMock: false,
        },
        protocoloRepository,
        datasetRepository,
        logger: silentLogger,
      }),
    ).toThrow(AiProviderConfigError);

    db.close();
  });
});

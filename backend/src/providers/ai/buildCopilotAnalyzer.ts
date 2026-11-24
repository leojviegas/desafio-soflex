import type { LlmConfig } from '../../config/env.js';
import { ProveedorIA } from '../../domain/index.js';
import type {
  DatasetReferenciaRepository,
  ProtocoloRepository,
} from '../../repositories/index.js';
import type { CopilotAnalyzerProvider } from './copilotAnalyzerProvider.js';
import { CsvFewShotRetriever } from './csvFewShotRetriever.js';
import {
  AiProviderConfigError,
  sanitizarMensajeErrorIA,
} from './errors/AiProviderError.js';
import { buildLanguageModel } from './llm.js';
import { LlmCopilotAnalyzer } from './llmCopilotAnalyzer.js';
import { MockCopilotAnalyzer } from './mockCopilotAnalyzer.js';

export interface BuildCopilotAnalyzerParams {
  llmConfig: LlmConfig;
  protocoloRepository: ProtocoloRepository;
  datasetRepository: DatasetReferenciaRepository;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

/**
 * Factory de Nivel 1: selecciona `MockCopilotAnalyzer` o `LlmCopilotAnalyzer`
 * con degradación controlada si faltan credenciales y `fallbackToMock=true`.
 */
export function buildCopilotAnalyzer({
  llmConfig,
  protocoloRepository,
  datasetRepository,
  logger = console,
}: BuildCopilotAnalyzerParams): CopilotAnalyzerProvider {
  const mockAnalyzer = new MockCopilotAnalyzer(protocoloRepository);

  if (llmConfig.provider === ProveedorIA.MOCK) {
    return mockAnalyzer;
  }

  try {
    const { model, modelId, provider } = buildLanguageModel(llmConfig);
    const fewShotRetriever = new CsvFewShotRetriever(datasetRepository);

    return new LlmCopilotAnalyzer({
      model,
      provider,
      modelId,
      protocoloRepository,
      fewShotRetriever,
      mockFallback: mockAnalyzer,
      temperature: llmConfig.temperature,
      timeoutMs: llmConfig.timeoutMs,
      fallbackToMock: llmConfig.fallbackToMock,
      logger,
    });
  } catch (error) {
    if (error instanceof AiProviderConfigError && llmConfig.fallbackToMock) {
      const motivo = sanitizarMensajeErrorIA(error);
      logger.warn(
        `[ai-copilot] Configuración incompleta para ${llmConfig.provider}; operando en modo mock degradado: ${motivo}`,
      );
      return new MockCopilotAnalyzer(protocoloRepository, {
        defaultDegradado: true,
        defaultMotivoDegradacion: `Configuración incompleta para ${llmConfig.provider}: ${motivo}. Operando con fallback determinista.`,
      });
    }
    throw error;
  }
}

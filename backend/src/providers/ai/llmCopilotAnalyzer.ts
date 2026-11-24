import { generateObject, type LanguageModel } from 'ai';
import {
  AnalisisCopiloto,
  MetadatosEjecucionIA,
  type ProveedorIA,
} from '../../domain/index.js';
import type { ProtocoloRepository } from '../../repositories/index.js';
import {
  LlmCopilotOutputSchema,
  type LlmCopilotOutput,
} from '../../schemas/index.js';
import type {
  AnalyzeCallInput,
  CopilotAnalyzerMetadata,
  CopilotAnalyzerProvider,
} from './copilotAnalyzerProvider.js';
import { consolidarSalidaCopiloto } from './copilotPostProcessor.js';
import type { CsvFewShotRetriever } from './csvFewShotRetriever.js';
import {
  AiProviderUnavailableError,
  sanitizarMensajeErrorIA,
} from './errors/AiProviderError.js';
import type { MockCopilotAnalyzer } from './mockCopilotAnalyzer.js';
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder.js';

export interface StructuredObjectUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export type GenerateStructuredObjectFn = (params: {
  model: LanguageModel;
  schema: typeof LlmCopilotOutputSchema;
  system: string;
  prompt: string;
  temperature: number;
  abortSignal: AbortSignal;
}) => Promise<{
  object: LlmCopilotOutput;
  usage?: StructuredObjectUsage;
}>;

export interface LlmCopilotAnalyzerOptions {
  model: LanguageModel;
  provider: Exclude<ProveedorIA, 'mock'>;
  modelId: string;
  protocoloRepository: ProtocoloRepository;
  fewShotRetriever: CsvFewShotRetriever;
  mockFallback?: MockCopilotAnalyzer;
  temperature?: number;
  timeoutMs?: number;
  fallbackToMock?: boolean;
  generateStructuredObject?: GenerateStructuredObjectFn;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

/**
 * Analizador real basado en Vercel AI SDK (`generateObject` + Zod) con prompt
 * construido desde SQLite + few-shot sobre CSV + Paso 4 determinista anti-alucinación.
 */
export class LlmCopilotAnalyzer implements CopilotAnalyzerProvider {
  private readonly model: LanguageModel;
  private readonly provider: Exclude<ProveedorIA, 'mock'>;
  private readonly modelId: string;
  private readonly protocoloRepository: ProtocoloRepository;
  private readonly fewShotRetriever: CsvFewShotRetriever;
  private readonly mockFallback?: MockCopilotAnalyzer;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly fallbackToMock: boolean;
  private readonly generateStructuredObject: GenerateStructuredObjectFn;
  private readonly logger: Pick<Console, 'info' | 'warn' | 'error'>;

  constructor(options: LlmCopilotAnalyzerOptions) {
    this.model = options.model;
    this.provider = options.provider;
    this.modelId = options.modelId;
    this.protocoloRepository = options.protocoloRepository;
    this.fewShotRetriever = options.fewShotRetriever;
    this.mockFallback = options.mockFallback;
    this.temperature = options.temperature ?? 0.1;
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.fallbackToMock = options.fallbackToMock ?? true;
    this.generateStructuredObject =
      options.generateStructuredObject ??
      ((params) =>
        generateObject({
          model: params.model,
          schema: params.schema,
          system: params.system,
          prompt: params.prompt,
          temperature: params.temperature,
          abortSignal: params.abortSignal,
        }));
    this.logger = options.logger ?? console;
  }

  getMetadata(): CopilotAnalyzerMetadata {
    return {
      provider: this.provider,
      model: this.modelId,
      fallbackEnabled: this.fallbackToMock,
    };
  }

  async analyze(input: AnalyzeCallInput): Promise<AnalisisCopiloto> {
    if (input.simularDegradado) {
      return this.ejecutarFallbackOError(
        input,
        new Error('Simulación de degradación solicitada en modo real.'),
      );
    }

    const startedAt = Date.now();
    try {
      const resumenCatalogo =
        await this.protocoloRepository.obtenerResumenParaPrompt();
      const ejemplosFewShot = this.fewShotRetriever
        .recuperarEjemplosSimilares(input.transcripcionCruda, 2)
        .map((r) => r.caso);

      const system = buildSystemPrompt(resumenCatalogo);
      const prompt = buildUserPrompt({
        transcripcionCruda: input.transcripcionCruda,
        origenReporte: input.origenReporte,
        ejemplosFewShot,
        subcategoriaIdFijadaPorOperador: input.subcategoriaIdFijadaPorOperador,
      });

      const { object, usage } = await this.generateStructuredObject({
        model: this.model,
        schema: LlmCopilotOutputSchema,
        system,
        prompt,
        temperature: this.temperature,
        abortSignal: AbortSignal.timeout(this.timeoutMs),
      });

      const latenciaMs = Math.max(1, Date.now() - startedAt);
      this.logger.info(
        `[ai-copilot] provider=${this.provider} model=${this.modelId} latenciaMs=${latenciaMs} in=${usage?.inputTokens ?? 'n/a'} out=${usage?.outputTokens ?? 'n/a'}`,
      );

      const metadatos = new MetadatosEjecucionIA({
        proveedorUsado: this.provider,
        modeloUsado: this.modelId,
        latenciaMs,
        degradado: false,
        motivoDegradacion: null,
      });

      return await consolidarSalidaCopiloto({
        rawOutput: object,
        transcripcionCruda: input.transcripcionCruda,
        protocoloRepository: this.protocoloRepository,
        metadatos,
        subcategoriaIdFijadaPorOperador: input.subcategoriaIdFijadaPorOperador,
      });
    } catch (error) {
      return this.ejecutarFallbackOError(input, error);
    }
  }

  private async ejecutarFallbackOError(
    input: AnalyzeCallInput,
    error: unknown,
  ): Promise<AnalisisCopiloto> {
    const motivoSanitizado = sanitizarMensajeErrorIA(error);

    if (this.fallbackToMock && this.mockFallback) {
      this.logger.warn(
        `[ai-copilot] Degradando a mock tras fallo en provider=${this.provider} model=${this.modelId}: ${motivoSanitizado}`,
      );
      return this.mockFallback.analyzeWithMetadata(input, {
        degradado: true,
        motivoDegradacion: `Fallo en proveedor real (${this.provider}/${this.modelId}): ${motivoSanitizado}. Se aplicó fallback determinista.`,
      });
    }

    this.logger.error(
      `[ai-copilot] Error sin fallback en provider=${this.provider} model=${this.modelId}: ${motivoSanitizado}`,
    );
    throw new AiProviderUnavailableError(
      `El proveedor de IA (${this.provider}/${this.modelId}) no está disponible: ${motivoSanitizado}`,
      { provider: this.provider, model: this.modelId },
      { cause: error },
    );
  }
}

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import type { LlmConfig } from '../../config/env.js';
import { ProveedorIA } from '../../domain/index.js';
import { AiProviderConfigError } from './errors/AiProviderError.js';

export const MOCK_MODEL_NAME = 'deterministic-rules-v1';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/api';

export interface BuiltLanguageModel {
  model: LanguageModel;
  modelId: string;
  provider: Exclude<ProveedorIA, 'mock'>;
}

/**
 * Resuelve el identificador de modelo efectivo según la configuración o los defaults por proveedor.
 */
export function resolveModelName(
  cfg: Pick<LlmConfig, 'provider' | 'model'>,
): string {
  const configured = cfg.model?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }

  switch (cfg.provider) {
    case ProveedorIA.MOCK:
      return MOCK_MODEL_NAME;
    case ProveedorIA.GEMINI:
      return 'gemini-2.5-flash';
    case ProveedorIA.OLLAMA:
      return 'qwen2.5:7b';
    case ProveedorIA.OPENAI:
      return 'gpt-4o-mini';
    case ProveedorIA.OPENAI_COMPATIBLE:
      return 'Qwen/Qwen2.5-7B-Instruct';
  }
}

/**
 * Construye el `LanguageModel` unificado del Vercel AI SDK para el proveedor configurado.
 */
export function buildLanguageModel(cfg: LlmConfig): BuiltLanguageModel {
  const modelId = resolveModelName(cfg);

  switch (cfg.provider) {
    case ProveedorIA.MOCK:
      throw new AiProviderConfigError(
        'No se puede instanciar un LanguageModel externo cuando LLM_PROVIDER=mock.',
        { provider: cfg.provider },
      );

    case ProveedorIA.GEMINI: {
      const apiKey = cfg.geminiApiKey ?? cfg.apiKey;
      if (!apiKey) {
        throw new AiProviderConfigError(
          'Falta GEMINI_API_KEY (o LLM_API_KEY) para operar con LLM_PROVIDER=gemini.',
          { provider: cfg.provider },
        );
      }
      const google = createGoogleGenerativeAI({
        apiKey,
        ...(cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
      });
      return {
        model: google(modelId),
        modelId,
        provider: ProveedorIA.GEMINI,
      };
    }

    case ProveedorIA.OLLAMA: {
      const ollama = createOllama({
        baseURL: cfg.baseUrl ?? DEFAULT_OLLAMA_BASE_URL,
      });
      return {
        model: ollama(modelId),
        modelId,
        provider: ProveedorIA.OLLAMA,
      };
    }

    case ProveedorIA.OPENAI: {
      const apiKey = cfg.openaiApiKey ?? cfg.apiKey;
      if (!apiKey) {
        throw new AiProviderConfigError(
          'Falta OPENAI_API_KEY (o LLM_API_KEY) para operar con LLM_PROVIDER=openai.',
          { provider: cfg.provider },
        );
      }
      const openai = createOpenAI({
        apiKey,
        ...(cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
      });
      return {
        model: openai(modelId),
        modelId,
        provider: ProveedorIA.OPENAI,
      };
    }

    case ProveedorIA.OPENAI_COMPATIBLE: {
      if (!cfg.baseUrl) {
        throw new AiProviderConfigError(
          'Falta LLM_BASE_URL para operar con LLM_PROVIDER=openai-compatible.',
          { provider: cfg.provider },
        );
      }
      const compatible = createOpenAICompatible({
        name: 'openai-compatible',
        baseURL: cfg.baseUrl,
        apiKey: cfg.apiKey ?? cfg.openaiApiKey ?? 'not-needed',
      });
      return {
        model: compatible(modelId),
        modelId,
        provider: ProveedorIA.OPENAI_COMPATIBLE,
      };
    }
  }
}

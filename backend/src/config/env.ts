import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

export type LlmProviderType = 'mock' | 'gemini' | 'ollama' | 'openai' | 'openai-compatible';

export interface LlmConfig {
  provider: LlmProviderType;
  model?: string;
  baseUrl?: string;
  temperature: number;
  timeoutMs: number;
  fallbackToMock: boolean;
  geminiApiKey?: string;
  openaiApiKey?: string;
  apiKey?: string;
}

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databasePath: string;
  datasetCsvPath: string;
  llm: LlmConfig;
}

const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalNonEmptyString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const strictBooleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value: unknown) => {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === '') {
        return defaultValue;
      }
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
      }
    }
    return value;
  }, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_PATH: z.string().trim().min(1).default('./data/soflex-copilot.db'),
  DATASET_CSV_PATH: optionalNonEmptyString,
  LLM_PROVIDER: z
    .enum(['mock', 'gemini', 'ollama', 'openai', 'openai-compatible'])
    .default('mock'),
  LLM_MODEL: optionalNonEmptyString,
  LLM_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.1),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(15000),
  LLM_FALLBACK_TO_MOCK: strictBooleanFromEnv(true),
  GEMINI_API_KEY: optionalNonEmptyString,
  OPENAI_API_KEY: optionalNonEmptyString,
  LLM_API_KEY: optionalNonEmptyString,
});

/**
 * Resuelve la ruta al archivo CSV del dataset probando ubicaciones estándar
 * desde el directorio de trabajo actual o relativo al módulo compilado.
 */
export function resolveDatasetCsvPath(configuredPath?: string): string {
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  const candidates = [
    path.resolve(process.cwd(), 'docs/dataset_challenge_soflex.csv'),
    path.resolve(process.cwd(), '../docs/dataset_challenge_soflex.csv'),
    path.resolve(import.meta.dirname, '../../../docs/dataset_challenge_soflex.csv'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[2]!;
}

/**
 * Parsea y valida un diccionario de variables de entorno usando Zod.
 */
export function parseEnv(rawEnv: Record<string, string | undefined>): AppConfig {
  const parsed = EnvSchema.parse(rawEnv);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databasePath: parsed.DATABASE_PATH,
    datasetCsvPath: resolveDatasetCsvPath(parsed.DATASET_CSV_PATH),
    llm: {
      provider: parsed.LLM_PROVIDER,
      model: parsed.LLM_MODEL,
      baseUrl: parsed.LLM_BASE_URL,
      temperature: parsed.LLM_TEMPERATURE,
      timeoutMs: parsed.LLM_TIMEOUT_MS,
      fallbackToMock: parsed.LLM_FALLBACK_TO_MOCK,
      geminiApiKey: parsed.GEMINI_API_KEY,
      openaiApiKey: parsed.OPENAI_API_KEY,
      apiKey: parsed.LLM_API_KEY,
    },
  };
}

/**
 * Carga archivos `.env` locales si existen (sin sobrescribir variables ya presentes)
 * y devuelve la configuración validada de la aplicación.
 */
export function loadConfig(): AppConfig {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }

  return parseEnv(process.env);
}

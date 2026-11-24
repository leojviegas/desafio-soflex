import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

describe('config/env', () => {
  it('aplica valores por defecto seguros y modo mock offline', () => {
    const config = parseEnv({});

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3001);
    expect(config.databasePath).toBe('./data/soflex-copilot.db');
    expect(config.llm.provider).toBe('mock');
    expect(config.llm.temperature).toBe(0.1);
    expect(config.llm.timeoutMs).toBe(15000);
    expect(config.llm.fallbackToMock).toBe(true);
  });

  it('parsea booleanos de entorno de forma estricta sin coerción errónea de "false"', () => {
    const disabled = parseEnv({ LLM_FALLBACK_TO_MOCK: 'false' });
    const enabled = parseEnv({ LLM_FALLBACK_TO_MOCK: 'true' });
    const numericFalse = parseEnv({ LLM_FALLBACK_TO_MOCK: '0' });

    expect(disabled.llm.fallbackToMock).toBe(false);
    expect(enabled.llm.fallbackToMock).toBe(true);
    expect(numericFalse.llm.fallbackToMock).toBe(false);
  });

  it('rechaza valores inválidos de temperatura, proveedor y timeout', () => {
    expect(() => parseEnv({ LLM_TEMPERATURE: '-0.1' })).toThrow();
    expect(() => parseEnv({ LLM_TEMPERATURE: '1.5' })).toThrow();
    expect(() => parseEnv({ LLM_PROVIDER: 'otro-invalido' })).toThrow();
    expect(() => parseEnv({ LLM_TIMEOUT_MS: '100' })).toThrow();
  });
});

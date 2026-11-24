import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';
import { buildApp, type BuiltApp } from '../../src/inject.js';

const SILENT_LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('API Health, Protocolos y Dataset', () => {
  let built: BuiltApp | null = null;

  afterEach(() => {
    built?.close();
    built = null;
  });

  it('GET /api/health responde ok con catálogo y dataset cargados en modo mock', async () => {
    built = buildApp({
      config: parseEnv({
        NODE_ENV: 'test',
        DATABASE_PATH: ':memory:',
        LLM_PROVIDER: 'mock',
      }),
      logger: SILENT_LOGGER,
    });

    const res = await request(built.app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      ai: {
        provider: 'mock',
        model: 'deterministic-rules-v1',
        fallbackEnabled: true,
      },
      catalog: {
        categorias: 7,
        subcategorias: 21,
      },
      datasetLoaded: 30,
    });
  });

  it('GET /api/health reporta status degraded si proveedor real cae a mock por falta de credenciales', async () => {
    built = buildApp({
      config: parseEnv({
        NODE_ENV: 'test',
        DATABASE_PATH: ':memory:',
        LLM_PROVIDER: 'gemini',
        LLM_FALLBACK_TO_MOCK: 'true',
      }),
      logger: SILENT_LOGGER,
    });

    const res = await request(built.app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.ai.provider).toBe('mock');
  });

  it('GET /api/protocolos devuelve preguntas universales, 7 categorías y 21 subcategorías con pre-arribo', async () => {
    built = buildApp({
      config: parseEnv({
        NODE_ENV: 'test',
        DATABASE_PATH: ':memory:',
        LLM_PROVIDER: 'mock',
      }),
      logger: SILENT_LOGGER,
    });

    const res = await request(built.app).get('/api/protocolos');

    expect(res.status).toBe(200);
    expect(res.body.preguntasUniversales).toHaveLength(2);
    expect(res.body.categorias).toHaveLength(7);

    const totalSubcategorias = res.body.categorias.reduce(
      (acc: number, cat: { subcategorias: unknown[] }) =>
        acc + cat.subcategorias.length,
      0,
    );
    expect(totalSubcategorias).toBe(21);
    expect(
      res.body.categorias[0].subcategorias[0].instruccionesPreArribo.length,
    ).toBeGreaterThan(0);
  });

  it('GET /api/dataset/llamadas devuelve los 30 casos sintéticos del CSV', async () => {
    built = buildApp({
      config: parseEnv({
        NODE_ENV: 'test',
        DATABASE_PATH: ':memory:',
        LLM_PROVIDER: 'mock',
      }),
      logger: SILENT_LOGGER,
    });

    const res = await request(built.app).get('/api/dataset/llamadas');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(30);
    expect(res.body[0].idRegistro).toBe('SFX-REC-2026-001');
  });

  it('devuelve 404 ROUTE_NOT_FOUND ante rutas inexistentes', async () => {
    built = buildApp({
      config: parseEnv({
        NODE_ENV: 'test',
        DATABASE_PATH: ':memory:',
        LLM_PROVIDER: 'mock',
      }),
      logger: SILENT_LOGGER,
    });

    const res = await request(built.app).get('/api/ruta-inexistente');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });
});

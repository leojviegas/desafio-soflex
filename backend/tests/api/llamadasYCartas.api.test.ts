import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';
import { ProveedorIA } from '../../src/domain/index.js';
import { buildApp, type BuiltApp } from '../../src/inject.js';
import {
  AiProviderUnavailableError,
  type CopilotAnalyzerProvider,
} from '../../src/providers/ai/index.js';

const SILENT_LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function createTestApp(copilotAnalyzer?: CopilotAnalyzerProvider): BuiltApp {
  return buildApp({
    config: parseEnv({
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
      LLM_PROVIDER: 'mock',
    }),
    copilotAnalyzer,
    logger: SILENT_LOGGER,
  });
}

describe('API Llamadas y Cartas de Despacho (Supertest)', () => {
  let built: BuiltApp | null = null;

  afterEach(() => {
    built?.close();
    built = null;
  });

  it('ejecuta el flujo completo crear -> analizar -> turno -> patch -> derivar -> bandeja CAD -> bloqueo 409', async () => {
    built = createTestApp();
    const app = built.app;

    // 1. POST /api/llamadas sin análisis
    const createEmptyRes = await request(app).post('/api/llamadas').send({
      origenReporte: 'TELEFONIA_911',
      transcripcionCruda:
        'Operador: 911 emergencias.\nLlamante: Hay fuego en la cocina de una pizzería en Av. Corrientes.',
      analizarAhora: false,
    });

    expect(createEmptyRes.status).toBe(201);
    const llamadaId: string = createEmptyRes.body.id;
    expect(createEmptyRes.body.estado).toBe('EN_CURSO');
    expect(createEmptyRes.body.ultimoAnalisis).toBeNull();

    // 2. POST /api/llamadas/:id/analizar sin body (Express 5 req.body undefined)
    const analyzeRes = await request(app).post(
      `/api/llamadas/${llamadaId}/analizar`,
    );
    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.ultimoAnalisis).not.toBeNull();
    expect(analyzeRes.body.ultimoAnalisis.degradado).toBe(false);

    // 3. POST /api/llamadas/:id/analizar con simularDegradado=true
    const degradedRes = await request(app)
      .post(`/api/llamadas/${llamadaId}/analizar`)
      .send({ simularDegradado: true });
    expect(degradedRes.status).toBe(200);
    expect(degradedRes.body.ultimoAnalisis.degradado).toBe(true);

    // 4. POST /api/llamadas/:id/turnos con reanalizar=true
    const turnoRes = await request(app)
      .post(`/api/llamadas/${llamadaId}/turnos`)
      .send({
        hablante: 'LLAMANTE',
        texto: 'Es en Av. Corrientes 1540, San Nicolás, hay un empleado atrapado.',
        reanalizar: true,
      });
    expect(turnoRes.status).toBe(200);
    expect(turnoRes.body.ubicacion.altura).toBe('1540');
    expect(turnoRes.body.turnos.length).toBeGreaterThanOrEqual(3);

    // 5. PATCH /api/llamadas/:id editando campos y cambiando subcategoría
    const protocolosRes = await request(app).get('/api/protocolos');
    const primeraCategoria = protocolosRes.body.categorias[0];
    const subAlternativa = primeraCategoria.subcategorias[1];
    const preguntaUniversalId = protocolosRes.body.preguntasUniversales[0].id;

    const patchRes = await request(app)
      .patch(`/api/llamadas/${llamadaId}`)
      .send({
        subcategoriaId: subAlternativa.id,
        prioridad: 'P1',
        checklist: [
          {
            preguntaId: preguntaUniversalId,
            estadoOperador: 'CONFIRMADA',
            notaOperador: 'Confirmada por operador',
          },
        ],
        notasOperativasDespacho:
          'Incendio confirmado en Av. Corrientes 1540, empleado atrapado.',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.subcategoriaId).toBe(subAlternativa.id);
    expect(patchRes.body.prioridad).toBe('P1');
    expect(patchRes.body.camposEditadosPorOperador).toContain('subcategoriaId');
    expect(patchRes.body.camposEditadosPorOperador).toContain('prioridad');

    // 6. GET /api/llamadas con filtros y GET /api/llamadas/:id
    const listRes = await request(app).get(
      '/api/llamadas?estado=EN_CURSO&prioridad=P1',
    );
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(llamadaId);

    const detailRes = await request(app).get(`/api/llamadas/${llamadaId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(llamadaId);

    // 7. POST /api/llamadas/:id/derivar
    const deriveRes = await request(app)
      .post(`/api/llamadas/${llamadaId}/derivar`)
      .send({});

    expect(deriveRes.status).toBe(200);
    expect(deriveRes.body.llamada.estado).toBe('DERIVADA');
    expect(deriveRes.body.llamada.cartaDespacho.id).toBe(
      deriveRes.body.cartaDespacho.id,
    );
    expect('transcripcionCruda' in deriveRes.body.cartaDespacho).toBe(false);

    const cartaId: string = deriveRes.body.cartaDespacho.id;

    // 8. Bandeja CAD: GET /api/cartas-despacho y GET /api/cartas-despacho/:id
    const cartasListRes = await request(app).get(
      '/api/cartas-despacho?prioridad=P1',
    );
    expect(cartasListRes.status).toBe(200);
    expect(cartasListRes.body.some((c: { id: string }) => c.id === cartaId)).toBe(
      true,
    );

    const cartaDetailRes = await request(app).get(
      `/api/cartas-despacho/${cartaId}`,
    );
    expect(cartaDetailRes.status).toBe(200);
    expect(cartaDetailRes.body.id).toBe(cartaId);
    expect('transcripcionCruda' in cartaDetailRes.body).toBe(false);

    // 9. Bloqueo 409 tras derivar
    const patchAfterDerive = await request(app)
      .patch(`/api/llamadas/${llamadaId}`)
      .send({ prioridad: 'P3' });
    expect(patchAfterDerive.status).toBe(409);

    const turnoAfterDerive = await request(app)
      .post(`/api/llamadas/${llamadaId}/turnos`)
      .send({ hablante: 'LLAMANTE', texto: 'Más datos' });
    expect(turnoAfterDerive.status).toBe(409);

    const analyzeAfterDerive = await request(app).post(
      `/api/llamadas/${llamadaId}/analizar`,
    );
    expect(analyzeAfterDerive.status).toBe(409);

    const deriveAgain = await request(app).post(
      `/api/llamadas/${llamadaId}/derivar`,
    );
    expect(deriveAgain.status).toBe(409);

    const discardAfterDerive = await request(app).post(
      `/api/llamadas/${llamadaId}/descartar`,
    );
    expect(discardAfterDerive.status).toBe(409);
  });

  it('valida errores 400 y 404 en creación, query, patch y derivación incompleta', async () => {
    built = createTestApp();
    const app = built.app;

    const emptyTranscript = await request(app).post('/api/llamadas').send({
      origenReporte: 'TELEFONIA_911',
      transcripcionCruda: '   ',
    });
    expect(emptyTranscript.status).toBe(400);
    expect(emptyTranscript.body.code).toBe('REQUEST_VALIDATION_ERROR');

    const invalidOrigin = await request(app).post('/api/llamadas').send({
      origenReporte: 'CANAL_INVALIDO',
      transcripcionCruda: 'Hola',
    });
    expect(invalidOrigin.status).toBe(400);

    const invalidJson = await request(app)
      .post('/api/llamadas')
      .set('Content-Type', 'application/json')
      .send('{ "origenReporte": ');
    expect(invalidJson.status).toBe(400);
    expect(invalidJson.body.code).toBe('INVALID_JSON');

    const badQuery = await request(app).get('/api/llamadas?categoriaId=abc');
    expect(badQuery.status).toBe(400);

    const notFound = await request(app).get('/api/llamadas/id-inexistente');
    expect(notFound.status).toBe(404);

    const cartaNotFound = await request(app).get(
      '/api/cartas-despacho/id-inexistente',
    );
    expect(cartaNotFound.status).toBe(404);

    const created = await request(app).post('/api/llamadas').send({
      origenReporte: 'TELEFONIA_147',
      transcripcionCruda: 'Llamante: Reclamo sin dirección.',
      analizarAhora: false,
    });
    const id: string = created.body.id;

    const emptyPatch = await request(app).patch(`/api/llamadas/${id}`).send({});
    expect(emptyPatch.status).toBe(400);

    const badSubcatPatch = await request(app)
      .patch(`/api/llamadas/${id}`)
      .send({ subcategoriaId: 9999 });
    expect(badSubcatPatch.status).toBe(400);
    expect(badSubcatPatch.body.code).toBe('BUSINESS_RULE_ERROR');

    const incompleteDerive = await request(app).post(
      `/api/llamadas/${id}/derivar`,
    );
    expect(incompleteDerive.status).toBe(400);
    expect(incompleteDerive.body.code).toBe('DOMAIN_VALIDATION_ERROR');
    expect(Array.isArray(incompleteDerive.body.details?.camposFaltantes)).toBe(
      true,
    );
  });

  it('permite descartar una llamada en curso y rechaza descartarla dos veces', async () => {
    built = createTestApp();
    const app = built.app;

    const created = await request(app).post('/api/llamadas').send({
      origenReporte: 'TELEFONIA_911',
      transcripcionCruda: 'Llamante: Llamada de prueba por error.',
      analizarAhora: false,
    });
    const id: string = created.body.id;

    const firstDiscard = await request(app).post(
      `/api/llamadas/${id}/descartar`,
    );
    expect(firstDiscard.status).toBe(200);
    expect(firstDiscard.body.estado).toBe('DESCARTADA');

    const secondDiscard = await request(app).post(
      `/api/llamadas/${id}/descartar`,
    );
    expect(secondDiscard.status).toBe(409);
  });

  it('devuelve 503 sanitizado cuando el proveedor IA no está disponible y fallback está deshabilitado', async () => {
    const failingProvider: CopilotAnalyzerProvider = {
      getMetadata: () => ({
        provider: ProveedorIA.GEMINI,
        model: 'gemini-2.5-flash',
        fallbackEnabled: false,
      }),
      analyze: async () => {
        throw new AiProviderUnavailableError(
          'Timeout conectando con Gemini usando key AIzaSyFakeSecretKey123456789',
        );
      },
    };

    built = createTestApp(failingProvider);

    const res = await request(built.app).post('/api/llamadas').send({
      origenReporte: 'TELEFONIA_911',
      transcripcionCruda: 'Llamante: Emergencia en Av. Callao 450.',
      analizarAhora: true,
    });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_PROVIDER_UNAVAILABLE');
    expect(res.body.error).toContain('[REDACTED]');
    expect(res.body.error).not.toContain('AIzaSyFakeSecretKey123456789');
  });
});

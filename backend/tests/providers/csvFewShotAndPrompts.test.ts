import { describe, expect, it } from 'vitest';
import { resolveDatasetCsvPath } from '../../src/config/env.js';
import { OrigenReporte } from '../../src/domain/index.js';
import {
  buildSystemPrompt,
  buildUserPrompt,
  CsvFewShotRetriever,
} from '../../src/providers/ai/index.js';
import {
  CsvDatasetReferenciaRepository,
  openSqliteDatabase,
  seedCatalogoProtocolos,
  SqliteProtocoloRepository,
} from '../../src/repositories/index.js';

describe('providers/ai/csvFewShotRetriever & promptBuilder', () => {
  it('recupera 2 ejemplos similares y excluye coincidencia exacta o cuasi-exacta en los 30 casos del CSV', () => {
    const datasetRepo = CsvDatasetReferenciaRepository.fromFile(
      resolveDatasetCsvPath(),
    );
    const retriever = new CsvFewShotRetriever(datasetRepo);
    const casos = datasetRepo.findAll();

    expect(casos).toHaveLength(30);

    for (const caso of casos) {
      const resultadosExacto = retriever.recuperarEjemplosSimilares(
        caso.transcripcionCruda,
        2,
      );
      expect(resultadosExacto.length).toBeLessThanOrEqual(2);
      expect(
        resultadosExacto.some((r) => r.caso.idRegistro === caso.idRegistro),
      ).toBe(false);

      // Simula re-análisis (CU-03) al anexar un turno corto a la transcripción original
      const conTurnoExtra = `${caso.transcripcionCruda}\nLlamante: Sí, ya estamos en la vereda.`;
      const resultadosConTurno = retriever.recuperarEjemplosSimilares(
        conTurnoExtra,
        2,
      );
      expect(
        resultadosConTurno.some((r) => r.caso.idRegistro === caso.idRegistro),
      ).toBe(false);
    }

    // Consulta libre de incendio eléctrico
    const ejemplosLibre = retriever.recuperarEjemplosSimilares(
      'Llamante: Sale humo negro de un tablero eléctrico en una escuela y estamos evacuando al patio.',
      2,
    );
    expect(ejemplosLibre).toHaveLength(2);
  });

  it('construye systemPrompt con catálogo e IDs sin filtrar instrucciones pre-arribo y arma userPrompt', async () => {
    const db = openSqliteDatabase(':memory:');
    seedCatalogoProtocolos(db);
    const protocoloRepo = new SqliteProtocoloRepository(db);
    const datasetRepo = CsvDatasetReferenciaRepository.fromFile(
      resolveDatasetCsvPath(),
    );

    const resumen = await protocoloRepo.obtenerResumenParaPrompt();
    const catalogoCompleto = await protocoloRepo.listarCatalogoCompleto();
    const systemPrompt = buildSystemPrompt(resumen);

    expect(systemPrompt).toContain('PREGUNTAS UNIVERSALES');
    expect(systemPrompt).toContain('CATÁLOGO DE CATEGORÍAS, SUBCATEGORÍAS Y PREGUNTAS');
    expect(systemPrompt).toContain('[id=1]');
    expect(systemPrompt).toContain('P4');
    expect(systemPrompt).toContain('citaEvidencia');

    // Ninguna instrucción pre-arribo debe filtrarse al systemPrompt
    for (const cat of catalogoCompleto.categorias) {
      for (const sub of cat.subcategorias) {
        for (const instr of sub.instruccionesPreArribo) {
          expect(systemPrompt).not.toContain(instr.texto);
        }
      }
    }

    const retriever = new CsvFewShotRetriever(datasetRepo);
    const ejemplos = retriever
      .recuperarEjemplosSimilares(
        'Fuego en cocina de restaurante con humo denso',
        2,
      )
      .map((r) => r.caso);

    const userPrompt = buildUserPrompt({
      transcripcionCruda: 'Llamante: Fuego en cocina de restaurante.',
      origenReporte: OrigenReporte.TELEFONIA_911,
      ejemplosFewShot: ejemplos,
      subcategoriaIdFijadaPorOperador: 1,
    });

    expect(userPrompt).toContain('EJEMPLOS DE REFERENCIA');
    expect(userPrompt).toContain('ORIGEN DEL REPORTE: TELEFONIA_911');
    expect(userPrompt).toContain('subcategoriaId=1');
    expect(userPrompt).toContain('Llamante: Fuego en cocina de restaurante.');

    db.close();
  });
});

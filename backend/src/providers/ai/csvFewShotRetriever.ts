import { normalizarParaComparacion } from '../../domain/index.js';
import type {
  CasoReferenciaCsv,
  DatasetReferenciaRepository,
} from '../../repositories/index.js';

const STOPWORDS_CONVERSACIONALES = new Set([
  'a',
  'al',
  'algo',
  'buen',
  'buenas',
  'buenos',
  'ciudad',
  'como',
  'con',
  'cual',
  'cuando',
  'de',
  'del',
  'dia',
  'digame',
  'donde',
  'el',
  'ella',
  'emergencia',
  'emergencias',
  'en',
  'es',
  'esta',
  'estan',
  'estoy',
  'favor',
  'fue',
  'gracias',
  'hay',
  'hola',
  'la',
  'las',
  'le',
  'les',
  'llamante',
  'lo',
  'los',
  'me',
  'mi',
  'mira',
  'muy',
  'necesito',
  'no',
  'noches',
  'nos',
  'o',
  'operador',
  'para',
  'pero',
  'por',
  'que',
  'quien',
  'se',
  'si',
  'sin',
  'sobre',
  'soy',
  'su',
  'tardes',
  'te',
  'tengo',
  'todo',
  'un',
  'una',
  'uno',
  'unos',
  'urgencia',
  'y',
  'ya',
]);

export interface ResultadoSimilitudCsv {
  caso: CasoReferenciaCsv;
  similitud: number;
}

interface CasoIndexado {
  caso: CasoReferenciaCsv;
  textoNormalizado: string;
  vectorNormalizado: Map<string, number>;
}

function tokenizar(textoNormalizado: string): string[] {
  return textoNormalizado
    .split(' ')
    .filter((t) => t.length >= 3 && !STOPWORDS_CONVERSACIONALES.has(t));
}

function construirVectorTfIdf(
  tokens: readonly string[],
  idf: ReadonlyMap<string, number>,
): Map<string, number> {
  if (tokens.length === 0) {
    return new Map();
  }

  const conteos = new Map<string, number>();
  for (const token of tokens) {
    conteos.set(token, (conteos.get(token) ?? 0) + 1);
  }

  const vector = new Map<string, number>();
  let normaCuadrada = 0;

  for (const [token, count] of conteos.entries()) {
    const idfToken = idf.get(token);
    if (idfToken === undefined) {
      continue;
    }
    const tf = count / tokens.length;
    const peso = tf * idfToken;
    vector.set(token, peso);
    normaCuadrada += peso * peso;
  }

  if (normaCuadrada === 0) {
    return new Map();
  }

  const norma = Math.sqrt(normaCuadrada);
  for (const [token, peso] of vector.entries()) {
    vector.set(token, peso / norma);
  }

  return vector;
}

function similitudCoseno(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): number {
  let suma = 0;
  for (const [token, pesoA] of a.entries()) {
    const pesoB = b.get(token);
    if (pesoB !== undefined) {
      suma += pesoA * pesoB;
    }
  }
  return suma;
}

function esCoincidenciaExactaOCuasiExacta(
  queryNorm: string,
  casoNorm: string,
  similitud: number,
): boolean {
  if (queryNorm.length === 0 || casoNorm.length === 0) {
    return false;
  }
  if (queryNorm === casoNorm || similitud >= 0.92) {
    return true;
  }

  const minLen = Math.min(queryNorm.length, casoNorm.length);
  const maxLen = Math.max(queryNorm.length, casoNorm.length);
  if (
    minLen / maxLen >= 0.75 &&
    (queryNorm.includes(casoNorm) || casoNorm.includes(queryNorm))
  ) {
    return true;
  }

  return false;
}

/**
 * Buscador léxico TF-IDF sobre las 30 filas del dataset CSV para retrieval few-shot,
 * excluyendo coincidencias exactas o cuasi-exactas para evitar fuga de respuestas.
 */
export class CsvFewShotRetriever {
  private readonly idf: Map<string, number>;
  private readonly indexados: readonly CasoIndexado[];

  constructor(datasetRepository: DatasetReferenciaRepository) {
    const casos = datasetRepository.findAll();
    const docFreq = new Map<string, number>();
    const textosYTokens = casos.map((caso) => {
      const textoNormalizado = normalizarParaComparacion(caso.transcripcionCruda);
      const tokens = tokenizar(textoNormalizado);
      const unicos = new Set(tokens);
      for (const token of unicos) {
        docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
      }
      return { caso, textoNormalizado, tokens };
    });

    const totalDocs = Math.max(casos.length, 1);
    this.idf = new Map<string, number>();
    for (const [token, df] of docFreq.entries()) {
      this.idf.set(token, Math.log((totalDocs + 1) / (df + 1)) + 1);
    }

    this.indexados = textosYTokens.map(({ caso, textoNormalizado, tokens }) => ({
      caso,
      textoNormalizado,
      vectorNormalizado: construirVectorTfIdf(tokens, this.idf),
    }));
  }

  recuperarEjemplosSimilares(
    transcripcionCruda: string,
    topK = 2,
  ): ResultadoSimilitudCsv[] {
    if (topK <= 0 || this.indexados.length === 0) {
      return [];
    }

    const queryNorm = normalizarParaComparacion(transcripcionCruda);
    const queryTokens = tokenizar(queryNorm);
    const queryVector = construirVectorTfIdf(queryTokens, this.idf);

    if (queryVector.size === 0) {
      return [];
    }

    const candidatos: ResultadoSimilitudCsv[] = [];
    for (const item of this.indexados) {
      const similitud = similitudCoseno(queryVector, item.vectorNormalizado);
      if (similitud <= 0) {
        continue;
      }
      if (
        esCoincidenciaExactaOCuasiExacta(
          queryNorm,
          item.textoNormalizado,
          similitud,
        )
      ) {
        continue;
      }
      candidatos.push({
        caso: item.caso,
        similitud,
      });
    }

    candidatos.sort((a, b) => {
      if (b.similitud !== a.similitud) {
        return b.similitud - a.similitud;
      }
      return a.caso.idRegistro.localeCompare(b.caso.idRegistro);
    });

    return candidatos.slice(0, topK);
  }
}

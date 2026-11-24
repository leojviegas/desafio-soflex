import fs from 'node:fs';
import {
  esOrigenReporte,
  esPrioridadIncidente,
  type OrigenReporte,
  type PrioridadIncidente,
} from '../domain/index.js';
import { CasoReferenciaCsv } from './casoReferenciaCsv.js';
import { parseCsv } from './csvParser.js';
import type { DatasetReferenciaRepository } from './datasetReferenciaRepository.js';

const EXPECTED_HEADERS = [
  'id_registro',
  'timestamp_llamada',
  'origen_reporte',
  'categoria',
  'subcategoria',
  'prioridad_sugerida',
  'transcripcion_cruda',
  'calle_detectada',
  'altura_detectada',
  'interseccion_detectada',
  'barrio_comuna',
  'preguntas_protocolo_mandatorias',
  'preguntas_respondidas_en_relato',
  'preguntas_pendientes',
  'instrucciones_prearribo',
  'riesgos_detectados',
  'recursos_recomendados_despacho',
  'notas_operativas_despacho',
] as const;

function splitDelimitedList(value: string, separator: string): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseOrigen(value: string, rowNumber: number): OrigenReporte {
  if (!esOrigenReporte(value)) {
    throw new Error(`Fila ${rowNumber}: origen_reporte inválido "${value}".`);
  }
  return value;
}

function parsePrioridad(value: string, rowNumber: number): PrioridadIncidente {
  if (!esPrioridadIncidente(value)) {
    throw new Error(`Fila ${rowNumber}: prioridad_sugerida inválida "${value}".`);
  }
  return value;
}

/**
 * Repositorio en memoria de casos de referencia cargados desde `docs/dataset_challenge_soflex.csv`.
 */
export class CsvDatasetReferenciaRepository implements DatasetReferenciaRepository {
  private readonly registros: CasoReferenciaCsv[];
  private readonly byId = new Map<string, CasoReferenciaCsv>();
  private readonly byCategoria = new Map<string, CasoReferenciaCsv[]>();

  private constructor(registros: CasoReferenciaCsv[]) {
    this.registros = registros;

    for (const registro of registros) {
      this.byId.set(registro.idRegistro, registro);
      const list = this.byCategoria.get(registro.categoria) ?? [];
      list.push(registro);
      this.byCategoria.set(registro.categoria, list);
    }
  }

  static fromFile(filePath: string): CsvDatasetReferenciaRepository {
    const content = fs.readFileSync(filePath, 'utf8');
    return CsvDatasetReferenciaRepository.fromCsvContent(content);
  }

  static fromCsvContent(csvContent: string): CsvDatasetReferenciaRepository {
    const rows = parseCsv(csvContent);
    if (rows.length < 2) {
      throw new Error(
        'El archivo CSV del dataset no contiene encabezados y registros válidos.',
      );
    }

    const header = rows[0]!;
    if (header.length !== EXPECTED_HEADERS.length) {
      throw new Error(
        `Cantidad de columnas inválida en CSV: se esperaban ${EXPECTED_HEADERS.length} y se encontraron ${header.length}.`,
      );
    }

    for (let idx = 0; idx < EXPECTED_HEADERS.length; idx++) {
      if (header[idx] !== EXPECTED_HEADERS[idx]) {
        throw new Error(
          `Encabezado CSV inesperado en columna ${idx + 1}: se esperaba "${EXPECTED_HEADERS[idx]}" y se encontró "${header[idx]}".`,
        );
      }
    }

    const registros: CasoReferenciaCsv[] = [];
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r]!;
      const rowNumber = r + 1;
      if (cols.length !== EXPECTED_HEADERS.length) {
        throw new Error(
          `Fila ${rowNumber} malformada: se esperaban ${EXPECTED_HEADERS.length} columnas y se encontraron ${cols.length}.`,
        );
      }

      const idRegistro = cols[0]!;
      if (idRegistro.length === 0) {
        throw new Error(`Fila ${rowNumber}: id_registro vacío.`);
      }

      const categoria = cols[3]!.trim();
      if (categoria.length === 0) {
        throw new Error(`Fila ${rowNumber}: categoria vacía.`);
      }

      registros.push(
        new CasoReferenciaCsv({
          idRegistro,
          timestampLlamada: cols[1]!,
          origenReporte: parseOrigen(cols[2]!, rowNumber),
          categoria,
          descripcionIncidente: cols[4]!,
          prioridadSugerida: parsePrioridad(cols[5]!, rowNumber),
          transcripcionCruda: cols[6]!,
          calleDetectada: cols[7],
          alturaDetectada: cols[8],
          interseccionDetectada: cols[9],
          barrioComuna: cols[10],
          preguntasProtocoloMandatorias: splitDelimitedList(cols[11]!, '|'),
          preguntasRespondidasEnRelato: splitDelimitedList(cols[12]!, '|'),
          preguntasPendientes: splitDelimitedList(cols[13]!, '|'),
          instruccionesPrearribo: cols[14]!,
          riesgosDetectados: splitDelimitedList(cols[15]!, ','),
          recursosRecomendadosDespacho: splitDelimitedList(cols[16]!, '+'),
          notasOperativasDespacho: cols[17]!,
        }),
      );
    }

    return new CsvDatasetReferenciaRepository(registros);
  }

  findAll(): CasoReferenciaCsv[] {
    return this.registros.map((r) => new CasoReferenciaCsv(r.toSnapshot()));
  }

  findById(idRegistro: string): CasoReferenciaCsv | null {
    const found = this.byId.get(idRegistro);
    return found ? new CasoReferenciaCsv(found.toSnapshot()) : null;
  }

  findByCategoria(categoria: string): CasoReferenciaCsv[] {
    return (this.byCategoria.get(categoria) ?? []).map(
      (r) => new CasoReferenciaCsv(r.toSnapshot()),
    );
  }

  count(): number {
    return this.registros.length;
  }
}

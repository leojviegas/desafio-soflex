import fs from 'node:fs';
import {
  esCategoriaIncidente,
  esOrigenReporte,
  esPrioridadIncidente,
  ProtocoloReferencia,
  type CategoriaIncidente,
  type OrigenReporte,
  type PrioridadIncidente,
} from '../domain/index.js';
import { parseCsv } from './csvParser.js';
import type {
  ProtocoloCatalogRepository,
  ProtocoloPorCategoria,
} from './protocoloCatalogRepository.js';

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

function addUnique(target: Set<string>, items: readonly string[]): void {
  for (const item of items) {
    const clean = item.trim();
    if (clean.length > 0) {
      target.add(clean);
    }
  }
}

function parseOrigen(value: string, rowNumber: number): OrigenReporte {
  if (!esOrigenReporte(value)) {
    throw new Error(`Fila ${rowNumber}: origen_reporte inválido "${value}".`);
  }
  return value;
}

function parseCategoria(value: string, rowNumber: number): CategoriaIncidente {
  if (!esCategoriaIncidente(value)) {
    throw new Error(`Fila ${rowNumber}: categoria inválida "${value}".`);
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
 * Catálogo en memoria indexado desde `docs/dataset_challenge_soflex.csv`.
 */
export class CsvProtocoloCatalogRepository implements ProtocoloCatalogRepository {
  private readonly registros: ProtocoloReferencia[];
  private readonly byId = new Map<string, ProtocoloReferencia>();
  private readonly byCategoria = new Map<CategoriaIncidente, ProtocoloReferencia[]>();
  private readonly protocolosPorCategoria: ProtocoloPorCategoria[];

  private constructor(registros: ProtocoloReferencia[]) {
    this.registros = registros;

    for (const registro of registros) {
      this.byId.set(registro.idRegistro, registro);
      const list = this.byCategoria.get(registro.categoria) ?? [];
      list.push(registro);
      this.byCategoria.set(registro.categoria, list);
    }

    this.protocolosPorCategoria = [...this.byCategoria.entries()].map(
      ([categoria, items]) => {
        const subcategorias = new Set<string>();
        const preguntasMandatorias = new Set<string>();
        const instruccionesPreArribo = new Set<string>();
        const riesgosFrecuentes = new Set<string>();
        const recursosRecomendados = new Set<string>();

        for (const item of items) {
          addUnique(subcategorias, [item.subcategoria]);
          addUnique(preguntasMandatorias, item.preguntasProtocoloMandatorias);
          addUnique(instruccionesPreArribo, [item.instruccionesPrearribo]);
          addUnique(riesgosFrecuentes, item.riesgosDetectados);
          addUnique(recursosRecomendados, item.recursosRecomendadosDespacho);
        }

        return {
          categoria,
          subcategorias: [...subcategorias],
          preguntasMandatorias: [...preguntasMandatorias],
          instruccionesPreArribo: [...instruccionesPreArribo],
          riesgosFrecuentes: [...riesgosFrecuentes],
          recursosRecomendados: [...recursosRecomendados],
          cantidadCasos: items.length,
        };
      },
    );
  }

  static fromFile(filePath: string): CsvProtocoloCatalogRepository {
    const content = fs.readFileSync(filePath, 'utf8');
    return CsvProtocoloCatalogRepository.fromCsvContent(content);
  }

  static fromCsvContent(csvContent: string): CsvProtocoloCatalogRepository {
    const rows = parseCsv(csvContent);
    if (rows.length < 2) {
      throw new Error('El archivo CSV del catálogo no contiene encabezados y registros válidos.');
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

    const registros: ProtocoloReferencia[] = [];
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

      registros.push(
        new ProtocoloReferencia({
          idRegistro,
          timestampLlamada: cols[1]!,
          origenReporte: parseOrigen(cols[2]!, rowNumber),
          categoria: parseCategoria(cols[3]!, rowNumber),
          subcategoria: cols[4]!,
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

    return new CsvProtocoloCatalogRepository(registros);
  }

  findAll(): ProtocoloReferencia[] {
    return this.registros.map((r) => new ProtocoloReferencia(r.toJSON()));
  }

  findById(idRegistro: string): ProtocoloReferencia | null {
    const found = this.byId.get(idRegistro);
    return found ? new ProtocoloReferencia(found.toJSON()) : null;
  }

  findByCategoria(categoria: CategoriaIncidente): ProtocoloReferencia[] {
    return (this.byCategoria.get(categoria) ?? []).map(
      (r) => new ProtocoloReferencia(r.toJSON()),
    );
  }

  getProtocolosPorCategoria(): ProtocoloPorCategoria[] {
    return this.protocolosPorCategoria.map((p) => ({
      ...p,
      subcategorias: [...p.subcategorias],
      preguntasMandatorias: [...p.preguntasMandatorias],
      instruccionesPreArribo: [...p.instruccionesPreArribo],
      riesgosFrecuentes: [...p.riesgosFrecuentes],
      recursosRecomendados: [...p.recursosRecomendados],
    }));
  }

  count(): number {
    return this.registros.length;
  }
}

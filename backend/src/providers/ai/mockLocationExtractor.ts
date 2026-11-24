import { normalizarParaComparacion } from '../../domain/index.js';
import type { UbicacionExtraida } from '../../schemas/index.js';

export interface ExtraccionUbicacionMock {
  ubicacion: UbicacionExtraida;
  fragmentoEvidencia: string | null;
}

interface BarrioEntrada {
  patrones: readonly string[];
  etiqueta: string;
}

const BARRIOS_CABA: readonly BarrioEntrada[] = [
  { patrones: ['san nicolas'], etiqueta: 'San Nicolás (Comuna 1)' },
  { patrones: ['constitucion'], etiqueta: 'Constitución (Comuna 1)' },
  { patrones: ['monserrat', 'montserrat'], etiqueta: 'Monserrat (Comuna 1)' },
  { patrones: ['puerto madero'], etiqueta: 'Puerto Madero (Comuna 1)' },
  { patrones: ['retiro'], etiqueta: 'Retiro (Comuna 1)' },
  { patrones: ['san telmo'], etiqueta: 'San Telmo (Comuna 1)' },
  { patrones: ['recoleta'], etiqueta: 'Recoleta (Comuna 2)' },
  { patrones: ['balvanera'], etiqueta: 'Balvanera (Comuna 3)' },
  { patrones: ['san cristobal'], etiqueta: 'San Cristóbal (Comuna 3)' },
  { patrones: ['la boca'], etiqueta: 'La Boca (Comuna 4)' },
  { patrones: ['barracas'], etiqueta: 'Barracas (Comuna 4)' },
  { patrones: ['parque patricios'], etiqueta: 'Parque Patricios (Comuna 4)' },
  { patrones: ['nueva pompeya', 'pompeya'], etiqueta: 'Nueva Pompeya (Comuna 4)' },
  { patrones: ['almagro', 'plaza almagro'], etiqueta: 'Almagro (Comuna 5)' },
  { patrones: ['boedo'], etiqueta: 'Boedo (Comuna 5)' },
  { patrones: ['caballito'], etiqueta: 'Caballito (Comuna 6)' },
  { patrones: ['flores'], etiqueta: 'Flores (Comuna 7)' },
  { patrones: ['parque chacabuco'], etiqueta: 'Parque Chacabuco (Comuna 7)' },
  { patrones: ['villa soldati', 'soldati'], etiqueta: 'Villa Soldati (Comuna 8)' },
  { patrones: ['villa lugano', 'lugano'], etiqueta: 'Villa Lugano (Comuna 8)' },
  { patrones: ['villa riachuelo'], etiqueta: 'Villa Riachuelo (Comuna 8)' },
  { patrones: ['liniers'], etiqueta: 'Liniers (Comuna 9)' },
  { patrones: ['mataderos'], etiqueta: 'Mataderos (Comuna 9)' },
  { patrones: ['parque avellaneda'], etiqueta: 'Parque Avellaneda (Comuna 9)' },
  { patrones: ['villa real'], etiqueta: 'Villa Real (Comuna 10)' },
  { patrones: ['monte castro'], etiqueta: 'Monte Castro (Comuna 10)' },
  { patrones: ['versalles'], etiqueta: 'Versalles (Comuna 10)' },
  { patrones: ['floresta'], etiqueta: 'Floresta (Comuna 10)' },
  { patrones: ['velez sarsfield'], etiqueta: 'Vélez Sarsfield (Comuna 10)' },
  { patrones: ['villa luro'], etiqueta: 'Villa Luro (Comuna 10)' },
  { patrones: ['villa general mitre'], etiqueta: 'Villa General Mitre (Comuna 11)' },
  { patrones: ['villa devoto', 'devoto'], etiqueta: 'Villa Devoto (Comuna 11)' },
  { patrones: ['villa del parque'], etiqueta: 'Villa del Parque (Comuna 11)' },
  { patrones: ['villa santa rita'], etiqueta: 'Villa Santa Rita (Comuna 11)' },
  { patrones: ['coghlan'], etiqueta: 'Coghlan (Comuna 12)' },
  { patrones: ['saavedra'], etiqueta: 'Saavedra (Comuna 12)' },
  { patrones: ['villa urquiza', 'urquiza'], etiqueta: 'Villa Urquiza (Comuna 12)' },
  { patrones: ['villa pueyrredon'], etiqueta: 'Villa Pueyrredón (Comuna 12)' },
  { patrones: ['nunez'], etiqueta: 'Núñez (Comuna 13)' },
  { patrones: ['belgrano r', 'belgrano'], etiqueta: 'Belgrano (Comuna 13)' },
  { patrones: ['colegiales'], etiqueta: 'Colegiales (Comuna 13)' },
  { patrones: ['palermo', 'plaza serrano'], etiqueta: 'Palermo (Comuna 14)' },
  { patrones: ['chacarita'], etiqueta: 'Chacarita (Comuna 15)' },
  { patrones: ['villa crespo'], etiqueta: 'Villa Crespo (Comuna 15)' },
  { patrones: ['la paternal', 'paternal'], etiqueta: 'La Paternal (Comuna 15)' },
  { patrones: ['villa ortuzar'], etiqueta: 'Villa Ortúzar (Comuna 15)' },
  { patrones: ['agronomia'], etiqueta: 'Agronomía (Comuna 15)' },
  { patrones: ['parque chas'], etiqueta: 'Parque Chas (Comuna 15)' },
];

const REFERENCIA_PATTERNS: readonly RegExp[] = [
  /\b(?:estaci[oó]n\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3}(?:\s+de\s+la\s+L[ií]nea\s+[A-Z0-9]+)?)/,
  /\b(?:Parque\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/,
  /\b(?:Plaza\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/,
  /\b(?:bajo\s+puente(?:\s+de\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?|bajo\s+viaducto|bajo\s+nivel)/i,
  /\b(?:carril\s+(?:del\s+)?Metrobus|carril\s+r[aá]pido)/i,
  /\b(?:entre\s+los\s+pisos\s+\d+\s+y\s+\d+|\d+(?:ro|do|to|mo)?\s*[A-Z]\b)/i,
  /\b(?:escuela\s+primaria|canchas\s+de\s+f[uú]tbol\s*\d*|subestaci[oó]n\s+el[eé]ctrica|obra\s+en\s+construcci[oó]n|pizzer[ií]a|restaurante|bodeg[oó]n|taller\s+de\s+reparaci[oó]n[^.,;\n]*)/i,
];

function limpiarNombreVia(raw: string): string {
  return raw
    .replace(/^(?:la|el|los|las|un|una)\s+/i, '')
    .replace(/\s+(?:en|casi|entre|esquina|altura|al|de|del|mano)\s*$/i, '')
    .trim();
}

function esFalsaCalle(nombre: string): boolean {
  const norm = normalizarParaComparacion(nombre);
  if (norm.length < 3) {
    return true;
  }
  const invalidos = new Set([
    'operador',
    'llamante',
    'hola',
    'buen dia',
    'buenas tardes',
    'buenas noches',
    'emergencias',
    'por favor',
    'ayuda',
    'auxilio',
  ]);
  return invalidos.has(norm);
}

function detectarBarrio(transcripcionCruda: string): string | null {
  const norm = normalizarParaComparacion(transcripcionCruda);
  const padded = ` ${norm} `;
  for (const entry of BARRIOS_CABA) {
    for (const patron of entry.patrones) {
      if (padded.includes(` ${patron} `)) {
        return entry.etiqueta;
      }
    }
  }
  return null;
}

function detectarReferencia(transcripcionCruda: string): string | null {
  for (const regex of REFERENCIA_PATTERNS) {
    const match = transcripcionCruda.match(regex);
    if (match?.[0]) {
      return match[0].trim();
    }
  }
  return null;
}

/**
 * Extrae ubicación normalizada de forma determinista y sin alucinaciones
 * exclusivamente a partir de `transcripcionCruda`.
 */
export function extraerUbicacionDesdeTranscripcion(
  transcripcionCruda: string,
): ExtraccionUbicacionMock {
  const textoSinPrefijos = transcripcionCruda.replace(
    /\b(?:Operador|Llamante)\s*:\s*/gi,
    ' ',
  );

  let calle: string | null = null;
  let altura: string | null = null;
  let interseccion: string | null = null;
  let fragmentoEvidencia: string | null = null;

  // 1. Autopista / Avenida con altura o bajada (ej. "Autopista 25 de Mayo ... altura de la bajada de Boedo")
  const autopistaMatch = textoSinPrefijos.match(
    /\b(Autopista\s+[A-ZÁÉÍÓÚÑ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s]{1,28}?)(?=,|\.|;|\n|\s+mano\s+|\s+a\s+la\s+altura|\s+altura\s+|$)/i,
  );
  if (autopistaMatch?.[1]) {
    calle = limpiarNombreVia(autopistaMatch[1]);
    fragmentoEvidencia = autopistaMatch[0].trim();
  }

  // 2. Calle o Avenida con altura numérica (ej. "Av. Corrientes 1540", "Scalabrini Ortiz al 800", "Paraguay al 3800")
  if (!calle) {
    const calleAlturaMatch = textoSinPrefijos.match(
      /(?:en\s+(?:la\s+vereda\s+de\s+|el\s+edificio\s+en\s+|la\s+escuela[^.,\n]*?\s+en\s+|un\s+[^.,\n]*?\s+en\s+|una\s+[^.,\n]*?\s+en\s+|)?|sobre\s+|de\s+)((?:Av\.?\s+|Avenida\s+)?[A-ZÁÉÍÓÚÑ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ0-9.]+(?:\s+(?:de|del|la|las|los|[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+)){0,4})\s+(?:al\s+)?(\d{2,5})\b/,
    );
    if (calleAlturaMatch?.[1] && !esFalsaCalle(calleAlturaMatch[1])) {
      calle = limpiarNombreVia(calleAlturaMatch[1]);
      altura = calleAlturaMatch[2]?.trim() ?? null;
      fragmentoEvidencia = `${calle} ${calleAlturaMatch[0].includes(' al ') ? 'al ' : ''}${altura ?? ''}`.trim();
    }
  }

  // 3. Cruce directo "Calle1 y Calle2" (ej. "Av. San Juan y Entre Ríos", "Serrano y Honduras", "Escalada y Castañares")
  const cruceMatch = textoSinPrefijos.match(
    /\b((?:Av\.?\s+|Avenida\s+)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9.]+(?:\s+(?:de|del|[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9.]+)){0,3})\s+y\s+((?:las\s+v[ií]as\s+de\s+|las\s+v[ií]as\s+del\s+)?(?:Av\.?\s+|Avenida\s+|Puente\s+)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9.]+(?:\s+(?:de|del|[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9.]+)){0,3})/,
  );
  if (cruceMatch?.[1] && cruceMatch[2] && !esFalsaCalle(cruceMatch[1])) {
    const primera = limpiarNombreVia(cruceMatch[1]);
    const segunda = limpiarNombreVia(cruceMatch[2]);
    if (!calle) {
      calle = primera;
      interseccion = `${primera} y ${segunda}`;
      fragmentoEvidencia = cruceMatch[0].trim();
    } else if (!interseccion) {
      interseccion = `${primera} y ${segunda}`;
    }
  }

  // 4. "entre X y Y"
  const entreMatch = textoSinPrefijos.match(
    /\bentre\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+){0,2})\s+y\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+){0,2})/,
  );
  if (entreMatch?.[1] && entreMatch[2]) {
    interseccion = `${entreMatch[1].trim()} y ${entreMatch[2].trim()}`;
    if (!fragmentoEvidencia) {
      fragmentoEvidencia = entreMatch[0].trim();
    }
  }

  // 5. "casi X" o "esquina X"
  if (!interseccion) {
    const casiMatch = textoSinPrefijos.match(
      /\b(?:casi|esquina)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.]+){0,2})/,
    );
    if (casiMatch?.[1] && !esFalsaCalle(casiMatch[1])) {
      interseccion = casiMatch[1].trim();
      if (!fragmentoEvidencia) {
        fragmentoEvidencia = casiMatch[0].trim();
      }
    }
  }

  // 6. Calle con "altura X" sin número (ej. "Av. Lugones altura Parque Norte", "altura de la bajada de Boedo")
  if (!calle || !altura) {
    const alturaTextoMatch = textoSinPrefijos.match(
      /\b((?:Av\.?\s+|Avenida\s+|Autopista\s+)?[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9.]+(?:\s+[A-ZÁÉÍÓÚÑ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ0-9.]+){0,3})\s+(?:a\s+la\s+)?altura\s+(?:de\s+(?:la\s+)?)?([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9.\s]{2,28}?)(?=,|\.|;|\n|\s+sentido\s+|$)/,
    );
    if (alturaTextoMatch?.[1] && !esFalsaCalle(alturaTextoMatch[1])) {
      if (!calle) {
        calle = limpiarNombreVia(alturaTextoMatch[1]);
      }
      if (!altura && alturaTextoMatch[2]) {
        altura = `altura ${alturaTextoMatch[2].trim()}`;
      }
      if (!fragmentoEvidencia) {
        fragmentoEvidencia = alturaTextoMatch[0].trim();
      }
    }
  }

  const barrioComuna = detectarBarrio(transcripcionCruda);
  const referencia = detectarReferencia(transcripcionCruda);

  if (!fragmentoEvidencia) {
    fragmentoEvidencia = referencia ?? barrioComuna;
  }

  // Garantizar que fragmentoEvidencia exista textualmente en transcripcionCruda
  if (
    fragmentoEvidencia &&
    !normalizarParaComparacion(transcripcionCruda).includes(
      normalizarParaComparacion(fragmentoEvidencia),
    )
  ) {
    fragmentoEvidencia = null;
  }

  return {
    ubicacion: {
      calle,
      altura,
      interseccion,
      barrioComuna,
      referencia,
    },
    fragmentoEvidencia,
  };
}

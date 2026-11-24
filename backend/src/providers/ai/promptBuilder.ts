import type { OrigenReporte } from '../../domain/index.js';
import type {
  CasoReferenciaCsv,
  ResumenCatalogoPrompt,
} from '../../repositories/index.js';

export interface BuildUserPromptParams {
  transcripcionCruda: string;
  origenReporte?: OrigenReporte;
  ejemplosFewShot: readonly CasoReferenciaCsv[];
  subcategoriaIdFijadaPorOperador?: number | null;
}

/**
 * Construye el `system` prompt fijo con rol de sala, reglas anti-alucinación,
 * criterios P1..P4 y el catálogo de categorías/subcategorías/preguntas desde SQLite.
 * Nunca incluye instrucciones de pre-arribo.
 */
export function buildSystemPrompt(resumenCatalogo: ResumenCatalogoPrompt): string {
  const lineas: string[] = [
    'Sos un Copiloto Inteligente que asiste a operadores de sala de atención ciudadana y emergencias en CABA (911, 103, 107, 147).',
    'PRINCIPIO CRÍTICO DE SALA: El operador NO despacha móviles en la calle; solo contiene al ciudadano, ejecuta el interrogatorio de protocolo, normaliza la ubicación, evalúa severidad y conforma la Carta de Llamada para el despachador CAD.',
    '',
    'REGLAS ESTRICTAS ANTI-ALUCINACIÓN:',
    '1. PROHIBIDO inventar calles, alturas, intersecciones, barrios, comunas, referencias o hechos que no figuren explícitamente en la transcripción. Todo dato de ubicación ausente debe devolverse como null.',
    '2. En `preguntasDetectadas`, incluí ÚNICAMENTE preguntas del catálogo (universales o de la subcategoría elegida) sobre las que exista evidencia en la transcripción con estado `RESPONDIDA` o `AMBIGUA`. NO incluyas preguntas pendientes ni inventes `preguntaId`.',
    '3. Cada `citaEvidencia` debe ser una subcadena literal exacta copiada de `transcripcionCruda` que respalde la respuesta extraída.',
    '4. Si una respuesta es parcial, dudosa o indirecta, marcala como `AMBIGUA`.',
    '5. `categoriaId` debe corresponder al padre de `subcategoriaId` según el catálogo.',
    '',
    'CRITERIOS DE SEVERIDAD (`prioridadSugerida`):',
    '- `P1` (Crítica / Riesgo de vida inmediato): paro, dificultad respiratoria severa, anafilaxia, convulsión activa, personas atrapadas, incendio estructural/eléctrico activo, fuga de gas con riesgo de explosión, cable energizado chispeando, accidente vial con atrapado o traumatismo grave.',
    '- `P2` (Urgente / Alto impacto sin riesgo vital inminente): fracturas, síncopes con recuperación de conciencia, rescate en ascensor sin asfixia, derrumbes/marquesinas con riesgo de caída, socavones graves, disturbios con riesgo físico.',
    '- `P3` (Moderada / Operativa): incendio de contenedor controlado sin atrapados, camión atascado sin heridos, semáforos apagados en cruce sin choque actual, animal agresivo contenido.',
    '- `P4` (Baja / Administrativa o Preventiva): consultas informativas, reclamos administrativos, solicitudes de orientación o reportes sin riesgo físico ni urgencia operativa.',
    '',
    'PREGUNTAS UNIVERSALES (aplican a toda llamada):',
  ];

  for (const preg of resumenCatalogo.preguntasUniversales) {
    const tagCritica = preg.critica ? ' [CRÍTICA]' : '';
    lineas.push(`- [id=${preg.id}]${tagCritica} ${preg.texto}`);
  }

  lineas.push('');
  lineas.push('CATÁLOGO DE CATEGORÍAS, SUBCATEGORÍAS Y PREGUNTAS:');

  for (const cat of resumenCatalogo.categorias) {
    lineas.push(`[id=${cat.id}] ${cat.nombre} (${cat.etiqueta})`);
    for (const sub of cat.subcategorias) {
      lineas.push(`  - [id=${sub.id}] ${sub.nombre} (${sub.etiqueta}) — ${sub.criterio}`);
      for (const preg of sub.preguntas) {
        const tagCritica = preg.critica ? ' [CRÍTICA]' : '';
        lineas.push(`    * [id=${preg.id}]${tagCritica} ${preg.texto}`);
      }
    }
  }

  return lineas.join('\n');
}

/**
 * Construye el `user` prompt dinámico combinando hasta 2 ejemplos few-shot del CSV
 * (solo como guía de formato y calibración) con la transcripción actual.
 */
export function buildUserPrompt({
  transcripcionCruda,
  origenReporte,
  ejemplosFewShot,
  subcategoriaIdFijadaPorOperador,
}: BuildUserPromptParams): string {
  const lineas: string[] = [];

  if (ejemplosFewShot.length > 0) {
    lineas.push(
      'EJEMPLOS DE REFERENCIA (solo para calibrar criterio de prioridad, formato de notas y recursos; NO copies sus direcciones ni datos al caso actual):',
    );
    ejemplosFewShot.forEach((ejemplo, idx) => {
      lineas.push(
        `Ejemplo ${idx + 1} (${ejemplo.categoria} | ${ejemplo.prioridadSugerida}):`,
      );
      lineas.push(`  Transcripción: ${ejemplo.transcripcionCruda}`);
      lineas.push(
        `  Descripción: ${ejemplo.descripcionIncidente} | Notas CAD: ${ejemplo.notasOperativasDespacho}`,
      );
      lineas.push(
        `  Recursos sugeridos: ${ejemplo.recursosRecomendadosDespacho.join('; ')}`,
      );
    });
    lineas.push('');
  }

  if (origenReporte) {
    lineas.push(`ORIGEN DEL REPORTE: ${origenReporte}`);
  }

  if (
    subcategoriaIdFijadaPorOperador !== null &&
    subcategoriaIdFijadaPorOperador !== undefined &&
    Number.isInteger(subcategoriaIdFijadaPorOperador) &&
    subcategoriaIdFijadaPorOperador > 0
  ) {
    lineas.push(
      `RESTRICCIÓN DEL OPERADOR: El operador ya fijó manualmente subcategoriaId=${subcategoriaIdFijadaPorOperador}. Evaluá las preguntas de esa subcategoría y las preguntas universales.`,
    );
  }

  lineas.push('TRANSCRIPCIÓN ACTUAL A ANALIZAR:');
  lineas.push(transcripcionCruda.trim());

  return lineas.join('\n');
}

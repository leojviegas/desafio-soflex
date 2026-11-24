import type { HablanteTurno, TurnoDialogo } from '../types/domain';

const SPEAKER_REGEX = /\b(Operador|Llamante|Sistema)\s*:\s*/gi;

export function parseTurnosFromTranscripcion(transcripcionCruda: string): TurnoDialogo[] {
  const trimmed = transcripcionCruda.trim();
  if (!trimmed) {
    return [];
  }

  const matches = Array.from(trimmed.matchAll(SPEAKER_REGEX));
  if (matches.length === 0) {
    return [
      {
        indice: 1,
        hablante: 'LLAMANTE',
        texto: trimmed,
      },
    ];
  }

  const turnos: TurnoDialogo[] = [];

  if (matches[0].index !== undefined && matches[0].index > 0) {
    const preText = trimmed.slice(0, matches[0].index).trim();
    if (preText) {
      turnos.push({
        indice: turnos.length + 1,
        hablante: 'SISTEMA',
        texto: preText,
      });
    }
  }

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const rawSpeaker = current[1].toUpperCase();
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? trimmed.length;
    const texto = trimmed.slice(start, end).trim();

    if (!texto) {
      continue;
    }

    const hablante: HablanteTurno =
      rawSpeaker === 'OPERADOR'
        ? 'OPERADOR'
        : rawSpeaker === 'SISTEMA'
          ? 'SISTEMA'
          : 'LLAMANTE';

    turnos.push({
      indice: turnos.length + 1,
      hablante,
      texto,
    });
  }

  return turnos;
}

export function appendTurnoToTranscripcion(
  transcripcionActual: string,
  hablante: Exclude<HablanteTurno, 'SISTEMA'>,
  texto: string,
): string {
  const clean = texto.trim();
  if (!clean) {
    return transcripcionActual;
  }
  const prefix = hablante === 'OPERADOR' ? 'Operador:' : 'Llamante:';
  const base = transcripcionActual.trim();
  return base ? `${base}\n${prefix} ${clean}` : `${prefix} ${clean}`;
}

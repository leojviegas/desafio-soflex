export const HablanteTurno = Object.freeze({
  OPERADOR: 'OPERADOR',
  LLAMANTE: 'LLAMANTE',
} as const);

export type HablanteTurno = (typeof HablanteTurno)[keyof typeof HablanteTurno];

export const HABLANTES_TURNO = Object.freeze(
  Object.values(HablanteTurno),
) as readonly HablanteTurno[];

export function esHablanteTurno(value: unknown): value is HablanteTurno {
  return (
    typeof value === 'string' &&
    (HABLANTES_TURNO as readonly string[]).includes(value)
  );
}

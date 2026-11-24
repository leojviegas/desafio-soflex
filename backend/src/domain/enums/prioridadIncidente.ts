export const PrioridadIncidente = Object.freeze({
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
  P4: 'P4',
} as const);

export type PrioridadIncidente =
  (typeof PrioridadIncidente)[keyof typeof PrioridadIncidente];

export const PRIORIDADES_INCIDENTE = Object.freeze(
  Object.values(PrioridadIncidente),
) as readonly PrioridadIncidente[];

export function esPrioridadIncidente(value: unknown): value is PrioridadIncidente {
  return (
    typeof value === 'string' &&
    (PRIORIDADES_INCIDENTE as readonly string[]).includes(value)
  );
}

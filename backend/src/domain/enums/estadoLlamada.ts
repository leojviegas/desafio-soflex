export const EstadoLlamada = Object.freeze({
  EN_CURSO: 'EN_CURSO',
  DERIVADA: 'DERIVADA',
  DESCARTADA: 'DESCARTADA',
} as const);

export type EstadoLlamada = (typeof EstadoLlamada)[keyof typeof EstadoLlamada];

export const ESTADOS_LLAMADA = Object.freeze(
  Object.values(EstadoLlamada),
) as readonly EstadoLlamada[];

export function esEstadoLlamada(value: unknown): value is EstadoLlamada {
  return (
    typeof value === 'string' &&
    (ESTADOS_LLAMADA as readonly string[]).includes(value)
  );
}

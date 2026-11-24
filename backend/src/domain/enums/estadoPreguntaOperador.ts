export const EstadoPreguntaOperador = Object.freeze({
  CONFIRMADA: 'CONFIRMADA',
  PENDIENTE: 'PENDIENTE',
  NO_APLICA: 'NO_APLICA',
} as const);

export type EstadoPreguntaOperador =
  (typeof EstadoPreguntaOperador)[keyof typeof EstadoPreguntaOperador];

export const ESTADOS_PREGUNTA_OPERADOR = Object.freeze(
  Object.values(EstadoPreguntaOperador),
) as readonly EstadoPreguntaOperador[];

export function esEstadoPreguntaOperador(
  value: unknown,
): value is EstadoPreguntaOperador {
  return (
    typeof value === 'string' &&
    (ESTADOS_PREGUNTA_OPERADOR as readonly string[]).includes(value)
  );
}

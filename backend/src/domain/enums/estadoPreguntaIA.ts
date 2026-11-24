export const EstadoPreguntaIA = Object.freeze({
  RESPONDIDA: 'RESPONDIDA',
  AMBIGUA: 'AMBIGUA',
  PENDIENTE: 'PENDIENTE',
} as const);

export type EstadoPreguntaIA =
  (typeof EstadoPreguntaIA)[keyof typeof EstadoPreguntaIA];

export const ESTADOS_PREGUNTA_IA = Object.freeze(
  Object.values(EstadoPreguntaIA),
) as readonly EstadoPreguntaIA[];

export function esEstadoPreguntaIA(value: unknown): value is EstadoPreguntaIA {
  return (
    typeof value === 'string' &&
    (ESTADOS_PREGUNTA_IA as readonly string[]).includes(value)
  );
}

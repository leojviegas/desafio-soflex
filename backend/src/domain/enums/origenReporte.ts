export const OrigenReporte = Object.freeze({
  TELEFONIA_911: 'TELEFONIA_911',
  TELEFONIA_103: 'TELEFONIA_103',
  TELEFONIA_107: 'TELEFONIA_107',
  TELEFONIA_147: 'TELEFONIA_147',
  APP_CIUDADANA: 'APP_CIUDADANA',
  OTRO: 'OTRO',
} as const);

export type OrigenReporte = (typeof OrigenReporte)[keyof typeof OrigenReporte];

export const ORIGENES_REPORTE = Object.freeze(
  Object.values(OrigenReporte),
) as readonly OrigenReporte[];

export function esOrigenReporte(value: unknown): value is OrigenReporte {
  return (
    typeof value === 'string' &&
    (ORIGENES_REPORTE as readonly string[]).includes(value)
  );
}

export const NivelCerteza = Object.freeze({
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAJA: 'BAJA',
} as const);

export type NivelCerteza = (typeof NivelCerteza)[keyof typeof NivelCerteza];

export const NIVELES_CERTEZA = Object.freeze(
  Object.values(NivelCerteza),
) as readonly NivelCerteza[];

export function esNivelCerteza(value: unknown): value is NivelCerteza {
  return (
    typeof value === 'string' &&
    (NIVELES_CERTEZA as readonly string[]).includes(value)
  );
}

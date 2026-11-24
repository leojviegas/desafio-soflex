export const ProveedorIA = Object.freeze({
  MOCK: 'mock',
  GEMINI: 'gemini',
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  OPENAI_COMPATIBLE: 'openai-compatible',
} as const);

export type ProveedorIA = (typeof ProveedorIA)[keyof typeof ProveedorIA];

export const PROVEEDORES_IA = Object.freeze(
  Object.values(ProveedorIA),
) as readonly ProveedorIA[];

export function esProveedorIA(value: unknown): value is ProveedorIA {
  return (
    typeof value === 'string' &&
    (PROVEEDORES_IA as readonly string[]).includes(value)
  );
}

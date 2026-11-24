/**
 * Normaliza un texto para comparación léxica tolerante:
 * descompone Unicode (NFD), remueve diacríticos, pasa a minúsculas,
 * reemplaza signos de puntuación/símbolos por espacios y colapsa espacios.
 */
export function normalizarParaComparacion(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Limpia un texto opcional: devuelve `null` si es `null`, `undefined` o vacío tras `.trim()`.
 */
export function limpiarTextoOpcional(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) {
    return null;
  }
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

# Regla: Principios Críticos del Dominio Soflex

1. **Separación Operador vs Despachador CAD**:
   - El operador de atención no decide ni ejecuta el despacho de móviles en la calle.
   - El sistema genera recomendaciones de recursos y notas operativas como referencia para el despachador, pero la salida final del operador es la **Carta de Llamada** validada y derivada.
2. **Cero Alucinaciones en Datos Críticos**:
   - Si una calle, altura, intersección o barrio no aparece explícitamente en la transcripción, debe devolverse como `null` y listarse en `camposFaltantes`.
   - Toda extracción relevante debe incluir evidencia textual o nivel de certeza calibrado.
3. **Dual-Provider Siempre Funcional**:
   - `LLM_PROVIDER=mock` debe ser el comportamiento por defecto cuando no existen credenciales externas, garantizando un flujo punta a punta determinista y offline.
   - Si el proveedor real falla, excede timeout o devuelve salida inválida tras reintento, degradar de forma controlada indicando `degradado: true` al operador.
4. **Human-in-the-Loop Obligatorio**:
   - La IA asiste y sugiere; el operador valida, corrige y decide la derivación formal.
5. **Cero Secretos y DX Predecible**:
   - No commitear claves de API ni `.env` reales.
   - `docker compose up --build` debe levantar la solución completa y lista para usar sin pasos manuales.

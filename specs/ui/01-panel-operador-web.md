# Especificación de UI Web 01: Consola del Operador (`frontend/`)

## 1. Rol y Objetivo de la Pantalla

Proveer un puesto de trabajo web diseñado para operadores de emergencias bajo presión: lectura rápida, mínimo esfuerzo cognitivo, contraste claro de severidad y control humano explícito antes de derivar la Carta de Llamada al sistema CAD.

---

## 2. Estructura Visual (Desktop 3 Columnas + Responsive)

### Barra Superior (Header Operativo)
- Título e identificador de llamada activa + badge de estado (`EN_CURSO`, `DERIVADA`).
- Selector de casos de prueba del CSV (30 incidentes agrupados o buscables) + botón "Nueva Llamada Libre".
- Indicador en vivo de IA: `MODO SIMULADO (mock)` o `MODO REAL (<provider> / <model>)`, última latencia en `ms`, y alerta si `degradado === true`.
- Navegación rápida entre **Consola en Vivo** y **Cartas Derivadas (CAD)**.

### Columna 1 (Izquierda): Transcripción y Turnos
- Área de transcripción completa o vista por turnos (`Operador` / `Llamante`).
- Input rápido para agregar un nuevo turno del llamante o del operador y botón **Analizar / Re-analizar** (`Ctrl+Enter`).

### Columna 2 (Centro): Asistencia en Vivo del Copiloto
1. **Instrucciones de Seguridad Pre-Arribo** (tarjeta destacada de alto contraste):
   - Texto directo para leer al ciudadano.
   - Checkbox "Transmitida al llamante" por cada instrucción.
2. **Checklist Dinámico de Protocolo**:
   - Subsección **Pendientes por Preguntar** (priorizadas arriba para guiar el interrogatorio).
   - Subsección **Respondidas en Relato** (con badge de evidencia textual extraída).
   - El operador puede marcar manualmente una pregunta pendiente como confirmada.
3. **Riesgos Detectados y Certeza**:
   - Chips de riesgos identificados + indicador `Confianza: ALTA | MEDIA | BAJA`.

### Columna 3 (Derecha): Carta de Llamada (Salida a CAD)
- Formulario estructurado editable:
  - Ubicación normalizada: `Calle`, `Altura`, `Intersección`, `Barrio / Comuna`, `Referencia`.
  - Resaltado visual en `camposFaltantes` para que el operador sepa qué falta preguntar.
  - `Categoría`, `Subcategoría`, selector rápido de `Prioridad (P1..P4)` (atajos `Alt+1..4`).
  - `Notas Operativas para Despacho` y `Recursos Recomendados (Referencia CAD)`.
- Badge por campo indicando `Sugerido IA` vs `Confirmado Operador`.
- Botón primario **Derivar Carta a CAD** (`Alt+D`), deshabilitado con explicación clara si faltan campos mínimos o si la carta ya fue derivada.

---

## 3. Estados Visuales

- **Vacío inicial**: Guía breve con botón para cargar un caso del dataset o pegar una transcripción.
- **Cargando análisis**: Indicador no bloqueante en columnas 2 y 3 ("Procesando transcripción...").
- **Degradado**: Banner informativo ámbar indicando que el LLM externo no respondió y se aplicó el motor determinista local.
- **Derivada**: Banner de confirmación con hora de derivación y bloqueo de edición para preservar auditoría.

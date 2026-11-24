# Especificación de UI Web 01: Consola del Operador (`frontend/`)

## 1. Rol y Objetivo de la Pantalla

Proveer un puesto de trabajo web diseñado para operadores de emergencias bajo presión: lectura rápida, mínimo esfuerzo cognitivo, contraste claro de severidad y control humano explícito antes de derivar la `CartaDespacho` al sistema CAD.

---

## 2. Estructura Visual (Desktop 3 Columnas + Responsive)

### Barra Superior (Header Operativo)
- Identificador de llamada activa + badge de estado (`EN_CURSO`, `DERIVADA`, `DESCARTADA`).
- Selector de casos de prueba del CSV (30 incidentes buscables) + botón "Nueva Llamada Libre".
- Indicador en vivo de IA: `Modo simulado (mock)` o `Modo real (<provider> / <model>)`, última latencia en `ms`, y alerta si `degradado === true`.
- Navegación rápida entre **Consola en Vivo** (`Llamada`) y **Bandeja de Despacho CAD** (`CartaDespacho`).

### Columna 1 (Izquierda): Transcripción y Turnos
- Vista de `transcripcionCruda` renderizada por turnos (`Operador` / `Llamante`, parseados al vuelo desde el texto).
- Input rápido para anexar un nuevo turno del llamante o del operador a `transcripcionCruda` y botón **Analizar / Re-analizar** (`Ctrl+Enter`).

### Columna 2 (Centro): Asistencia en Vivo del Copiloto
1. **Instrucciones de Seguridad Pre-Arribo** (tarjeta destacada de alto contraste, provistas determinísticamente desde el catálogo `SQLite` según `subcategoriaId`):
   - Texto directo para leer al ciudadano, diferenciando directivas críticas.
   - Checkbox "Transmitida al llamante" por cada instrucción (`transmitida`).
2. **Checklist Dinámico de Protocolo**:
   - Subsección **Pendientes / Por Confirmar** (ítems `PENDIENTE` y `AMBIGUA` priorizados arriba; si `evidenciaVerificada === false`, mostrar aviso de verificación manual).
   - Subsección **Respondidas en Relato** (`RESPONDIDA`, mostrando `respuestaIA` y `citaEvidencia` verificada).
   - Acciones rápidas del operador por pregunta: marcar `CONFIRMADA`, `NO_APLICA` o agregar `notaOperador`.
3. **Riesgos Detectados y Certeza**:
   - Chips editables de `riesgosDetectados` + indicador `Confianza: ALTA | MEDIA | BAJA`.

### Columna 3 (Derecha): Borrador de Carta de Despacho (Salida a CAD)
- Formulario estructurado editable:
  - Ubicación normalizada: `Calle`, `Altura`, `Intersección`, `Barrio / Comuna`, `Referencia` con resaltado en `ubicacion.camposFaltantes`.
  - Selectores vinculados desde `GET /api/protocolos`: `Categoría` (`categoriaId`) -> `Subcategoría` (`subcategoriaId`). Al cambiar `subcategoriaId`, se recargan automáticamente el checklist y el pre-arribo de la Columna 2.
  - Campo `Descripción del incidente` (`descripcionIncidente`).
  - Selector rápido de `Prioridad` (`P1`..`P4`, atajos `Alt+1..4`).
  - `Notas Operativas para Despacho` (`notasOperativasDespacho`) y `Recursos Recomendados para Despacho` (`recursosRecomendadosDespacho`).
- Badge por campo indicando `Sugerido IA` vs `Editado Operador` (basado en `camposEditadosPorOperador`).
- Botón primario **Derivar a CAD** (`Alt+D`), deshabilitado con explicación clara si faltan campos mínimos o si la llamada ya fue derivada.

### Vista Secundaria: Bandeja de Cartas de Despacho (CAD)
- Consume `GET /api/cartas-despacho` con filtros por `prioridad` y `categoriaId`.
- Muestra exclusivamente los datos estructurados de cada `CartaDespacho` derivada (ubicación, tipología, `descripcionIncidente`, `prioridad`, `riesgosDetectados`, `recursosRecomendadosDespacho`, `notasOperativasDespacho`, hora de derivación), sin exponer `transcripcionCruda`.

---

## 3. Estados Visuales

- **Vacío inicial**: Guía breve con botón para cargar un caso del dataset o pegar una transcripción.
- **Cargando análisis**: Indicador no bloqueante en columnas 2 y 3 ("Procesando transcripción...").
- **Degradado**: Banner informativo ámbar indicando que el LLM externo no respondió y se aplicó el motor determinista local.
- **Derivada**: Banner de confirmación con identificador de `CartaDespacho`, hora de derivación y bloqueo de edición para preservar auditoría.

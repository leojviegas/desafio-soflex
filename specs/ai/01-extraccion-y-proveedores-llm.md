# Especificación de IA 01: Extracción Estructurada, Proveedores Dual y Pipeline de Protocolos

## 1. Patrón Dual-Provider en Dos Niveles (`providers/ai/`)

El backend desacopla los servicios de negocio de cualquier proveedor concreto mediante una interfaz única (`CopilotAnalyzerProvider`) y dos niveles de selección en el composition root (`src/inject.ts`):

```ts
export interface CopilotAnalyzerProvider {
  analyze(input: AnalyzeCallInput): Promise<AnalisisCopiloto>;
}
```

### Nivel 1: Selección de Modo (`buildAnalyzer` en `src/inject.ts`)
- Si `LLM_PROVIDER=mock` (valor por defecto cuando no hay credenciales externas): instancia `MockCopilotAnalyzer`.
- Si `LLM_PROVIDER` es `gemini` | `ollama` | `openai` | `openai-compatible`: construye el `LanguageModel` mediante `buildLanguageModel(config.llm)` e instancia `LlmCopilotAnalyzer` (con `MockCopilotAnalyzer` inyectado como respaldo opcional si `LLM_FALLBACK_TO_MOCK=true`).
- El servicio de aplicación (`LlamadaService`) depende únicamente de `CopilotAnalyzerProvider` y desconoce si detrás opera un LLM remoto, uno local o el motor determinista.

### Nivel 2: Adaptador de Modelo (`buildLanguageModel` en `src/providers/ai/llm.ts`)
Factory basada en **Vercel AI SDK** (`ai`) que devuelve un `LanguageModel` unificado según `config.llm.provider`:
- `gemini`: `@ai-sdk/google` (`createGoogleGenerativeAI({ apiKey })`, default `gemini-2.5-flash`). Requiere `GEMINI_API_KEY`.
- `ollama`: `ollama-ai-provider-v2` (`createOllama({ baseURL })`, default `http://localhost:11434/api`, modelo default `qwen2.5:7b`).
- `openai`: `@ai-sdk/openai` (`createOpenAI({ apiKey })`, default `gpt-4o-mini`). Requiere `OPENAI_API_KEY`.
- `openai-compatible`: `@ai-sdk/openai-compatible` (`createOpenAICompatible({ name, baseURL, apiKey })`) para servidores como Groq, vLLM o LM Studio. Requiere `LLM_BASE_URL`.

### Variables de Entorno de IA (`src/config/env.ts`)
- `LLM_PROVIDER`: `mock` (default) | `gemini` | `ollama` | `openai` | `openai-compatible`
- `LLM_MODEL`: sobrescribe el modelo por defecto del proveedor elegido
- `LLM_BASE_URL`: URL base para `ollama` o `openai-compatible`
- `GEMINI_API_KEY` / `OPENAI_API_KEY`: credenciales del proveedor real (nunca commiteadas)
- `LLM_TIMEOUT_MS`: timeout de llamada al modelo (default `15000`)
- `LLM_FALLBACK_TO_MOCK`: `true` (default) | `false`

---

## 2. Pipeline de Análisis (1er Flujo en 1 Sola Llamada + Post-Procesamiento Determinista)

### Paso 1: Construcción del `system` Prompt (Fijo en Todas las Requests)
El backend ejecuta un `JOIN` en `SQLite` entre `categorias`, `subcategorias` y `preguntas_protocolo` (tarda `< 0,1 ms` en local) y arma un bloque jerárquico compacto con los IDs numéricos autoincrementales:

```text
PREGUNTAS UNIVERSALES (aplican a toda llamada):
- [id=1] ¿Cuál es la dirección exacta, altura o intersección del incidente?
- [id=2] ¿Usted o las personas cercanas se encuentran en un lugar seguro en este momento?

CATÁLOGO DE CATEGORÍAS, SUBCATEGORÍAS Y PREGUNTAS:
[id=1] INCENDIO_RESCATE (Incendio y Rescate)
  - [id=1] incendio_estructural — fuego o humo en vivienda, comercio o edificio
    * [id=3] ¿Hay personas atrapadas en el interior?
    * [id=4] ¿Hay garrafas o cañería de gas activa?
    ...
```

El `system` prompt contiene únicamente:
1. Rol del copiloto (asistente de operador 911/103/107/147, no despachador CAD).
2. Reglas anti-alucinación y criterios de severidad `P1`..`P4` (incluyendo definición explícita de `P4` como reclamo administrativo/preventivo sin riesgo, ya que el CSV no posee ejemplos `P4`).
3. El catálogo completo de categorías, subcategorías y preguntas con sus IDs numéricos.

**Regla estricta**: las instrucciones de `instrucciones_prearribo_protocolo` **nunca** se envían al LLM.

### Paso 2: Construcción del `user` Prompt (Dinámico por Llamada)
1. **Retrieval *Few-Shot* sobre el CSV**: un buscador léxico local (`TF-IDF` / similitud de tokens normalizados sobre las 30 filas de `docs/dataset_challenge_soflex.csv`) selecciona los **2 casos más cercanos** a la transcripción actual, **excluyendo coincidencias exactas** (similitud muy cercana a `1`) para evitar *data leakage* al probar casos del propio dataset.
2. **Transcripción actual**: texto completo de `transcripcionCruda` (incluyendo turnos acumulados si se trata de un re-análisis).

### Paso 3: Salida Estructurada del LLM (`LlmCopilotOutputSchema` en Zod)
`LlmCopilotAnalyzer` invoca `generateObject` de `ai` con `temperature: 0.1`, `abortSignal: AbortSignal.timeout(timeoutMs)` y el esquema Zod estricto:
- `categoriaId: number` (entero positivo)
- `subcategoriaId: number` (entero positivo)
- `descripcionIncidente: string` (título descriptivo breve del hecho puntual)
- `ubicacion`: `{ calle, altura, interseccion, barrioComuna, referencia }` (todos `string | null`)
- `prioridadSugerida`: `"P1" | "P2" | "P3" | "P4"`
- `preguntasDetectadas`: array que incluye **únicamente** las preguntas del catálogo sobre las que exista evidencia en la transcripción:
  - `preguntaId: number`
  - `estado`: `"RESPONDIDA" | "AMBIGUA"`
  - `respuestaExtraida: string`
  - `citaEvidencia: string` (fragmento literal copiado de `transcripcionCruda`)
- `riesgosDetectados: string[]`
- `notasOperativasDespacho: string`
- `recursosRecomendadosDespacho: string[]`
- `confianzaGlobal`: `"ALTA" | "MEDIA" | "BAJA"`

### Paso 4: Guardrails Deterministas en Backend (Común a Modo Real y `mock`)
Antes de construir `AnalisisCopiloto`, el backend ejecuta un post-procesador determinista contra `SQLite` y `transcripcionCruda`:
1. **Consistencia de `subcategoriaId` y `categoriaId`**: verifica que `subcategoriaId` exista en `subcategorias` (si no existe, cae a la subcategoría de respaldo `general_otro`). Deriva `categoriaId` directamente desde `subcategorias.categoria_id` para evitar cruces inválidos.
2. **Validación de `ubicacion.camposFaltantes`**: calcula automáticamente qué datos faltan (`calle`, `altura`, `interseccion`, `barrioComuna`) a partir de los valores `null`.
3. **Verificación anti-alucinación y cálculo de pendientes por resta**:
   - Recupera desde `SQLite` las preguntas oficiales de `subcategoriaId` más las 2 preguntas universales (`subcategoria_id IS NULL`).
   - Descarta cualquier `preguntaId` devuelto por el modelo que no pertenezca a ese conjunto permitido.
   - Para cada pregunta en `preguntasDetectadas`, verifica si `citaEvidencia` existe en `transcripcionCruda` (comparación normalizada sin tildes, signos ni mayúsculas). Si no existe, marca `evidenciaVerificada: false` y degrada `estadoIA` a `AMBIGUA`.
   - Toda pregunta oficial del catálogo que **no** vino en `preguntasDetectadas` se agrega automáticamente con `estadoIA: "PENDIENTE"` (diseño *fail-safe*: una omisión del modelo nunca se interpreta como respondida).
4. **Inyección determinista de Pre-Arribo**: consulta en `SQLite` `SELECT * FROM instrucciones_prearribo_protocolo WHERE subcategoria_id = ?` y adjunta esas directivas verificadas al `AnalisisCopiloto` con `transmitida: false`.

---

## 3. Resiliencia y Modo Simulado (`MockCopilotAnalyzer`, `LLM_PROVIDER=mock`)

- **Resiliencia del Modo Real**: ante `RetryError`, timeout o fallo de validación de esquema, si `LLM_FALLBACK_TO_MOCK=true`, ejecuta `MockCopilotAnalyzer` y devuelve `degradado: true` con `motivoDegradacion`; si está deshabilitado, lanza `AiProviderUnavailableError` (HTTP `503`). Registra métricas en log (`provider`, `model`, `latenciaMs`, `inputTokens`, `outputTokens`) sin exponer secretos.
- **Modo Simulado (`MockCopilotAnalyzer`)**:
  - Opera 100% offline y de forma determinista sobre las mismas tablas del catálogo en `SQLite` y las 30 filas del CSV:
    1. Extrae ubicación con regex para calles de CABA (`Av. ...`, `al XXXX`, intersecciones `X y Y`, km de autopista, pisos/deptos) y diccionario de barrios/comunas, sin inventar campos ausentes.
    2. Clasifica `subcategoriaId` y `prioridadSugerida` combinando coincidencia léxica contra los criterios de `subcategorias`, las filas similares del CSV y reglas de severidad `P1`..`P4`.
    3. Evalúa `preguntasDetectadas` buscando `pistasMock` de cada pregunta en `transcripcionCruda` y extrayendo el fragmento real del texto como `citaEvidencia`.
    4. Pasa exactamente por el mismo Paso 4 determinista (verificación de citas, cálculo de `PENDIENTE` por resta e inyección de pre-arribo desde `SQLite`).

---

## 4. Roles del Dataset (`docs/dataset_challenge_soflex.csv`)

El CSV (30 casos, 18 columnas) se utiliza en 3 roles complementarios:
1. **Retrieval *Few-Shot* para el LLM**: inyecta los 2 casos más similares en el `user` prompt (calibración `P1`–`P3`, modismos porteños, formato de `notasOperativasDespacho` y vocabulario de `recursosRecomendadosDespacho`).
2. **Banco de Casos de Prueba en la UI**: expuesto vía `GET /api/dataset/llamadas` para cargar transcripciones realistas en 1 clic.
3. **Respaldo de reglas `mock` y suite de tests**: verificación automatizada del parser CSV (tolerante a espacios después de comas), normalización y contratos Zod.

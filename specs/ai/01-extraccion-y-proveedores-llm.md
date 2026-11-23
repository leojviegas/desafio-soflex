# Especificación de IA 01: Extracción Estructurada, Proveedores Dual y Uso del Dataset

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

### 1.1. Modo Real (`LlmCopilotAnalyzer`)
- Invoca `generateObject` de `ai` pasando:
  - `model`: instancia `LanguageModel` provista por `buildLanguageModel`.
  - `schema`: esquema estricto `AnalisisCopilotoOutputSchema` (Zod), que el SDK convierte a JSON Schema (Structured Outputs) y revalida al recibir la respuesta.
  - `system`: prompt fijo con rol de operador 911 (no despachador CAD), criterios `P1`..`P4` y reglas anti-alucinación.
  - `prompt`: bloque *few-shot* (2 ejemplos recuperados del CSV) + transcripción actual y turnos acumulados.
  - `temperature: 0.1` y `abortSignal: AbortSignal.timeout(timeoutMs)`.
- Registra métricas operativas en log (`provider`, `model`, `latenciaMs`, `inputTokens`, `outputTokens`) sin exponer secretos.
- **Resiliencia**: ante `RetryError`, timeout o fallo de validación de esquema, si `LLM_FALLBACK_TO_MOCK=true`, ejecuta `MockCopilotAnalyzer` y devuelve `degradado: true` con `motivoDegradacion`; si está deshabilitado, lanza `AiProviderUnavailableError` (HTTP `503`).

### 1.2. Modo Simulado (`MockCopilotAnalyzer`, `LLM_PROVIDER=mock`)
- Activo por defecto cuando no hay credenciales externas configuradas.
- Opera 100% offline y de forma determinista combinando:
  1. **Match contra catálogo CSV**: si la transcripción coincide con un incidente del dataset (o comparte alta similitud), utiliza su estructura de protocolo y normalización como base y re-evalúa dinámicamente las preguntas respondidas si el operador agregó nuevos turnos de diálogo.
  2. **Motor de reglas y extracción léxica para transcripciones libres**:
     - Regex para calles de CABA (`Av. ...`, `calle ... al XXXX`, intersecciones `X y Y`, pisos/deptos, km de autopista) y mapa de barrios/comunas.
     - Clasificador por palabras clave ponderadas hacia las 6 categorías y subcategorías del dominio.
     - Reglas de severidad `P1`..`P4` (riesgo vital inmediato, inconsciencia, fuego activo con atrapados, fuga de gas, choque con heridos -> `P1`; riesgo estructural/herido estable -> `P2`; daño material sin heridos -> `P3`; consulta/preventivo -> `P4`).
     - Plantillas de preguntas mandatorias e instrucciones pre-arribo por categoría tomadas del catálogo del CSV.

---

## 2. Explotación del Dataset (`docs/dataset_challenge_soflex.csv`)

El CSV (30 casos, 18 columnas) se utiliza en 4 roles complementarios:
1. **Catálogo de Protocolos y Plantillas**: Al iniciar el backend se indexan preguntas mandatorias, instrucciones pre-arribo y recursos típicos por `categoria` y `subcategoria`.
2. **Retrieval Few-Shot para el LLM**: Ante una transcripción nueva, un buscador léxico liviano (similitud por tokens normalizados / TF-IDF) selecciona los 2 ejemplos más cercanos del CSV como contexto *few-shot* para el prompt (excluyendo coincidencia exacta si el usuario está probando un caso del propio CSV para no hacer trampa en la demostración).
3. **Banco de Casos de Prueba en la UI**: Expuesto vía `GET /api/dataset/llamadas` para cargar en 1 clic casos realistas con modismos locales.
4. **Suite de Evaluación / Tests**: Verificación automatizada del analizador determinista y validación de esquemas.

---

## 3. Reglas Anti-Alucinación en el Prompt

- Instrucción explícita: *"Extraé únicamente hechos presentes en la transcripción. Si un dato de ubicación (calle, altura, intersección, barrio) no figura en el texto, devolvé `null` y agregalo a `camposFaltantes`. Nunca asumas una altura o barrio por deducción geográfica no mencionada."*
- Cada pregunta marcada como `RESPONDIDA_EN_RELATO` debe incluir la cita textual en `evidencia`.
- `confianzaGlobal` debe bajar a `MEDIA` o `BAJA` cuando falte la dirección exacta o el relato sea ambiguo.

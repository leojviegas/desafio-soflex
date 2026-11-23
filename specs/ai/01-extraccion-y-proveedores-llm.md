# Especificación de IA 01: Extracción Estructurada, Proveedores Dual y Uso del Dataset

## 1. Patrón Dual-Provider (`CopilotAnalyzerProvider`)

El backend desacopla el servicio de dominio de cualquier proveedor concreto mediante la interfaz:

```ts
export interface CopilotAnalyzerProvider {
  analyze(input: AnalyzeCallInput): Promise<AnalisisCopiloto>;
}
```

### 1.1. Modo Real (`LlmCopilotAnalyzer`)
- Usa **Vercel AI SDK** (`generateObject`) con esquema estricto `AnalisisCopilotoOutputSchema` (Zod) y temperatura baja (`0.1`) para maximizar determinismo.
- Factory `buildLanguageModel(config)` compatible con:
  - `gemini`: Google AI (`@ai-sdk/google`, ej. `gemini-2.5-flash`).
  - `ollama`: Servidor local Ollama (`ollama-ai-provider-v2`, ej. `qwen2.5:7b` o `llama3.1:8b`).
  - `openai` / `openai-compatible`: OpenAI, Groq, vLLM, LM Studio.
- **Timeout y Resiliencia**:
  - Timeout configurable (`LLM_TIMEOUT_MS`, default `15000`).
  - Si el proveedor falla por red, cuota, timeout o esquema inválido, si `LLM_FALLBACK_TO_MOCK=true` (recomendado en demo), degrada automáticamente a `MockCopilotAnalyzer` retornando `degradado: true`; si está deshabilitado, lanza `AiProviderUnavailableError` (HTTP `503`).

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

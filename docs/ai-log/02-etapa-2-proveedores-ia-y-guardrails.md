# Bitácora Etapa 2: Capa de IA Dual-Provider, Few-Shot Retrieval y Guardrails

- **Fecha**: 2026-11-24
- **Etapa**: Backend — Etapa 2

## Decisiones Técnicas y Hallazgos

1. **Alineación de `zod` a `^4.1.8` para compatibilidad limpia de `peerDependencies`**:
   - Al instalar los paquetes del Vercel AI SDK (`ai@^5.0.0`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible` y `ollama-ai-provider-v2`), `ollama-ai-provider-v2@^1.0.0` requirió `zod@^4.0.16`, mientras que el resto de los paquetes soportan `^3.25.76 || ^4.1.8`.
   - Se actualizó `zod` a `^4.1.8` en `backend/package.json` en lugar de usar `--legacy-peer-deps`, garantizando instalaciones deterministas con `npm ci` en Docker y manteniendo intactos los esquemas existentes de `env.ts` y `sqliteJsonSchemas.ts`.

2. **Esquema estructurado estricto (`LlmCopilotOutputSchema`)**:
   - Se utilizó `.nullable()` en lugar de `.optional()` en `UbicacionExtraidaSchema` para garantizar compatibilidad estricta con JSON Schema de proveedores como Gemini y OpenAI.
   - `preguntasDetectadas` solo admite `RESPONDIDA` o `AMBIGUA` con `citaEvidencia` obligatoria; las preguntas `PENDIENTE` se calculan determinísticamente por resta en el dominio (`ChecklistProtocolo.construirDesdeDetecciones`).

3. **Retrieval *few-shot* TF-IDF sin *data leakage***:
   - `CsvFewShotRetriever` indexa las 30 filas de `docs/dataset_challenge_soflex.csv` filtrando stopwords conversacionales (`Operador`, `Llamante`, saludos).
   - Excluye coincidencias exactas y cuasi-exactas (`similitud >= 0.92` o inclusión por subcadena con relación de longitud `>= 0.75`), cubriendo también el re-análisis cuando el operador agrega turnos cortos a un caso del dataset.

4. **Separación estricta de `system` prompt y pre-arribo**:
   - `buildSystemPrompt` consume `ProtocoloRepository.obtenerResumenParaPrompt()` (categorías, subcategorías y preguntas con IDs, más criterios explícitos `P1`–`P4`) sin incluir nunca `instrucciones_prearribo_protocolo`, las cuales se inyectan determinísticamente desde SQLite en el Paso 4 (`consolidarSalidaCopiloto`).

5. **Resiliencia y seguridad en `LlmCopilotAnalyzer` y `MockCopilotAnalyzer`**:
   - `MockCopilotAnalyzer` evalúa exclusivamente los turnos del `LLAMANTE` para no confundir preguntas del `OPERADOR` con respuestas, y extrae ubicación solo desde `transcripcionCruda`.
   - `LlmCopilotAnalyzer` aplica `AbortSignal.timeout`, registra métricas de latencia/tokens sin exponer secretos, sanitiza cualquier clave en mensajes de error (`sanitizarMensajeErrorIA`) y degrada de forma controlada a `MockCopilotAnalyzer` con `degradado: true` (o lanza `AiProviderUnavailableError` cuando `LLM_FALLBACK_TO_MOCK=false`).

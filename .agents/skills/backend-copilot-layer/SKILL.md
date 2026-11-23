---
name: backend-copilot-layer
description: >-
  Use this skill when implementing or updating backend domain entities,
  repositories, AI dual-provider analyzers (Gemini, Ollama, OpenAI-compatible,
  and deterministic mock), CSV protocol retrieval, Zod schemas, services,
  controllers, routes, or backend tests.
---

# Backend Copilot Layer Skill (`backend/`)

Guía la implementación modular del Back-End con arquitectura en capas y patrón desacoplado de proveedor IA.

---

## 1. Patrón Dual-Provider (`providers/ai/`)

1. Definir la interfaz `CopilotAnalyzerProvider` con un método `analyze(input: AnalyzeCallInput): Promise<AnalisisCopiloto>`.
2. **Modo Real (`LlmCopilotAnalyzer`)**:
   - Utiliza Vercel AI SDK (`generateObject`) con el esquema estricto `AnalisisCopilotoOutputSchema` (Zod) y temperatura baja (`0` a `0.2`).
   - Factory `buildLanguageModel(config)` desacoplada por `LLM_PROVIDER`: `gemini`, `ollama`, `openai`, `openai-compatible`.
   - Enriquecer el prompt con 2 a 3 ejemplos recuperados por similitud léxica desde el catálogo del CSV (excluyendo coincidencia exacta de transcripción cuando se prueba un caso del propio dataset para evitar fuga de respuestas).
   - Configurar timeout explícito y manejo de errores (`RetryError` / validación fallida) con degradación controlada a fallback si se habilita, marcando `degradado: true`.
3. **Modo Simulado (`MockCopilotAnalyzer`)**:
   - Activo por defecto cuando `LLM_PROVIDER=mock` o falta credencial externa.
   - Combina el catálogo de protocolos del CSV con un motor determinista de reglas/palabras clave (regex para calles/alturas/intersecciones/barrios de CABA y clasificadores léxicos para categoría y severidad `P1`-`P4`) para funcionar tanto con los 30 casos del dataset como con transcripciones libres.

---

## 2. Capas, Inyección y Errores

- `inject`: único lugar donde se lee `config`, se carga el catálogo CSV, se instancia el repositorio, el proveedor IA y los servicios.
- `services/`: orquestan `CartaLlamada`, registran qué campos editó manualmente el operador y validan las transiciones de estado (`EN_CURSO` -> `DERIVADA` | `DESCARTADA`).
- `middlewares/errorHandler`: mapea `RequestValidationError` / `DomainValidationError` -> `400`, `NotFoundError` -> `404`, `InvalidStateTransitionError` / `ConflictError` -> `409`, `AiProviderUnavailableError` -> `503`.

---

## 3. Testing

- Ejecutar tests con Vitest + Supertest inyectando `MockCopilotAnalyzer` o fakes deterministas (sin llamadas a APIs externas).
- Cubrir invariantes de dominio, transiciones de derivación, validación Zod y fallback ante fallos del proveedor.

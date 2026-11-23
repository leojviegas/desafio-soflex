# AGENTS.md — Reglas del Módulo Back-End (`backend/`)

Este archivo define las directrices específicas para el desarrollo del Back-End del **Copiloto Asistente para Operadores de Sala**.

---

## 1. Stack Consolidado (según `docs/adr/001-decisiones-arquitectura-y-stack.md`)

- **Lenguaje y Runtime**: TypeScript estricto (`Node.js` + `Express 5`, ESM).
- **Persistencia**: SQLite embebido encapsulado detrás de interfaces de repositorio (con soporte `:memory:` para tests).
- **IA y Validación**: Vercel AI SDK (`ai`) + `@ai-sdk/google` (Gemini) + `ollama-ai-provider-v2` + `@ai-sdk/openai` / `@ai-sdk/openai-compatible` + `MockCopilotAnalyzer` por defecto + `zod`.
- **Testing**: Vitest + Supertest.

---

## 2. Arquitectura en Capas (`backend/src/`)

- **`config/`**: Carga y validación de variables de entorno (`PORT`, `LLM_PROVIDER`, `LLM_MODEL`, API keys, timeouts).
- **`domain/`**:
  - `entities/`: Entidades y objetos de valor (`CartaLlamada`, `AnalisisCopiloto`, `UbicacionNormalizada`, `PreguntaProtocolo`, `InstruccionPreArribo`, `ProtocoloReferencia`).
  - `enums/`: Enumeraciones congeladas (`CategoriaIncidente`, `PrioridadIncidente`, `EstadoCartaLlamada`, `OrigenReporte`, `EstadoPreguntaProtocolo`, `NivelCerteza`).
  - `errors/`: Jerarquía de errores de dominio (`DomainValidationError`, `InvalidStateTransitionError`).
- **`repositories/`**: Encapsulamiento de la persistencia (cartas de llamada y catálogo de protocolos/dataset).
- **`providers/ai/`**:
  - Interfaz `CopilotAnalyzerProvider`.
  - Factory `buildLanguageModel` para proveedores reales (Gemini, Ollama, OpenAI, OpenAI-compatible) usando Vercel AI SDK (`generateObject` + Zod).
  - Implementación `LlmCopilotAnalyzer` (Modo Real) y `MockCopilotAnalyzer` (Modo Simulado determinista).
  - Servicio de retrieval liviano sobre `docs/dataset_challenge_soflex.csv` para few-shot prompting y catálogo de protocolos.
- **`schemas/`**: Esquemas Zod compartidos para validación HTTP (`req.body`, `req.query`) y validación de salida estructurada del LLM.
- **`services/`**: Orquestación de casos de uso (crear llamada, analizar transcripción, actualizar borrador humano, derivar carta a CAD, consultar catálogo e historial).
- **`controllers/` y `routes/`**: Manejo HTTP limpio delegando la lógica de negocio a `services/`.
- **`middlewares/`**: `errorHandler` declarativo (`400`, `404`, `409`, `502`/`503`, `500`) y `notFoundHandler`.
- **`inject`**: Composition root único que instancia repositorios, proveedor IA, servicios y controladores mediante inyección de dependencias.

---

## 3. Testing y Calidad

- Los tests unitarios y de integración deben inyectar proveedores fake o usar `LLM_PROVIDER=mock` para ejecutarse rápido, sin costo y sin red.
- Validar siempre los casos borde de esquemas malformados, timeouts de LLM y degradación controlada al fallback determinista.
- Nunca hardcodear ni loguear API keys o secretos.

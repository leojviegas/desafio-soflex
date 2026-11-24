# Bitácora Etapa 4: Integración del Front-End con la API REST Real

- **Fecha**: 2026-11-24
- **Etapa**: Front-End / Integración — Etapa 4

## Decisiones Técnicas y Hallazgos

1. **Activación de `HttpCopilotApiClient` por defecto**:
   - Se actualizó [frontend/src/services/index.ts](../../frontend/src/services/index.ts) para utilizar `HttpCopilotApiClient('/api')` por defecto (`VITE_USE_MOCK_API === 'true'` solo para modo aislado sin backend) y se documentó la configuración en `frontend/.env.example`.
   - En [frontend/src/services/httpApiClient.ts](../../frontend/src/services/httpApiClient.ts) se agregó manejo explícito de errores de red (`NETWORK_ERROR`), lectura de `code` del backend, envío condicional de `Content-Type: application/json` solo cuando hay cuerpo y soporte para `simularDegradado` en `analizarLlamada`.

2. **Edición fluida con debounce, flush y cola serializada de `PATCH`**:
   - Contra SQLite y la normalización del dominio (`.trim()`), disparar un `PATCH` por cada tecla provocaba condiciones de carrera y pérdida de espacios finales al escribir.
   - Se refactorizó [frontend/src/features/dispatch/DispatchDraftColumn.tsx](../../frontend/src/features/dispatch/DispatchDraftColumn.tsx) con estado local controlado, registro de campos modificados (`dirtyFieldsRef`), debounce de `350 ms`, guardado al perder el foco (`onBlur`) y un método `flushPendingDraft` invocado desde [frontend/src/App.tsx](../../frontend/src/App.tsx) antes de anexar turnos, re-analizar o derivar a CAD.
   - En `App.tsx`, todas las mutaciones `PATCH` se serializan mediante una cola de promesas (`patchQueueRef`) para garantizar orden estricto de escritura en el backend.

3. **Atajos, sesión activa y filtros server-side en Bandeja CAD**:
   - Se detuvo la propagación de `Ctrl+Enter` (`e.stopPropagation()`) en [frontend/src/features/transcript/TranscriptColumn.tsx](../../frontend/src/features/transcript/TranscriptColumn.tsx) para evitar doble ejecución junto con `useOperatorShortcuts`.
   - Se persistió el identificador de la llamada activa en `sessionStorage` para recuperar la sesión tras recargar la página.
   - [frontend/src/pages/CadTrayPage.tsx](../../frontend/src/pages/CadTrayPage.tsx) ahora delega los filtros por `prioridad` y `categoriaId` en `GET /api/cartas-despacho`, manteniendo separado el conteo total mostrado en el encabezado.

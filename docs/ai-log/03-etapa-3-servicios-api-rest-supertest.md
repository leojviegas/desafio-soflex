# Bitácora Etapa 3: Servicios, API REST, Composition Root y Tests con Supertest

- **Fecha**: 2026-11-24
- **Etapa**: Backend — Etapa 3

## Decisiones Técnicas y Hallazgos

1. **Compatibilidad con Express 5 (`express@^5.3.0`) y Zod v4 (`zod@^4.6.7`)**:
   - En Express 5, `req.query` es solo lectura y `express.json()` deja `req.body` como `undefined` cuando un `POST` se envía sin cuerpo (por ejemplo `POST /api/llamadas/:id/analizar`, `/derivar` o `/descartar`). Se normalizó `req.body ?? {}` en los controladores con body opcional y se validó `req.query` hacia objetos tipados locales sin mutar `req.query`.
   - Express 5 propaga automáticamente promesas rechazadas desde handlers `async`, eliminando la necesidad de wrappers `try/catch` en cada método de controlador.

2. **DTO de `Llamada` alineado con el Front-End (`cartaDespacho`)**:
   - `LlamadaService` adjunta `cartaDespacho: CartaDespacho | null` en la respuesta serializada de `Llamada` (consultándola desde `CartaDespachoRepository` cuando `estado === 'DERIVADA'`), permitiendo que el panel web muestre el identificador y timestamp de derivación tras recargar o consultar una llamada derivada.

3. **Cambio manual de subcategoría y protección Human-in-the-Loop**:
   - En `PATCH /api/llamadas/:id`, si el operador modifica `subcategoriaId` (o `categoriaId`), `LlamadaService` valida existencia y pertenencia contra `SqliteProtocoloRepository`, construye `ProtocoloSubcategoria` y delega en `Llamada.cambiarProtocoloPorOperador` para recargar checklist e instrucciones pre-arribo desde `SQLite` preservando preguntas universales ya confirmadas.

4. **Composition Root único (`inject.ts`) y sanitización de errores (`errorHandler.ts`)**:
   - `buildApp` centraliza la lectura de configuración, apertura de SQLite, carga del CSV, instanciación de `CopilotAnalyzerProvider` y cableado de servicios/controladores, exponiendo `close()` idempotente y cerrando la base si falla la inicialización.
   - `errorHandler` mapea errores de validación, dominio, negocio, estado y disponibilidad de IA a códigos HTTP estándar (`400`, `404`, `409`, `503`, `500`), redactando posibles credenciales en mensajes de error mediante `sanitizarMensajeErrorIA`.

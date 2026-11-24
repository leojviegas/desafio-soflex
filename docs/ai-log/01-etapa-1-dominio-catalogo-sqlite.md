# Bitácora Etapa 1: Dominio, Catálogo CSV y Persistencia SQLite

- **Fecha**: 2026-11-23
- **Etapa**: Backend — Etapa 1

## Decisiones Técnicas y Hallazgos

1. **Modelo de dominio orientado a clases y granularidad por archivo**:
   - Cada entidad u objeto de valor (`CartaLlamada`, `AnalisisCopiloto`, `UbicacionNormalizada`, `TurnoDialogo`, `PreguntaProtocolo`, `InstruccionPreArribo`, `ProtocoloReferencia`) se implementó como clase en su propio archivo en `backend/src/domain/entities/` con validación de invariantes en constructor.
   - Cada enumeración congelada (`Object.freeze`) se ubicó en su propio archivo en `backend/src/domain/enums/` con su tipo y type guard, dejando `backend/src/domain/index.ts` exclusivamente como barrel de re-exportación.
   - Los errores quedaron separados por capa (`DomainError.ts` en dominio y `RepositoryError.ts` en repositorios).

2. **SQLite nativo vía `node:sqlite` (`DatabaseSync`)**:
   - Se utilizó el módulo integrado `node:sqlite` en lugar de `better-sqlite3` o `sqlite3` para evitar compilación nativa C++ (`node-gyp`) en Windows y en la imagen Docker.
   - El acceso a SQLite quedó encapsulado detrás de la interfaz asíncrona `CartaLlamadaRepository` (`SqliteCartaLlamadaRepository`), permitiendo pruebas rápidas en `:memory:` y persistencia en disco con `WAL` para ejecución real.

3. **Parser CSV tolerante a padding en `docs/dataset_challenge_soflex.csv`**:
   - Al inspeccionar el dataset real se detectó que las columnas incluyen espacios de alineación antes y después de las comas, incluyendo espacios antes de las comillas de apertura (por ejemplo `, "Operador: ..."`).
   - Se implementó `parseCsv` compatible con RFC-4180 que consume espacios antes/después de campos entrecomillados sin perder saltos ni comas internas.

4. **Protección granular de overrides humanos (`Human-in-the-Loop`)**:
   - `CartaLlamada.aplicarAnalisis` protege cada campo editado manualmente por el operador (`camposEditadosPorOperador`), incluyendo subcampos individuales de `ubicacionValidada` (`ubicacionValidada.calle`, `ubicacionValidada.altura`, etc.), además de conservar el estado `transmitida: true` en instrucciones pre-arribo y `CONFIRMADA_OPERADOR` en preguntas del checklist.

5. **Parseo estricto de booleanos en `env.ts`**:
   - Se evitó `z.coerce.boolean()` porque en JavaScript la cadena `"false"` se evalúa como `true`; se implementó un preprocesador explícito que acepta `'true'/'1'/'yes'` y `'false'/'0'/'no'`.

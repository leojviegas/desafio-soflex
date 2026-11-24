# Bitácora Etapa 1: Dominio, Catálogo CSV y Persistencia SQLite

- **Fecha**: 2026-11-23 (actualizada 2026-11-24)
- **Etapa**: Backend — Etapa 1

## Decisiones Técnicas y Hallazgos

1. **Modelo de dominio modular con Value Objects cohesivos y granularidad por archivo**:
   - Se adoptó una descomposición rica del agregado `Llamada` (`crear` / `rehidratar`) y el entregable inmutable `CartaDespacho` (`crearDesdeLlamada` / `rehidratar`) apoyándose en objetos de valor especializados: `FichaIncidente`, `UbicacionNormalizada`, `Transcripcion`, `TurnoDialogo`, `ChecklistProtocolo`, `ItemChecklistLlamada`, `ItemInstruccionPreArribo`, `RegistroEdicionesOperador`, `AnalisisCopiloto`, `MetadatosEjecucionIA` y `ProtocoloSubcategoria`, junto con las entidades de catálogo (`CategoriaProtocolo`, `SubcategoriaProtocolo`, `PreguntaProtocoloDef`, `InstruccionPreArriboDef`).
   - Cada enumeración congelada (`Object.freeze(...) as const` + tipo unión + *type guard*) se ubicó en su propio archivo en `backend/src/domain/enums/`, dejando `backend/src/domain/index.ts` exclusivamente como barrel de re-exportación.
   - Los errores quedaron separados por capa (`DomainError.ts` en dominio y `RepositoryError.ts` en repositorios).

2. **Reglas deterministas del Paso 4 de IA en el dominio (sin carpeta adicional)**:
   - La verificación normalizada de citas textuales (`Transcripcion.contieneEvidencia` + `textoNormalizer.ts`), el descarte de `preguntaId` ajenos al protocolo, la degradación de evidencia no verificada a `AMBIGUA`, el cálculo *fail-safe* de preguntas `PENDIENTE` por resta (`ChecklistProtocolo.construirDesdeDetecciones`) y la consolidación con pre-arribo (`AnalisisCopiloto.consolidarDesdeDetecciones`) viven en el dominio puro para garantizar paridad entre Modo Real y `mock`.

3. **Decisiones sobre `OrigenReporte`, `HablanteTurno` y `CasoReferenciaCsv`**:
   - **`OrigenReporte` como enum**: Se mantuvo como enum en `domain/enums/origenReporte.ts` para evitar sobre-ingeniería en el prototipo de 72 horas sin ABM de administración; en un despliegue productivo multi-jurisdicción se recomienda migrarlo a una tabla maestra `origenes_reporte` configurable.
   - **`HablanteTurno` sin `SISTEMA`**: Se retiró el valor residual `SISTEMA` en backend y frontend, dejando únicamente `OPERADOR` y `LLAMANTE`.
   - **`CampoEditableLlamada`**: Se tiparon explícitamente las 12 claves editables protegidas por `RegistroEdicionesOperador` para evitar errores silenciosos de strings en la protección *Human-in-the-Loop*.
   - **`CasoReferenciaCsv` en `repositories/`**: Se ubicó en `backend/src/repositories/casoReferenciaCsv.ts` para no mezclar el formato de lectura del dataset CSV con las entidades del negocio 911/CAD.

4. **SQLite nativo vía `node:sqlite` (`DatabaseSync`)**:
   - Se utilizó el módulo integrado `node:sqlite` en lugar de `better-sqlite3` o `sqlite3` para evitar compilación nativa C++ (`node-gyp`) en Windows y en la imagen Docker.
   - El acceso a SQLite quedó encapsulado detrás de interfaces de repositorio (`LlamadaRepository`, `CartaDespachoRepository`, `ProtocoloRepository`), permitiendo pruebas rápidas en `:memory:` y persistencia en disco con `WAL` para ejecución real.

5. **Parser CSV tolerante a padding en `docs/dataset_challenge_soflex.csv`**:
   - Al inspeccionar el dataset real se detectó que las columnas incluyen espacios de alineación antes y después de las comas, incluyendo espacios antes de las comillas de apertura (por ejemplo `, "Operador: ..."`).
   - Se implementó `parseCsv` compatible con RFC-4180 que consume espacios antes/después de campos entrecomillados sin perder saltos ni comas internas.

6. **Parseo estricto de booleanos en `env.ts`**:
   - Se evitó `z.coerce.boolean()` porque en JavaScript la cadena `"false"` se evalúa como `true`; se implementó un preprocesador explícito que acepta `'true'/'1'/'yes'` y `'false'/'0'/'no'`.

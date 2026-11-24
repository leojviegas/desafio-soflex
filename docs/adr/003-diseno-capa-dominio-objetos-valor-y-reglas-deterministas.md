# ADR 003: Diseño de la Capa de Dominio con Objetos de Valor Cohesivos y Reglas Deterministas

- **Estado**: Aceptado
- **Fecha**: 2026-11-24

---

## 1. Descomposición del Dominio mediante Objetos de Valor Cohesivos (`backend/src/domain/`)

### Contexto
Tras definir el esquema SQLite de 6 tablas y la separación 1:1 entre `llamadas` y `cartas_despacho` en [ADR 002](./002-modelo-catalogo-protocolos-y-separacion-carta-despacho.md), era necesario diseñar la capa de dominio del backend garantizando:
1. Separación estricta de responsabilidades entre `domain/`, `repositories/`, `providers/ai/` y `services/`.
2. Protección granular *Human-in-the-Loop* ante re-análisis del copiloto.
3. Preservación de auditoría histórica de preguntas e instrucciones presentadas al operador en cada emergencia.
4. Compatibilidad con los repositorios SQLite existentes y testabilidad unitaria sin base de datos ni llamadas de red.

### Opciones Evaluadas
1. **Agregado monolítico con referencias por ID**: todas las reglas concentradas directamente en `Llamada`, con duplicación de campos operativos entre `Llamada`, `CartaDespacho` y `AnalisisCopiloto`. Simple al inicio, pero sobrecarga al agregado y desplaza reglas de verificación hacia `providers/ai/`.
2. **Grafo orientado a objetos con referencias directas a entidades de catálogo**: `Llamada` e ítems de checklist referenciando instancias vivas de `SubcategoriaProtocolo` y `PreguntaProtocoloDef`. Garantiza coherencia en memoria, pero acopla `SqliteLlamadaRepository` con `SqliteProtocoloRepository` y compromete la auditoría histórica si se modifica un texto del catálogo en el futuro.
3. **Dominio modular con objetos de valor cohesivos y referencias por ID + snapshot histórico** *(Elegida)*: `Llamada` y `CartaDespacho` coordinan el ciclo de vida y delegan en objetos de valor especializados (`FichaIncidente`, `UbicacionNormalizada`, `Transcripcion`, `TurnoDialogo`, `ChecklistProtocolo`, `ItemChecklistLlamada`, `ItemInstruccionPreArribo`, `RegistroEdicionesOperador`, `AnalisisCopiloto`, `MetadatosEjecucionIA` y `ProtocoloSubcategoria`).

### Decisión
Adoptar el modelo modular con objetos de valor cohesivos, granularidad estricta de un archivo por clase (`domain/entities/`) y un archivo por enum (`domain/enums/`), métodos de fábrica `crear` / `crearDesdeLlamada` y `rehidratar` más serialización `toSnapshot()` / `toJSON()` en entidades de ciclo de vida, y constructores defensivos con `DomainValidationError` en todos los objetos de valor y entidades de catálogo.

---

## 2. Ubicación de las Reglas Deterministas del Paso 4 de IA

### Contexto
El Paso 4 definido en [specs/ai/01-extraccion-y-proveedores-llm.md](../../specs/ai/01-extraccion-y-proveedores-llm.md) (descarte de `preguntaId` fuera de protocolo, verificación normalizada de `citaEvidencia`, degradación a `AMBIGUA` con `evidenciaVerificada: false`, cálculo *fail-safe* de `PENDIENTE` por resta y cálculo de `ubicacion.camposFaltantes`) es lógica central de negocio y debe ejecutarse de forma idéntica en Modo Real y en Modo Simulado (`mock`).

### Opciones Evaluadas
1. **Helper en `backend/src/utils/` o `providers/ai/`**: mezcla reglas críticas de negocio con utilidades genéricas o adaptadores de infraestructura.
2. **Domain Service separado (`domain/services/`)**: válido, pero añade una subcarpeta adicional cuando cada regla ya tiene un dueño natural en el modelo.
3. **Reglas repartidas en los objetos de valor de `domain/entities/` + utilidad pura `domain/utils/textoNormalizer.ts`** *(Elegida)*:
   - `UbicacionNormalizada` calcula automáticamente `camposFaltantes` sobre `calle`, `altura`, `interseccion` y `barrioComuna` (excluyendo `referencia` por ser contextual opcional).
   - `Transcripcion` valida citas mediante `contieneEvidencia()` apoyándose en `normalizarParaComparacion()`.
   - `ChecklistProtocolo.construirDesdeDetecciones()` descarta IDs ajenos, verifica citas y completa `PENDIENTE` por resta.
   - `AnalisisCopiloto.consolidarDesdeDetecciones()` integra todo con `ProtocoloSubcategoria` e inyecta las instrucciones de pre-arribo locales.

### Decisión
Alojar las guardas anti-alucinación y el cálculo por resta directamente en los objetos de valor del dominio, dejando únicamente la normalización léxica pura en `domain/utils/textoNormalizer.ts`.

---

## 3. Enumeraciones Congeladas y Decisiones Específicas de Modelado

### Decisión
Todas las enumeraciones se implementan como objetos congelados (`Object.freeze(...) as const`) con tipo unión derivado, lista inmutable de valores y *type guard* `es<Nombre>`:

1. **`OrigenReporte` como enum (`TELEFONIA_911`, `TELEFONIA_103`, `TELEFONIA_107`, `TELEFONIA_147`, `APP_CIUDADANA`, `OTRO`)**:
   - Se mantiene como enum para el prototipo de 72 horas dado que no existe módulo administrativo de canales y el canal no altera protocolos ni prompts.
   - **Evolución futura en producción**: migrar a una tabla maestra `origenes_reporte` configurable por municipio/jurisdicción (para incorporar canales como apps provinciales, botones antipánico o bots sin despliegues de código).
2. **`HablanteTurno` reducido a `OPERADOR` y `LLAMANTE`**:
   - Se retiró el valor residual `SISTEMA` (arrastrado de un borrador previo con `turnos_json`) tanto en backend como en frontend; cualquier fragmento libre sin prefijo al inicio de una transcripción se asigna por defecto a `LLAMANTE`.
3. **Checklist en dos planos independientes (`EstadoPreguntaIA` + `EstadoPreguntaOperador`)**:
   - `EstadoPreguntaIA` (`RESPONDIDA`, `AMBIGUA`, `PENDIENTE`) y `EstadoPreguntaOperador` (`CONFIRMADA`, `PENDIENTE`, `NO_APLICA`, o `null` sin intervención humana). Permite que sucesivos re-análisis actualicen el plano de IA sin perder la decisión ni las notas del operador.
4. **`CampoEditableLlamada` + `RegistroEdicionesOperador`**:
   - Enum congelado con las 12 claves editables (`categoriaId`, `subcategoriaId`, `descripcionIncidente`, `prioridad`, `ubicacion.*`, `riesgosDetectados`, `recursosRecomendadosDespacho`, `notasOperativasDespacho`) para eliminar strings sueltos en la protección de overrides humanos.
5. **`CasoReferenciaCsv` en `backend/src/repositories/casoReferenciaCsv.ts`**:
   - Se ubica en la capa de repositorios (fuera de `domain/entities/`) porque modela una fila de lectura del archivo CSV sintético usado para *few-shot*, pruebas y respaldo del `mock`, no una entidad operativa del negocio 911/CAD.

---

## 4. Consecuencias

- **Positivas**: alta testabilidad de las reglas críticas del copiloto en milisegundos sin I/O, cero duplicación del Paso 4 entre Modo Real y `mock`, contratos alineados entre backend SQLite y frontend, y trazabilidad histórica intacta en `llamadas` y `cartas_despacho`.
- **Compromisos**: mayor cantidad de archivos en `domain/entities/` (17 clases) y en `Llamada` se mantienen getters delegados hacia `FichaIncidente` para conservar ergonomía y compatibilidad directa con los repositorios ya implementados.

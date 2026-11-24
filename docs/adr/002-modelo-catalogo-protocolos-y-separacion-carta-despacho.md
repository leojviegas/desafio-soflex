# ADR 002: Catálogo Normalizado de Protocolos en SQLite, Pipeline Fail-Safe y Separación `Llamada` / `CartaDespacho`

- **Estado**: Aceptado
- **Fecha**: 2026-11-24

---

## 1. Catálogo Normalizado en SQLite (`categorias` -> `subcategorias` -> `preguntas_protocolo` / `instrucciones_prearribo_protocolo`)

### Contexto
Al auditar `docs/dataset_challenge_soflex.csv` (30 filas, 6 categorías) se detectaron tres particularidades clave:
1. Cada fila posee una redacción única en la columna `subcategoria` (30 títulos distintos) y las columnas `preguntas_protocolo_mandatorias`, `preguntas_respondidas_en_relato` y `preguntas_pendientes` fueron redactadas caso por caso sin compartir un catálogo normalizado de IDs.
2. Dentro de una misma categoría macro conviven escenarios con protocolos e instrucciones de seguridad opuestas (por ejemplo, en `INCENDIO_RESCATE` conviven incendios eléctricos/litio donde está prohibido arrojar agua con rescates de ascensor trabado sin fuego; en `EMERGENCIA_MEDICA` conviven lipotimia —elevar piernas— con crisis asmática —sentar erguido, nunca acostar—).
3. El dataset no incluye ejemplos de prioridad `P4`, por lo que `P4` debe definirse explícitamente en reglas y prompt.

### Opciones Evaluadas
1. **Lista plana de 5 preguntas fijas por cada una de las 6 categorías**: demasiado generalista; genera preguntas irrelevantes (preguntar por llamas en un ascensor trabado) y no permite directivas de pre-arribo seguras por escenario.
2. **Pool plano con todas las preguntas del CSV por categoría filtrado por el LLM**: funciona en modo real, pero dificulta el modo determinista `LLM_PROVIDER=mock`, impide detectar omisiones del LLM y mezcla instrucciones de seguridad opuestas.
3. **Catálogo relacional normalizado en SQLite con IDs enteros autoincrementales (`categorias` -> `subcategorias` -> `preguntas_protocolo` e `instrucciones_prearribo_protocolo`)** *(Elegida)*:
   - Agrupa los 30 casos en 7 categorías (6 del CSV + `OTRO`) y 21 subcategorías operativas coherentes, más 2 preguntas universales (`subcategoria_id IS NULL`).
   - La vieja columna `subcategoria` del CSV pasa a ser el campo descriptivo libre `descripcionIncidente`.

### Decisión
Persistir el catálogo en 4 tablas relacionales de `SQLite` con `INTEGER PRIMARY KEY AUTOINCREMENT` y seed determinista al inicializar la base vacía.

---

## 2. Prompt Dividido (`system` vs `user`), Cálculo de Pendientes por Resta y Pre-Arribo Local

### Contexto
Es necesario minimizar latencia (1 sola llamada al LLM), evitar alucinaciones en preguntas e instrucciones médicas/tácticas y garantizar paridad con `LLM_PROVIDER=mock`.

### Decisión
1. **`system` prompt constante**: contiene el rol de operador (no despachador CAD), reglas anti-alucinación, criterios `P1`..`P4` y el catálogo compacto generado mediante `JOIN` de `categorias`, `subcategorias` y `preguntas_protocolo` en `SQLite` (`< 0,1 ms` local).
2. **`user` prompt dinámico**: contiene los 2 ejemplos *few-shot* más similares recuperados del CSV (excluyendo coincidencia exacta para evitar *data leakage*) y `transcripcionCruda`.
3. **Instrucciones de pre-arribo fuera del LLM**: `instrucciones_prearribo_protocolo` no se envía al modelo; el backend la consulta determinísticamente por `subcategoria_id` en `SQLite` una vez recibida la tipificación.
4. **Cálculo *fail-safe* de preguntas pendientes por resta**: el analizador solo devuelve `preguntasDetectadas` (`RESPONDIDA` o `AMBIGUA`) con `preguntaId`, `respuestaExtraida` y `citaEvidencia`. El backend verifica citas textuales contra `transcripcionCruda` y marca automáticamente como `PENDIENTE` toda pregunta oficial del protocolo que no haya venido detectada (así una omisión del modelo cae siempre del lado seguro).
5. **Alineación nominal con el CSV**: se adoptan `notasOperativasDespacho` y `recursosRecomendadosDespacho` en el contrato del LLM, el dominio y la API.

---

## 3. Separación 1:1 de `llamadas` y `cartas_despacho` + Simplificación de Persistencia

### Contexto
El operador trabaja sobre la transcripción cruda, el checklist, las instrucciones pre-arribo y los re-análisis del copiloto; en cambio, el despachador CAD debe recibir una ficha estructurada, limpia e inmutable sin la transcripción cruda. Además, persistir simultáneamente `transcripcion_cruda` y `turnos_json`, o mantener `dataset_ref_id`, introducía redundancia innecesaria.

### Decisión
1. **Dos tablas operativas (`1:1`)**:
   - `llamadas`: sesión mutable del operador (`EN_CURSO` -> `DERIVADA` | `DESCARTADA`) con `transcripcion_cruda` como única fuente de verdad del diálogo (los turnos se derivan al vuelo al renderizar) y columnas `_json` validadas por Zod para estado vivo del checklist, pre-arribo, último análisis y `campos_editados_json`.
   - `cartas_despacho`: registro inmutable creado al derivar, que persiste únicamente el entregable formal hacia el CAD (`categoria_id`, `subcategoria_id`, `descripcion_incidente`, `prioridad`, `ubicacion_json`, `riesgos_detectados_json`, `recursos_recomendados_despacho_json`, `notas_operativas_despacho`, `derivada_en`), sin `transcripcion_cruda`.
2. **`origen_reporte` como enum `TEXT` con `CHECK`**: evita crear una tabla auxiliar para 6 valores fijos sin atributos propios.
3. **Eliminación de `dataset_ref_id` y `turnos_json`**: reduce duplicación de datos y simplifica la lógica de actualización.

---

## 4. Consecuencias

- **Positivas**: cero alucinaciones en pre-arribo, protección determinista frente a omisiones del LLM, cambio manual de subcategoría instantáneo en UI, esquema SQLite claro y auditable, y separación nítida entre el trabajo del operador y la salida formal a CAD.
- **Compromisos**: requiere mantener el seed curado de las 21 subcategorías en código/SQLite; ante una expansión futura a cientos de protocolos en producción, el catálogo en `system` prompt debería dividirse en una etapa previa de selección de subcategorías candidatas.

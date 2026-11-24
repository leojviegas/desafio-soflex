# Especificación de Feature 01: Flujo Operador, Protocolo Dinámico y Carta de Despacho

## 1. Casos de Uso Cubiertos

- **CU-01**: Cargar llamada desde transcripción libre o caso sintético de `dataset_challenge_soflex.csv`.
- **CU-02**: Analizar transcripción con el Copiloto (Modo Real LLM o Modo Simulado `mock`) usando catálogo relacional en `SQLite` y retrieval *few-shot*.
- **CU-03**: Agregar nuevos turnos de diálogo (`Operador:` / `Llamante:`) a `transcripcionCruda` y re-analizar actualizando checklist, evidencias y ubicación sin pisar ediciones humanas.
- **CU-04**: Leer instrucciones de seguridad pre-arribo (obtenidas determinísticamente desde `SQLite` según `subcategoriaId`) y marcarlas como transmitidas.
- **CU-05**: Validar y editar manualmente el borrador de la llamada (incluyendo corrección manual de `subcategoriaId`, que recarga al instante checklist y pre-arribo).
- **CU-06**: Derivar formalmente la llamada generando una `CartaDespacho` inmutable (sin transcripción cruda) y consultar la bandeja de Cartas de Despacho (`CAD`).

---

## 2. Actores y Precondiciones

- **Actor Principal**: Operador de Sala de Atención (911 / 147 / 103 / 107).
- **Sistema Destino**: Sistema CAD de Despacho (receptor de la `CartaDespacho` derivada).
- **Precondición**: El backend inició con las tablas de catálogo seedeadas en `SQLite` (`categorias`, `subcategorias`, `preguntas_protocolo`, `instrucciones_prearribo_protocolo`), los 30 casos del CSV cargados y el proveedor IA configurado (`mock` o real).

---

## 3. Flujo Principal (Punta a Punta)

1. El operador abre la Consola de Operación y crea una `Llamada` en estado `EN_CURSO` pegando una transcripción o seleccionando un caso del CSV (`CU-01`).
2. El backend ejecuta el 1er flujo de análisis (`CU-02`):
   - Construye el `system` prompt con el `JOIN` de `categorias`, `subcategorias` y `preguntas_protocolo` (con sus IDs autoincrementales, sin instrucciones de pre-arribo).
   - Recupera los 2 ejemplos *few-shot* más similares del CSV (excluyendo coincidencia exacta) y los combina con `transcripcionCruda` en el `user` prompt.
   - El proveedor (`LLM` o `mock`) devuelve `categoriaId`, `subcategoriaId`, `descripcionIncidente`, `ubicacion`, `prioridadSugerida`, `preguntasDetectadas` (solo `RESPONDIDA` / `AMBIGUA` con `citaEvidencia`), `riesgosDetectados`, `notasOperativasDespacho`, `recursosRecomendadosDespacho` y `confianzaGlobal`.
   - El backend valida IDs, verifica cada `citaEvidencia` contra `transcripcionCruda`, calcula por resta las preguntas `PENDIENTE` del protocolo y consulta en `SQLite` las `instruccionesPreArribo` de esa `subcategoriaId`.
3. El operador lee al ciudadano las instrucciones críticas de pre-arribo y marca el check de `transmitida` (`CU-04`).
4. El operador formula preguntas `PENDIENTE` o `AMBIGUA`, agrega la respuesta del ciudadano a `transcripcionCruda` y presiona "Re-analizar" (`CU-03`). El copiloto actualiza las preguntas respondidas, completa ubicación y recalcula prioridad respetando todo lo editado manualmente.
5. El operador revisa el borrador de despacho y ajusta cualquier campo si corresponde (`CU-05`). Si cambia `subcategoriaId` manualmente, el sistema recarga al instante el checklist y el pre-arribo correspondientes desde `SQLite`.
6. El operador ejecuta **Derivar a CAD** (`CU-06`). La `Llamada` pasa a estado `DERIVADA` (inmutable) y se crea una `CartaDespacho` limpia (ubicación, tipología, prioridad, riesgos, recursos recomendados y notas operativas de despacho, sin transcripción cruda) visible en la Bandeja CAD.

---

## 4. Flujos Alternativos y Errores

- **Falta ubicación mínima, tipología, prioridad o `notasOperativasDespacho` al derivar**: El sistema bloquea la derivación (`400 Bad Request`) e indica exactamente qué campos faltan completar.
- **Cita de evidencia no encontrada en la transcripción**: El backend marca `evidenciaVerificada: false` y degrada la pregunta a `AMBIGUA` para que el operador la verifique con el llamante.
- **Fallo o timeout del LLM en Modo Real**: Si está habilitado el fallback, responde con `MockCopilotAnalyzer` marcando `degradado: true` y avisa al operador; si está deshabilitado, devuelve HTTP `503`.
- **Intento de modificar o re-derivar una llamada ya `DERIVADA` o `DESCARTADA`**: Rechazo `409 Conflict` preservando la integridad de auditoría.

---

## 5. Criterios de Aceptación

- [ ] Se completa todo el flujo offline con `LLM_PROVIDER=mock` sin credenciales externas.
- [ ] En Modo Real, el `system` prompt inyecta el `JOIN` de catálogo (`categorias`, `subcategorias`, `preguntas_protocolo`) sin pre-arribo, y el `user` prompt incluye los 2 *few-shot* y `transcripcionCruda`.
- [ ] El backend calcula determinísticamente las preguntas `PENDIENTE` por resta, verifica citas textuales e inyecta las instrucciones de pre-arribo desde `SQLite`.
- [ ] Al cambiar manualmente `subcategoriaId`, se recargan checklist e instrucciones de pre-arribo desde `SQLite` preservando preguntas universales confirmadas.
- [ ] Al derivar, la `Llamada` pasa a `DERIVADA` y se persiste una `CartaDespacho` inmutable (sin transcripción cruda) consultable en `/api/cartas-despacho`.

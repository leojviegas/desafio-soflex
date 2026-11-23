# Especificación de Feature 01: Flujo Operador y Carta de Llamada

## 1. Casos de Uso Cubiertos

- **CU-01**: Cargar llamada desde transcripción libre o caso del dataset (`dataset_challenge_soflex.csv`).
- **CU-02**: Analizar transcripción con el Copiloto (Modo Real LLM o Modo Simulado `mock`).
- **CU-03**: Agregar nuevos turnos de diálogo (`Operador:` / `Llamante:`) y re-analizar actualizando checklist dinámico y datos faltantes.
- **CU-04**: Seguir instrucciones de seguridad pre-arribo y marcarlas como transmitidas.
- **CU-05**: Validar y editar manualmente la Carta de Llamada (Human-in-the-Loop).
- **CU-06**: Derivar formalmente la Carta de Llamada a CAD y consultar historial de cartas derivadas.

---

## 2. Actores y Precondiciones

- **Actor Principal**: Operador de Sala de Atención (911 / 147 / 103 / 107).
- **Sistema Destino**: Sistema CAD de Despacho (receptor de la Carta de Llamada derivada).
- **Precondición**: El backend inició correctamente con el catálogo del CSV indexado y el proveedor IA configurado (`mock` o real).

---

## 3. Flujo Principal (Punta a Punta)

1. El operador abre la Consola de Operación y crea una nueva llamada pegando una transcripción o seleccionando un caso precargado del dataset (`CU-01`).
2. El sistema ejecuta el análisis del copiloto (`CU-02`), devolviendo:
   - Ubicación normalizada + `camposFaltantes`.
   - Categoría, subcategoría y prioridad sugerida (`P1`–`P4`) con nivel de certeza.
   - Riesgos detectados e instrucciones inmediatas de seguridad pre-arribo.
   - Checklist dinámico dividido en preguntas ya respondidas en el relato (con evidencia) y preguntas pendientes.
   - Borrador de notas operativas y recursos recomendados de referencia para CAD.
3. El operador lee al ciudadano las instrucciones pre-arribo y marca el check de transmitidas (`CU-04`).
4. El operador formula las preguntas pendientes del checklist, registra la respuesta del ciudadano como nuevo turno en la transcripción y presiona "Re-analizar" (`CU-03`). El copiloto actualiza las preguntas respondidas, completa la ubicación y recalcula prioridad si surgieron nuevos riesgos.
5. El operador revisa el borrador de la Carta de Llamada, corrige cualquier campo si lo considera necesario (quedando registrado como editado manualmente) (`CU-05`).
6. El operador ejecuta **Derivar Carta a CAD** (`CU-06`). La carta pasa a estado `DERIVADA` con timestamp y queda inmutable en la Bandeja de Cartas Derivadas.

---

## 4. Flujos Alternativos y Errores

- **Falta ubicación mínima o prioridad al intentar derivar**: El sistema bloquea la derivación (`400 Bad Request`) e indica exactamente qué campos obligatorios faltan completar.
- **Fallo o timeout del LLM en Modo Real**: Si está habilitado el fallback, el sistema responde usando el analizador determinista con `degradado: true` y muestra un aviso claro al operador; si no, informa error `503` permitiendo reintentar.
- **Intento de modificar una carta ya `DERIVADA`**: Rechazo `409 Conflict` preservando la integridad de auditoría.

---

## 5. Criterios de Aceptación

- [ ] Se puede completar todo el flujo offline con `LLM_PROVIDER=mock` sin credenciales externas.
- [ ] En Modo Real con API key configurada, el análisis usa el LLM y devuelve salida validada por Zod.
- [ ] Al agregar un nuevo turno de diálogo con un dato faltante (ej. altura o si respira), el re-análisis actualiza el checklist y la ubicación.
- [ ] Las cartas derivadas quedan persistidas y visibles en la bandeja de historial.

# Especificación de Dominio 01: Entidades, Enumeraciones y Reglas

## 1. Propósito y Alcance

Define el modelo de dominio del **Copiloto Asistente para Operadores de Sala**, alineado con `docs/enunciado.md` y las 18 columnas de `docs/dataset_challenge_soflex.csv`.

---

## 2. Enumeraciones (`backend/src/domain/enums/`)

- **`OrigenReporte`**:
  `TELEFONIA_911`, `TELEFONIA_103`, `TELEFONIA_107`, `TELEFONIA_147`, `APP_CIUDADANA`, `OTRO`
- **`CategoriaIncidente`**:
  `INCENDIO_RESCATE`, `ACCIDENTE_VIAL`, `EMERGENCIA_MEDICA`, `DEFENSA_CIVIL`, `SERVICIOS_PUBLICOS`, `CONVIVENCIA_SEGURIDAD`, `OTRO`
- **`PrioridadIncidente`**:
  `P1` (Crítica / Riesgo de vida inminente), `P2` (Alta / Urgencia), `P3` (Media / Sin riesgo vital inmediato), `P4` (Baja / Informativa o programable)
- **`EstadoCartaLlamada`**:
  `EN_CURSO`, `DERIVADA`, `DESCARTADA`
- **`EstadoPreguntaProtocolo`**:
  `PENDIENTE`, `RESPONDIDA_EN_RELATO`, `CONFIRMADA_OPERADOR`
- **`NivelCerteza`**:
  `ALTA`, `MEDIA`, `BAJA`
- **`ProveedorIA`**:
  `mock`, `gemini`, `ollama`, `openai`, `openai-compatible`

---

## 3. Entidades y Objetos de Valor (`backend/src/domain/entities/`)

### 3.1. `TurnoDialogo`
- `id: string`
- `hablante: "OPERADOR" | "LLAMANTE" | "SISTEMA"`
- `texto: string` (no vacío)
- `timestamp: string` (ISO 8601)

### 3.2. `UbicacionNormalizada`
- `calle: string | null`
- `altura: string | null`
- `interseccion: string | null`
- `barrioComuna: string | null`
- `referencia: string | null`
- `camposFaltantes: string[]` (ej. `["altura", "interseccion"]` si no fueron provistos en el relato)

### 3.3. `PreguntaProtocolo`
- `id: string`
- `texto: string`
- `obligatoria: boolean`
- `estado: EstadoPreguntaProtocolo`
- `respuestaDetectada: string | null`
- `evidencia: string | null` (fragmento textual de la transcripción)

### 3.4. `InstruccionPreArribo`
- `id: string`
- `texto: string`
- `critica: boolean`
- `transmitida: boolean` (marcada por el operador)

### 3.5. `AnalisisCopiloto`
- `ubicacion: UbicacionNormalizada`
- `categoria: CategoriaIncidente`
- `subcategoria: string`
- `prioridadSugerida: PrioridadIncidente`
- `riesgosDetectados: string[]`
- `preguntasProtocolo: PreguntaProtocolo[]`
- `instruccionesPreArribo: InstruccionPreArribo[]`
- `recursosRecomendadosCad: string[]` (referencia para despachador CAD)
- `notasOperativasSugeridas: string`
- `confianzaGlobal: NivelCerteza`
- `evidencias: string[]`
- `proveedorUsado: ProveedorIA`
- `modeloUsado: string`
- `latenciaMs: number`
- `degradado: boolean` (true si cayó en fallback tras fallo del proveedor real)

### 3.6. `ProtocoloReferencia` (Catálogo desde CSV)
Modela las 18 columnas de `docs/dataset_challenge_soflex.csv`:
- `idRegistro`, `timestampLlamada`, `origenReporte`, `categoria`, `subcategoria`, `prioridadSugerida`, `transcripcionCruda`, `calleDetectada`, `alturaDetectada`, `interseccionDetectada`, `barrioComuna`, `preguntasProtocoloMandatorias`, `preguntasRespondidasEnRelato`, `preguntasPendientes`, `instruccionesPrearribo`, `riesgosDetectados`, `recursosRecomendadosDespacho`, `notasOperativasDespacho`.

### 3.7. `CartaLlamada`
- `id: string`
- `origenReporte: OrigenReporte`
- `estado: EstadoCartaLlamada` (inicia en `EN_CURSO`)
- `datasetRefId: string | null` (si proviene de un caso del CSV)
- `transcripcionCruda: string`
- `turnos: TurnoDialogo[]`
- `ultimoAnalisis: AnalisisCopiloto | null` (sugerencia original de IA)
- `ubicacionValidada: UbicacionNormalizada`
- `categoriaValidada: CategoriaIncidente | null`
- `subcategoriaValidada: string`
- `prioridadValidada: PrioridadIncidente | null`
- `preguntasProtocolo: PreguntaProtocolo[]`
- `instruccionesPreArribo: InstruccionPreArribo[]`
- `riesgosValidados: string[]`
- `recursosSugeridosCad: string[]`
- `notasOperativas: string`
- `camposEditadosPorOperador: string[]` (auditoría de overrides humanos)
- `creadaEn: string`
- `actualizadaEn: string`
- `derivadaEn: string | null`

---

## 4. Invariantes y Máquina de Estados

1. **Transcripción obligatoria**: No se puede crear ni analizar una `CartaLlamada` con transcripción vacía (`DomainValidationError`).
2. **Prohibición de alucinación de ubicación**: Si el relato no menciona calle ni intersección, `ubicacion` mantiene los campos en `null` hasta que el operador los complete manualmente tras preguntar al llamante.
3. **Derivación a CAD (`EN_CURSO` -> `DERIVADA`)**:
   - Requiere: `categoriaValidada` no nula, `prioridadValidada` en `P1..P4`, `notasOperativas` no vacía, y al menos una referencia de ubicación (`calle` o `interseccion` o `referencia`). Si falta algún requisito lanza `DomainValidationError`.
   - Si la carta ya está en `DERIVADA` o `DESCARTADA`, cualquier edición o nueva derivación lanza `InvalidStateTransitionError` (HTTP `409`).
4. **Descarte (`EN_CURSO` -> `DESCARTADA`)**:
   - Solo válido desde `EN_CURSO`; si ya fue `DERIVADA`, lanza `InvalidStateTransitionError` (HTTP `409`).

# Copiloto Asistente para Operadores de Sala (`desafio-soflex`)

Prototipo funcional contenerizado de asistencia inteligente para operadores de centros de atención ciudadana y emergencias (`911`, `103`, `107`, `147`). Procesa transcripciones textuales de llamadas para extraer ubicación, tipología y prioridad (`P1`–`P4`), presentar instrucciones de seguridad pre-arribo, gestionar un checklist dinámico de protocolo y conformar la **Carta de Despacho** hacia el sistema CAD.

### Principio Crítico de Operación en Sala

El operador de atención **no** decide ni ejecuta el despacho de móviles en la calle (responsabilidad del despachador en el sistema CAD). Su tarea es contener al ciudadano, conducir el interrogatorio guiado, transmitir instrucciones inmediatas de pre-arribo, validar los datos extraídos y derivar formalmente una `CartaDespacho` limpia e inmutable (sin transcripción cruda ni telemetría interna de IA).

---

## 1. Inicio Rápido con Docker Compose

La solución completa levanta con un único comando y funciona de forma **100% offline y gratuita** por defecto (`LLM_PROVIDER=mock`), sin requerir credenciales externas:

```bash
docker compose up --build
```

Una vez saludables los servicios:
- **Panel Web del Operador**: [http://localhost:3000](http://localhost:3000)
- **API REST (Salud y Diagnóstico)**: [http://localhost:3001/api/health](http://localhost:3001/api/health) (también accesible vía proxy en `http://localhost:3000/api/health`)

### Activar Modo Real (LLM Externo o Local)

Para usar un modelo real en lugar del motor determinista `mock`, copiá `.env.example` a `.env` en la raíz del repositorio y configurá el proveedor deseado antes de ejecutar `docker compose up --build`:

```bash
cp .env.example .env
```

| Variable | Default | Descripción |
| :--- | :--- | :--- |
| `LLM_PROVIDER` | `mock` | `mock` \| `gemini` \| `ollama` \| `openai` \| `openai-compatible` |
| `LLM_MODEL` | *(por proveedor)* | Sobrescribe el modelo (`gemini-2.5-flash`, `qwen2.5:7b`, `gpt-4o-mini`, etc.) |
| `LLM_BASE_URL` | `http://localhost:11434/api` (Ollama) | URL base para `ollama` o servidores `openai-compatible` (Groq, vLLM, LM Studio) |
| `GEMINI_API_KEY` | *(vacío)* | Requerida cuando `LLM_PROVIDER=gemini` |
| `OPENAI_API_KEY` | *(vacío)* | Requerida cuando `LLM_PROVIDER=openai` |
| `LLM_API_KEY` | *(vacío)* | Token opcional para `openai-compatible` |
| `LLM_TEMPERATURE` | `0.1` | Temperatura de extracción estructurada (`0` a `1`) |
| `LLM_TIMEOUT_MS` | `15000` | Timeout de invocación al modelo en milisegundos |
| `LLM_FALLBACK_TO_MOCK` | `true` | Si `true`, degrada al motor determinista marcando `degradado: true` ante fallos o falta de credenciales; si `false`, responde HTTP `503` |

> Si usás **Ollama** en el host mientras el backend corre en Docker, configurá `LLM_BASE_URL=http://host.docker.internal:11434/api`.

---

## 2. Ejecución Local en Desarrollo y Suite de Tests

Requiere **Node.js >= 22.13** (para soporte nativo de `node:sqlite`).

### Back-End (`/backend`)

```bash
cd backend
npm install
npm run dev         # API REST en http://localhost:3001 (tsx watch)
npm run typecheck   # Verificación estricta TypeScript (src + tests)
npm run build       # Compilación a dist/
npm test            # Suite Vitest + Supertest (14 archivos, 49 tests)
```

Los 49 tests automatizados cubren:
- Invariantes de dominio, Value Objects, verificación de citas y cálculo *fail-safe* de pendientes.
- Persistencia SQLite en `:memory:`, seed del catálogo y parser CSV tolerante a padding (`30` casos).
- Proveedores de IA (`MockCopilotAnalyzer` sobre los 30 casos del dataset, `LlmCopilotAnalyzer` con mocks de SDK, retrieval TF-IDF sin *data leakage*, timeouts y degradación).
- Servicios de aplicación (`LlamadaService`) y contratos REST punta a punta con Supertest (`400`, `404`, `409`, `503` sanitizado).

### Front-End (`/frontend`)

```bash
cd frontend
npm install
npm run dev         # Vite dev server en http://localhost:3000 con proxy /api -> :3001
npm run typecheck   # Verificación TypeScript (tsc -b --noEmit)
npm run build       # Build de producción en dist/
```

---

## 3. Arquitectura, Endpoints y Atajos del Operador

### Estructura del Repositorio

- `backend/src/`:
  - `config/`: validación de entorno con Zod (`env.ts`).
  - `domain/`: entidades (`Llamada`, `CartaDespacho`), Value Objects (`FichaIncidente`, `UbicacionNormalizada`, `Transcripcion`, `ChecklistProtocolo`, `AnalisisCopiloto`) y enums congelados.
  - `repositories/`: SQLite nativo (`node:sqlite`) con catálogo normalizado de 4 tablas y tablas operativas `llamadas` / `cartas_despacho`, más repositorio en memoria para `docs/dataset_challenge_soflex.csv`.
  - `providers/ai/`: patrón Dual-Provider (`CopilotAnalyzerProvider`, `LlmCopilotAnalyzer` con Vercel AI SDK, `MockCopilotAnalyzer`, `CsvFewShotRetriever`, `promptBuilder`, `copilotPostProcessor`).
  - `schemas/`, `services/`, `controllers/`, `routes/`, `middlewares/`, `inject.ts`, `server.ts`.
- `frontend/src/`: Consola táctica de 3 columnas (`TranscriptColumn`, `LiveAssistanceColumn`, `DispatchDraftColumn`), `CadTrayPage`, `HttpCopilotApiClient` y tokens CSS.
- `specs/` y `docs/adr/`: especificaciones SDD y registros de decisiones de arquitectura.

### Endpoints REST Principales (`/api`)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor, proveedor IA activo, catálogo y casos CSV |
| `GET` | `/api/protocolos` | Catálogo jerárquico completo desde SQLite (`7` categorías, `21` subcategorías) |
| `GET` | `/api/dataset/llamadas` | Los `30` casos sintéticos de referencia del CSV |
| `POST` | `/api/llamadas` | Crea una llamada en `EN_CURSO` (opcional `analizarAhora: true`) |
| `GET` | `/api/llamadas` | Lista llamadas filtrables por `estado`, `categoriaId`, `subcategoriaId`, `prioridad` |
| `GET` | `/api/llamadas/:id` | Detalle completo de llamada (incluye `turnos`, `faltantesParaDerivar` y `cartaDespacho`) |
| `POST` | `/api/llamadas/:id/turnos` | Anexa un turno `OPERADOR` o `LLAMANTE` y re-analiza opcionalmente |
| `POST` | `/api/llamadas/:id/analizar` | Ejecuta análisis del copiloto preservando ediciones humanas |
| `PATCH` | `/api/llamadas/:id` | Edición humana parcial; al cambiar `subcategoriaId` recarga protocolo desde SQLite |
| `POST` | `/api/llamadas/:id/derivar` | Valida invariantes mínimos, pasa a `DERIVADA` y persiste `CartaDespacho` inmutable |
| `POST` | `/api/llamadas/:id/descartar` | Transiciona `EN_CURSO` -> `DESCARTADA` |
| `GET` | `/api/cartas-despacho` | Bandeja CAD filtrable por `prioridad`, `categoriaId` y `subcategoriaId` |
| `GET` | `/api/cartas-despacho/:id` | Detalle inmutable de una `CartaDespacho` (sin `transcripcionCruda`) |

### Atajos de Teclado en Consola

- `Ctrl + Enter` (`Cmd + Enter`): Anexar turno / Re-analizar transcripción.
- `Alt + 1..4`: Asignar prioridad `P1`..`P4`.
- `Alt + D`: Derivar Carta de Despacho a CAD (previo flush de borradores pendientes).

---

## 4. Memoria de Decisiones de Diseño, Supuestos y Trade-offs

### 4.1. Stack y Contenedorización
- **TypeScript estricto en todo el monorepo** (`Node.js 22` + `Express 5` + `Zod` en backend; `React 19` + `Vite` + `Tailwind CSS` en frontend): garantiza contratos tipados entre el esquema estructurado del LLM, la API REST y la interfaz del operador.
- **SQLite nativo vía `node:sqlite` (`DatabaseSync`)**: se eligió el módulo integrado de Node 22 en lugar de `better-sqlite3` o motores externos para evitar compilación C++ (`node-gyp`), eliminar contenedores extra de base de datos y conservar persistencia entre reinicios mediante un volumen Docker (`/app/data`), manteniendo soporte `:memory:` para tests rápidos.
- **Nginx minimalista (`nginx:1.27-alpine`) en el servicio `frontend`**: sirve el build estático compilado de Vite y proxea `/api/` hacia `backend:3001` en la red interna de Docker Compose, evitando problemas de CORS y reduciendo el peso del contenedor frente a correr un dev server en producción.

### 4.2. Catálogo Normalizado en SQLite y Separación `Llamada` / `CartaDespacho`
- Al auditar `docs/dataset_challenge_soflex.csv` se observó que las 30 filas tienen descripciones únicas y mezclan subescenarios con protocolos de seguridad opuestos (por ejemplo, incendio eléctrico/litio donde está prohibido arrojar agua vs incendio estructural o rescate en ascensor; lipotimia vs crisis asmática). Por eso se normalizó el catálogo en 4 tablas relacionales (`categorias`, `subcategorias`, `preguntas_protocolo`, `instrucciones_prearribo_protocolo`) agrupando los casos en **7 categorías, 21 subcategorías y 2 preguntas universales**, mientras el título descriptivo puntual se conserva en `descripcionIncidente`.
- **Separación 1:1 entre `llamadas` y `cartas_despacho`**: la sesión de trabajo (`llamadas`) conserva `transcripcion_cruda`, el estado del checklist, el último análisis y `campos_editados_json`. Al derivar, se crea de forma atómica una fila inmutable en `cartas_despacho` únicamente con la información operativa necesaria para el despachador CAD.

### 4.3. Control de Alucinaciones y Pipeline de IA en 4 Pasos
1. **`system` prompt compacto desde SQLite**: inyecta el `JOIN` de categorías, subcategorías y preguntas con IDs numéricos y criterios explícitos `P1`–`P4` (incluyendo `P4`, ausente en el CSV). Las instrucciones `instrucciones_prearribo_protocolo` **nunca** se envían al LLM.
2. **`user` prompt con retrieval *few-shot* sin *data leakage***: `CsvFewShotRetriever` (TF-IDF local sobre las 30 filas) selecciona los 2 ejemplos más similares excluyendo coincidencias exactas o cuasi-exactas (`similitud >= 0.92` o subcadena equivalente).
3. **Salida estructurada estricta (`LlmCopilotOutputSchema`)**: usa `generateObject` de Vercel AI SDK con temperatura `0.1` y campos `.nullable()` para compatibilidad JSON Schema estricta con Gemini y OpenAI.
4. **Post-procesamiento determinista en dominio (compartido entre Modo Real y `mock`)**:
   - Valida existencia de `subcategoriaId` y deriva `categoriaId` desde SQLite.
   - Calcula `ubicacion.camposFaltantes` sobre campos ausentes sin inventar direcciones (`null` obligatorio si no figura en el relato).
   - Descarta `preguntaId` fuera de protocolo, verifica cada `citaEvidencia` normalizada contra `transcripcionCruda` (degradando a `AMBIGUA` con `evidenciaVerificada: false` si no aparece) y calcula por resta como `PENDIENTE` toda pregunta oficial no detectada (*fail-safe* ante omisiones).
   - Adjunta determinísticamente las instrucciones de pre-arribo desde SQLite.

### 4.4. Human-in-the-Loop y UX de Sala
- **Protección de overrides**: `RegistroEdicionesOperador` rastrea los 12 campos/subcampos editables; sucesivos re-análisis actualizan evidencia y campos no tocados sin pisar decisiones del operador, estados de checklist (`CONFIRMADA` / `NO_APLICA` / `notaOperador`) ni checks de pre-arribo transmitidos.
- **Edición fluida sobre HTTP real**: `DispatchDraftColumn` mantiene estado local controlado con debounce (`350 ms`), guardado en `onBlur`, flush previo a `analizar`/`turnos`/`derivar` y cola serializada de `PATCH` en `App.tsx`, evitando condiciones de carrera y pérdida de espacios finales al tipear.

### 4.5. Trade-offs Asumidos
- `OrigenReporte` modelado como enum fijo (6 canales) en lugar de tabla maestra configurable, priorizando simplicidad de prototipo sin ABM administrativo.
- Inyección del catálogo completo en el `system` prompt (óptimo en latencia y precisión para 21 subcategorías, en una sola llamada al LLM).
- SQLite embebido de nodo único en lugar de PostgreSQL distribuido.

---

## 5. Mejoras Futuras con Más Tiempo

1. **Base de datos y catálogo multi-jurisdicción**: migrar repositorios a PostgreSQL, convertir `origenes_reporte` en tabla maestra configurable por municipio/sala y agregar selección de subcategorías candidatas en 2 etapas si el catálogo creciera a cientos de protocolos.
2. **Normalización geoespacial real**: integrar geocodificador oficial (por ejemplo USIG en CABA / Nominatim) con validación de alturas, esquinas y visualización en mapa para confirmar la ubicación exacta antes de derivar.
3. **Transcripción en tiempo real (streaming)**: ingesta incremental por WebSocket/SSE conectada a un motor STT (Speech-to-Text) con actualización progresiva de turnos y sugerencias en vivo.
4. **Seguridad y auditoría multi-operador**: autenticación SSO/RBAC por puesto de sala, registro de usuario operador en cada override y en la `CartaDespacho` derivada, y métricas agregadas de tiempos de atención.

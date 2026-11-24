# Especificación 01: Modelo de Datos SQLite, Catálogo de Protocolos y Reglas de Negocio

## 1. Propósito y Alcance

Define el esquema de persistencia en `SQLite`, el catálogo normalizado de protocolos y las reglas de negocio del **Copiloto Asistente para Operadores de Sala**, alineado con [docs/enunciado.md](../../docs/enunciado.md) y [docs/dataset_challenge_soflex.csv](../../docs/dataset_challenge_soflex.csv).

El diseño separa explícitamente tres planos:
1. **Catálogo de Protocolos (SQLite relacional)**: `categorias` -> `subcategorias` -> `preguntas_protocolo` e `instrucciones_prearribo_protocolo`, con IDs enteros autoincrementales.
2. **Sesión de Trabajo del Operador (`llamadas`)**: expediente mutable mientras está `EN_CURSO` que conserva la `transcripcion_cruda`, el borrador editable, el checklist vivo, las instrucciones de pre-arribo transmitidas y la auditoría de overrides manuales.
3. **Entregable Formal a CAD (`cartas_despacho`)**: registro inmutable (`1:1` con `llamadas`) creado al derivar, que contiene únicamente los datos operativos y de despacho necesarios para el despachador CAD (sin transcripción cruda ni metadatos internos de IA).

> Nota: Las entidades y enumeraciones de la capa de dominio se diseñarán a partir del esquema de datos y las reglas definidas en este documento.

---

## 2. Esquema de Base de Datos SQLite (`backend/src/repositories/sqliteDatabase.ts`)

Enfoque mixto:
- **Catálogo 100% relacional** con `INTEGER PRIMARY KEY AUTOINCREMENT` y `FOREIGN KEY` activas (`PRAGMA foreign_keys = ON`).
- **Tablas operativas `llamadas` y `cartas_despacho` (`1:1`)** con columnas escalares indexadas para filtros y columnas `_json` (`TEXT` con `JSON` serializado y validado con `zod`) para colecciones anidadas propias de cada registro.

```sql
PRAGMA foreign_keys = ON;

-- 1. Catálogo de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  etiqueta TEXT NOT NULL
);

-- 2. Catálogo de subcategorías operativas
CREATE TABLE IF NOT EXISTS subcategorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER NOT NULL,
  nombre TEXT NOT NULL UNIQUE,
  etiqueta TEXT NOT NULL,
  criterio TEXT NOT NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_subcategorias_categoria
  ON subcategorias (categoria_id);

-- 3. Catálogo de preguntas de protocolo (subcategoria_id NULL = universal)
CREATE TABLE IF NOT EXISTS preguntas_protocolo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subcategoria_id INTEGER,
  texto TEXT NOT NULL,
  critica INTEGER NOT NULL DEFAULT 1 CHECK (critica IN (0, 1)),
  pistas_mock_json TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_preguntas_subcategoria
  ON preguntas_protocolo (subcategoria_id);

-- 4. Catálogo de instrucciones de pre-arribo (uso determinista local, no se envía al LLM)
CREATE TABLE IF NOT EXISTS instrucciones_prearribo_protocolo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subcategoria_id INTEGER NOT NULL,
  texto TEXT NOT NULL,
  critica INTEGER NOT NULL DEFAULT 1 CHECK (critica IN (0, 1)),
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_instrucciones_subcategoria
  ON instrucciones_prearribo_protocolo (subcategoria_id);

-- 5. Sesión activa / histórica del operador de sala
CREATE TABLE IF NOT EXISTS llamadas (
  id TEXT PRIMARY KEY,
  origen_reporte TEXT NOT NULL CHECK (
    origen_reporte IN (
      'TELEFONIA_911', 'TELEFONIA_103', 'TELEFONIA_107',
      'TELEFONIA_147', 'APP_CIUDADANA', 'OTRO'
    )
  ),
  estado TEXT NOT NULL CHECK (estado IN ('EN_CURSO', 'DERIVADA', 'DESCARTADA')),
  transcripcion_cruda TEXT NOT NULL,
  categoria_id INTEGER,
  subcategoria_id INTEGER,
  descripcion_incidente TEXT NOT NULL DEFAULT '',
  prioridad TEXT CHECK (prioridad IS NULL OR prioridad IN ('P1', 'P2', 'P3', 'P4')),
  ubicacion_json TEXT NOT NULL,
  checklist_json TEXT NOT NULL DEFAULT '[]',
  instrucciones_prearribo_json TEXT NOT NULL DEFAULT '[]',
  riesgos_detectados_json TEXT NOT NULL DEFAULT '[]',
  recursos_recomendados_despacho_json TEXT NOT NULL DEFAULT '[]',
  notas_operativas_despacho TEXT NOT NULL DEFAULT '',
  ultimo_analisis_json TEXT,
  campos_editados_json TEXT NOT NULL DEFAULT '[]',
  creada_en TEXT NOT NULL,
  actualizada_en TEXT NOT NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_llamadas_estado_creada
  ON llamadas (estado, creada_en DESC);

CREATE INDEX IF NOT EXISTS idx_llamadas_subcategoria
  ON llamadas (subcategoria_id);

-- 6. Carta de Despacho formal e inmutable derivada hacia CAD (1:1 con llamadas)
CREATE TABLE IF NOT EXISTS cartas_despacho (
  id TEXT PRIMARY KEY,
  llamada_id TEXT NOT NULL UNIQUE,
  origen_reporte TEXT NOT NULL CHECK (
    origen_reporte IN (
      'TELEFONIA_911', 'TELEFONIA_103', 'TELEFONIA_107',
      'TELEFONIA_147', 'APP_CIUDADANA', 'OTRO'
    )
  ),
  categoria_id INTEGER NOT NULL,
  subcategoria_id INTEGER NOT NULL,
  descripcion_incidente TEXT NOT NULL,
  prioridad TEXT NOT NULL CHECK (prioridad IN ('P1', 'P2', 'P3', 'P4')),
  ubicacion_json TEXT NOT NULL,
  riesgos_detectados_json TEXT NOT NULL DEFAULT '[]',
  recursos_recomendados_despacho_json TEXT NOT NULL DEFAULT '[]',
  notas_operativas_despacho TEXT NOT NULL,
  derivada_en TEXT NOT NULL,
  FOREIGN KEY (llamada_id) REFERENCES llamadas(id) ON DELETE RESTRICT,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
  FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_cartas_despacho_derivada
  ON cartas_despacho (derivada_en DESC);

CREATE INDEX IF NOT EXISTS idx_cartas_despacho_prioridad
  ON cartas_despacho (prioridad);
```

---

## 3. Seed Inicial del Catálogo en SQLite (Cobertura de los 30 Casos del CSV)

Al inicializar una base vacía (`SELECT COUNT(*) FROM categorias === 0`), se ejecuta un seed determinista dentro de una transacción con:

- **2 preguntas universales** (`subcategoria_id = NULL`):
  1. `¿Cuál es la dirección exacta, altura o intersección del incidente?` (crítica)
  2. `¿Usted o las personas cercanas se encuentran en un lugar seguro en este momento?` (crítica)
- **7 categorías y 21 subcategorías operativas** (cada una con 3–4 preguntas canónicas y 2–3 instrucciones de pre-arribo verificadas):
  - `INCENDIO_RESCATE`:
    - `incendio_estructural` (cubre CSV `001`: comercio gastronómico, vivienda o edificio)
    - `incendio_electrico_litio` (cubre CSV `017`, `025`, `030`: tablero eléctrico, baterías de litio, subestación — prohibido agua)
    - `incendio_via_publica_pastizal` (cubre CSV `002`, `004`: contenedor de residuos, pastizales en parque)
    - `rescate_ascensor` (cubre CSV `003`: personas atrapadas en ascensor o espacio confinado)
    - `derrame_materiales_peligrosos` (cubre CSV `022`: derrame de combustible o sustancias peligrosas)
  - `ACCIDENTE_VIAL`:
    - `vial_moto_ciclista` (cubre CSV `005`, `018`: colisión con moto/bicicleta/monopatín — prohibido retirar casco ni mover)
    - `vial_colision_multiple_vuelco` (cubre CSV `006`, `029`: choque en cadena en autopista o vuelco con atrapados)
    - `vial_obstruccion_vehiculo_pesado` (cubre CSV `007`: camión atascado en bajo viaducto u obstrucción vial)
  - `EMERGENCIA_MEDICA`:
    - `medica_respiratoria_anafilaxia` (cubre CSV `009`, `019`: crisis asmática aguda, anafilaxia — sentar erguido hacia adelante, nunca acostar)
    - `medica_sincope_descompensacion` (cubre CSV `008`: golpe de calor, desmayo, lipotimia — elevar piernas 30 cm, no dar líquidos)
    - `medica_trauma_fractura_caida` (cubre CSV `010`, `023`: caída en adulto mayor, fractura expuesta — no movilizar ni alinear)
    - `medica_convulsion` (cubre CSV `026`: convulsión activa — nunca introducir objetos en la boca, proteger cabeza)
  - `DEFENSA_CIVIL`:
    - `dc_fuga_gas` (cubre CSV `012`: rotura de caño de gas — evacuar 100 m, prohibido chispas o llaves de luz)
    - `dc_colapso_estructura_arbolado` (cubre CSV `011`, `014`, `027`: árbol caído, marquesina desprendida, derrumbe de medianera)
    - `dc_anegamiento_inundacion` (cubre CSV `021`: bajo viaducto anegado con vehículos varados)
  - `SERVICIOS_PUBLICOS`:
    - `sp_riesgo_electrico_via_publica` (cubre CSV `020`: cables cortados chispeando sobre pavimento húmedo)
    - `sp_rotura_agua_socavon` (cubre CSV `013`, `028`: socavón en calzada, rotura de caño maestro con ingreso a subsuelos)
    - `sp_semaforizacion_infraestructura` (cubre CSV `024` y reclamos urbanos `P3`/`P4` de 147)
  - `CONVIVENCIA_SEGURIDAD`:
    - `seg_disturbio_violencia` (cubre CSV `015`: pelea colectiva, disturbios o amenaza en vía pública)
    - `seg_animal_peligroso` (cubre CSV `016`: canino agresivo suelto en espacio público)
  - `OTRO`:
    - `general_otro` (respaldo para incidentes fuera de catálogo o consultas administrativas `P4`)

---

## 4. Invariantes, Prioridades y Máquina de Estados

### Criterios de severidad (`P1` a `P4`)
- `P1`: Crítica / riesgo de vida inminente o peligro activo grave.
- `P2`: Alta / urgencia con riesgo moderado o afectación relevante sin compromiso vital inmediato confirmado.
- `P3`: Media / daño material acotado, riesgo bajo o interrupción vial sin heridos.
- `P4`: Baja / reclamo administrativo o preventivo sin riesgo para personas ni infraestructura (definido explícitamente porque el CSV base no contiene casos `P4`).

### Reglas e invariantes operativos

1. **Transcripción obligatoria**: No se puede crear ni analizar una `Llamada` con `transcripcionCruda` vacía (`DomainValidationError`).
2. **Prohibición de alucinación en ubicación**: Todo dato de ubicación que no figure explícitamente en `transcripcionCruda` queda en `null` y se lista en `ubicacion.camposFaltantes`.
3. **Verificación de evidencia y cálculo por resta**:
   - El analizador (LLM o `mock`) solo reporta las preguntas en estado `RESPONDIDA` o `AMBIGUA` junto con su `preguntaId` y `citaEvidencia`.
   - El backend descarta cualquier `preguntaId` ajeno a la `subcategoriaId` seleccionada (o a las universales), verifica que `citaEvidencia` exista en `transcripcionCruda` (si no existe, degrada a `AMBIGUA` con `evidenciaVerificada: false`) y marca automáticamente como `PENDIENTE` toda pregunta restante del protocolo.
4. **Protección de overrides humanos (`Human-in-the-Loop`)**:
   - Al aplicar un re-análisis sobre una `Llamada` en `EN_CURSO`, todo campo presente en `camposEditadosPorOperador` (incluyendo subcampos `ubicacion.calle`, `ubicacion.altura`, etc.) queda protegido.
   - Se preservan los `estadoOperador` no nulos en el checklist y los checks `transmitida: true` en instrucciones pre-arribo.
5. **Cambio manual de subcategoría por el operador**:
   - Si el operador cambia `subcategoriaId` mediante edición manual, el backend actualiza `categoriaId` de forma consistente con `subcategorias.categoria_id` y recarga desde `SQLite` el checklist y las instrucciones de pre-arribo de la nueva subcategoría, conservando el estado de las preguntas universales ya confirmadas.
6. **Derivación a CAD (`EN_CURSO` -> `DERIVADA`)**:
   - Requiere: `categoriaId` no nulo, `subcategoriaId` no nulo, `prioridad` en `P1..P4`, `notasOperativasDespacho` no vacía y ubicación mínima (`calle` o `interseccion` o `referencia`). No exige responder el 100% de preguntas secundarias para no bloquear envíos tempranos en `P1`.
   - Crea de forma atómica una fila inmutable en `cartas_despacho` y cambia `llamadas.estado` a `DERIVADA`.
   - Si la llamada ya está `DERIVADA` o `DESCARTADA`, cualquier edición, nuevo turno, re-análisis o nueva derivación lanza `InvalidStateTransitionError` (HTTP `409`).
7. **Descarte (`EN_CURSO` -> `DESCARTADA`)**:
   - Solo válido desde `EN_CURSO`; si ya fue `DERIVADA` o `DESCARTADA`, lanza `InvalidStateTransitionError` (HTTP `409`).

# Especificación de API REST 01: Contratos del Back-End (`backend/`)

## 1. Resumen de Endpoints

| Método | Ruta | Descripción | Caso de Uso |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor, base SQLite y proveedor IA activo (`mock` / real) | Infraestructura |
| `GET` | `/api/dataset/llamadas` | Lista los 30 casos sintéticos del CSV para carga rápida de prueba | CU-01 |
| `GET` | `/api/protocolos` | Devuelve el catálogo normalizado desde SQLite (`categorias`, `subcategorias`, preguntas e instrucciones) | Soporte / UI |
| `POST` | `/api/llamadas` | Crea una nueva `Llamada` en estado `EN_CURSO` (opcional `analizarAhora: true`) | CU-01, CU-02 |
| `GET` | `/api/llamadas` | Lista llamadas filtrables por `estado`, `categoriaId`, `subcategoriaId` o `prioridad` | CU-06 |
| `GET` | `/api/llamadas/:id` | Obtiene el detalle completo de una `Llamada` (incluye `turnos` derivados al vuelo y `cartaDespacho` si ya fue derivada) | CU-02..CU-06 |
| `POST` | `/api/llamadas/:id/turnos` | Anexa un nuevo intercambio a `transcripcionCruda` y opcionalmente re-analiza la llamada | CU-03 |
| `POST` | `/api/llamadas/:id/analizar` | Ejecuta (o re-ejecuta) el análisis del copiloto sobre `transcripcionCruda` | CU-02, CU-03 |
| `PATCH` | `/api/llamadas/:id` | Actualiza campos validados por el operador; si cambia `subcategoriaId`, recarga checklist y pre-arribo desde SQLite | CU-04, CU-05 |
| `POST` | `/api/llamadas/:id/derivar` | Valida invariantes, pasa la `Llamada` a `DERIVADA` y crea la `CartaDespacho` inmutable | CU-06 |
| `POST` | `/api/llamadas/:id/descartar` | Transiciona una `Llamada` en `EN_CURSO` a `DESCARTADA` | CU-06 |
| `GET` | `/api/cartas-despacho` | Lista la bandeja CAD de `CartaDespacho` derivadas (filtrable por `prioridad` o `categoriaId`) | CU-06 |
| `GET` | `/api/cartas-despacho/:id` | Obtiene el detalle inmutable de una `CartaDespacho` (sin transcripción cruda) | CU-06 |

---

## 2. Detalle de Contratos Principales

### `GET /api/health`
- **Respuesta `200 OK`**:
  - `status`: `"ok"` cuando el proveedor IA y el catálogo operan normalmente, o `"degraded"` cuando se configuró un proveedor real sin credenciales válidas y cayó al fallback `mock`, o cuando el catálogo está vacío.
  ```json
  {
    "status": "ok",
    "ai": {
      "provider": "mock",
      "model": "deterministic-rules-v1",
      "fallbackEnabled": true
    },
    "catalog": {
      "categorias": 7,
      "subcategorias": 21
    },
    "datasetLoaded": 30
  }
  ```

### `GET /api/protocolos`
- **Respuesta `200 OK`**:
  ```json
  {
    "preguntasUniversales": [
      { "id": 1, "texto": "¿Cuál es la dirección exacta, altura o intersección del incidente?", "critica": true }
    ],
    "categorias": [
      {
        "id": 1,
        "nombre": "INCENDIO_RESCATE",
        "etiqueta": "Incendio y Rescate",
        "subcategorias": [
          {
            "id": 1,
            "categoriaId": 1,
            "nombre": "incendio_estructural",
            "etiqueta": "Incendio estructural",
            "criterio": "Fuego o humo en vivienda, comercio o edificio",
            "preguntas": [{ "id": 3, "texto": "¿Hay personas atrapadas en el interior?", "critica": true }],
            "instruccionesPreArribo": [{ "id": 1, "texto": "No reingresar al local por ningún motivo.", "critica": true }]
          }
        ]
      }
    ]
  }
  ```

### `POST /api/llamadas`
- **Body (Zod)**:
  ```json
  {
    "origenReporte": "TELEFONIA_911",
    "transcripcionCruda": "Operador: 911... Llamante: ...",
    "analizarAhora": true
  }
  ```
- **Respuesta `201 Created`**: Objeto `Llamada` completo (incluye `turnos`, `faltantesParaDerivar`, `cartaDespacho: CartaDespacho | null` —poblado cuando `estado === "DERIVADA"— y `ultimoAnalisis`, `checklist` e `instruccionesPreArribo` poblados si `analizarAhora: true`).
- **Errores**: `400 Bad Request` si `transcripcionCruda` está vacía o `origenReporte` es inválido.

### `POST /api/llamadas/:id/analizar`
- **Body (Zod, opcional)**: `{ "simularDegradado"?: boolean }`
- **Respuesta `200 OK`**: `Llamada` actualizada con `ultimoAnalisis` y borrador fusionado respetando overrides humanos.
- **Errores**: `404` si no existe; `409` si ya fue `DERIVADA` o `DESCARTADA`; `503` si el proveedor LLM falla y `LLM_FALLBACK_TO_MOCK=false`.

### `POST /api/llamadas/:id/turnos`
- **Body (Zod)**:
  ```json
  {
    "hablante": "LLAMANTE",
    "texto": "Es al 1540, ya cortamos la llave de gas general.",
    "reanalizar": true
  }
  ```
- **Regla**: Anexa `\nLlamante: ...` (o `Operador: ...`) a `transcripcionCruda` y, si `reanalizar: true`, re-ejecuta el copiloto preservando los overrides humanos.
- **Respuesta `200 OK`**: `Llamada` actualizada.
- **Errores**: `404` si no existe; `409` si ya fue `DERIVADA` o `DESCARTADA`.

### `PATCH /api/llamadas/:id`
- **Body (Zod)**: Campos parciales editables por el operador:
  - `transcripcionCruda`
  - `ubicacion`
  - `categoriaId` / `subcategoriaId`
  - `descripcionIncidente`
  - `prioridad`
  - `checklist` (actualización de `estadoOperador` / `notaOperador` por `preguntaId`)
  - `instruccionesPreArribo` (actualización de `transmitida` por `instruccionId`)
  - `riesgosDetectados`
  - `recursosRecomendadosDespacho`
  - `notasOperativasDespacho`
- **Reglas**:
  1. Registra automáticamente cada campo modificado en `camposEditadosPorOperador`.
  2. Si cambia `subcategoriaId`, el backend sincroniza `categoriaId` desde `subcategorias` y recarga desde `SQLite` el `checklist` e `instruccionesPreArribo` de la nueva subcategoría (conservando las preguntas universales ya confirmadas).
- **Respuesta `200 OK`**: `Llamada` actualizada.
- **Errores**: `400` si algún ID de categoría/subcategoría no existe o el payload es inválido; `404` si no existe la llamada; `409` si ya fue `DERIVADA` o `DESCARTADA`.

### `POST /api/llamadas/:id/derivar`
- **Body (Zod, opcional)**: `{ "notasOperativasDespacho": "..." }`
- **Respuesta `200 OK`**:
  ```json
  {
    "llamada": { "id": "...", "estado": "DERIVADA", "...": "..." },
    "cartaDespacho": {
      "id": "...",
      "llamadaId": "...",
      "origenReporte": "TELEFONIA_911",
      "categoriaId": 1,
      "subcategoriaId": 1,
      "descripcionIncidente": "Incendio en Comercio Gastronómico",
      "prioridad": "P1",
      "ubicacion": { "calle": "Av. Corrientes", "altura": "1540", "interseccion": "Montevideo y Paraná", "barrioComuna": "San Nicolás (Comuna 1)", "referencia": null, "camposFaltantes": [] },
      "riesgosDetectados": ["Grasa inflamada en conductos", "Personas atrapadas"],
      "recursosRecomendadosDespacho": ["1x Autobomba de ataque rápido", "1x Unidad de Rescate", "1x Ambulancia SAME preventiva"],
      "notasOperativasDespacho": "Incendio en cocina de pizzería sobre Corrientes. Humo denso. Empleado atrapado.",
      "derivadaEn": "2026-11-24T04:30:00.000Z"
    }
  }
  ```
- **Errores**:
  - `400 Bad Request` si faltan datos mínimos obligatorios (ubicación mínima, `categoriaId`, `subcategoriaId`, `prioridad` o `notasOperativasDespacho`).
  - `404 Not Found` si no existe la llamada.
  - `409 Conflict` si ya estaba `DERIVADA` o `DESCARTADA`.

### `GET /api/cartas-despacho`
- **Query (opcional)**: `prioridad` (`P1`..`P4`), `categoriaId` (entero).
- **Respuesta `200 OK`**: Lista ordenada por `derivadaEn DESC` de objetos `CartaDespacho` (sin `transcripcionCruda`).

---

## 3. Formato Estándar de Errores HTTP

Todas las respuestas de error (`4xx` / `5xx`) devuelven un objeto JSON uniforme:

```json
{
  "error": "Descripción legible del error",
  "code": "CODIGO_ESTANDAR",
  "details": {}
}
```

- `400 Bad Request`: `REQUEST_VALIDATION_ERROR`, `DOMAIN_VALIDATION_ERROR`, `BUSINESS_RULE_ERROR`, `INVALID_JSON`.
- `404 Not Found`: `NOT_FOUND`, `ROUTE_NOT_FOUND`.
- `409 Conflict`: `INVALID_STATE_TRANSITION`, `CONFLICT`.
- `503 Service Unavailable`: `AI_PROVIDER_UNAVAILABLE`, `AI_PROVIDER_CONFIG_ERROR`.
- `500 Internal Server Error`: `INTERNAL_SERVER_ERROR` (sin stack traces ni secretos).

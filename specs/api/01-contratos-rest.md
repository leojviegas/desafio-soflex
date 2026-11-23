# Especificación de API REST 01: Contratos del Back-End (`backend/`)

## 1. Resumen de Endpoints

| Método | Ruta | Descripción | Caso de Uso |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor, persistencia y proveedor IA activo (`mock` / real) | Infraestructura |
| `GET` | `/api/dataset/llamadas` | Lista los 30 casos sintéticos del CSV para carga rápida de prueba | CU-01 |
| `GET` | `/api/protocolos` | Lista categorías y protocolos base extraídos del catálogo | Soporte |
| `POST` | `/api/llamadas` | Crea una nueva Carta de Llamada en estado `EN_CURSO` (opcional `analizarAhora: true`) | CU-01, CU-02 |
| `GET` | `/api/llamadas` | Lista cartas en curso o filtradas por `estado` (`EN_CURSO`, `DERIVADA`, `DESCARTADA`) | CU-06 |
| `GET` | `/api/llamadas/:id` | Obtiene el detalle completo de una Carta de Llamada | CU-02..CU-06 |
| `POST` | `/api/llamadas/:id/turnos` | Agrega un nuevo turno de diálogo y opcionalmente re-analiza la llamada | CU-03 |
| `POST` | `/api/llamadas/:id/analizar` | Ejecuta (o re-ejecuta) el análisis del copiloto sobre la transcripción actual | CU-02, CU-03 |
| `PATCH` | `/api/llamadas/:id` | Actualiza campos validados por el operador (ubicación, prioridad, checklist, instrucciones, notas) | CU-04, CU-05 |
| `POST` | `/api/llamadas/:id/derivar` | Valida invariantes y transiciona la carta a `DERIVADA` | CU-06 |

---

## 2. Detalle de Contratos Principales

### `GET /api/health`
- **Respuesta `200 OK`**:
  ```json
  {
    "status": "ok",
    "ai": {
      "provider": "mock",
      "model": "deterministic-rules-v1",
      "fallbackEnabled": true
    },
    "datasetLoaded": 30
  }
  ```

### `POST /api/llamadas`
- **Body (Zod)**:
  ```json
  {
    "origenReporte": "TELEFONIA_911",
    "transcripcionCruda": "Operador: 911... Llamante: ...",
    "datasetRefId": "SFX-REC-2026-001",
    "analizarAhora": true
  }
  ```
- **Respuesta `201 Created`**: Objeto `CartaLlamada` completo (con `ultimoAnalisis` poblado si `analizarAhora: true`).
- **Errores**: `400 Bad Request` si `transcripcionCruda` está vacía o `origenReporte` es inválido.

### `POST /api/llamadas/:id/turnos`
- **Body (Zod)**:
  ```json
  {
    "hablante": "LLAMANTE",
    "texto": "Es al 1540, el cocinero sigue adentro pero respira.",
    "reanalizar": true
  }
  ```
- **Respuesta `200 OK`**: `CartaLlamada` actualizada con el nuevo turno y el re-análisis.
- **Errores**: `404` si no existe la llamada; `409` si ya fue `DERIVADA`.

### `PATCH /api/llamadas/:id`
- **Body (Zod)**: Campos parciales editables por el operador (`ubicacionValidada`, `categoriaValidada`, `subcategoriaValidada`, `prioridadValidada`, `preguntasProtocolo`, `instruccionesPreArribo`, `riesgosValidados`, `recursosSugeridosCad`, `notasOperativas`).
- **Regla**: Agrega automáticamente los nombres de campos modificados a `camposEditadosPorOperador`.
- **Respuesta `200 OK`**: `CartaLlamada` actualizada.

### `POST /api/llamadas/:id/derivar`
- **Body (Zod, opcional)**: `{ "notasOperativas": "..." }`
- **Respuesta `200 OK`**: `CartaLlamada` con `estado: "DERIVADA"` y `derivadaEn` ISO timestamp.
- **Errores**:
  - `400 Bad Request` si faltan datos mínimos obligatorios (ubicación mínima, categoría, prioridad o notas).
  - `404 Not Found` si no existe.
  - `409 Conflict` si ya estaba `DERIVADA` o `DESCARTADA`.

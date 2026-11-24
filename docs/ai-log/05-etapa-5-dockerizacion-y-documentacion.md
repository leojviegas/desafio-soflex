# Bitácora Etapa 5: Dockerización, Docker Compose y Documentación Final

- **Fecha**: 2026-11-24
- **Etapa**: Entrega / Contenedorización — Etapa 5

## Decisiones Técnicas y Hallazgos

1. **Multi-stage Dockerfiles sobre `node:22-alpine` y `nginx:1.27-alpine`**:
   - `backend/Dockerfile` utiliza el contexto raíz (`.`) para compilar TypeScript en la etapa `builder`, instalar solo dependencias de producción en `runner`, copiar `docs/dataset_challenge_soflex.csv` y ejecutar como usuario no root (`node`) con `node:sqlite` nativo sin compilación C++.
   - `frontend/Dockerfile` compila el bundle de Vite (`VITE_API_URL=/api`, `VITE_USE_MOCK_API=false`) y lo sirve con `nginx:1.27-alpine`, incorporando `frontend/nginx.conf` con proxy reverso `/api/` hacia `backend:3001` y fallback SPA (`try_files $uri /index.html`).

2. **Orquestación en `docker-compose.yml`**:
   - Se configuró volumen persistente `soflex_sqlite_data` montado en `/app/data` para conservar las llamadas y cartas derivadas entre reinicios.
   - El servicio `backend` incluye `healthcheck` sobre `http://127.0.0.1:3001/api/health` y `frontend` espera `condition: service_healthy`.
   - Todas las variables de IA se interpolan desde el entorno/host con `LLM_PROVIDER=${LLM_PROVIDER:-mock}` para garantizar arranque offline sin `.env` previo.

3. **Documentación consolidada en `README.md`**:
   - A pedido del usuario, se consolidó en el `README.md` raíz tanto la guía de ejecución (`docker compose up --build`, desarrollo local y tests) como la memoria de decisiones, supuestos, trade-offs y mejoras futuras, sin crear un archivo `DECISIONS.md` separado.

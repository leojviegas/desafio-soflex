# ADR 001: Decisiones de Arquitectura, Stack, Persistencia y Estrategia LLM

- **Estado**: Aceptado
- **Fecha**: 2026-11-23

---

## 1. Arquitectura Monorepo y Docker Compose

### Contexto
El enunciado exige levantar la solución con un único comando (`docker compose up --build`), separando el servicio de API y el panel web con una puerta de entrada simple.

### Decisión Adoptada
- Estructura dividida en `/backend` y `/frontend` con `docker-compose.yml` en raíz compuesto por 2 servicios:
  - `backend`: API REST en Node.js + Express + TypeScript (`3001` interno).
  - `frontend`: Build de React + Vite + TypeScript servido por Nginx en `http://localhost:3000` (puerto estándar esperado en el enunciado) con proxy reverso `/api` hacia `backend`.
- Se evita sumar infraestructura externa innecesaria (bases de datos en contenedores separados, servidores de correo o gestión compleja de certificados) para garantizar un arranque rápido, predecible y sin configuración manual de secretos.

---

## 2. Lenguaje: TypeScript vs JavaScript

### Opciones Evaluadas
1. **TypeScript en Back-End y Front-End** *(Elegida)*:
   - Stack moderno y cohesionado (`tsx`, `vitest`, `tsc`, `zod`, Vercel AI SDK).
   - Responde de forma directa al criterio de evaluación *"tipado estricto"* y evita errores de contratos entre el esquema Zod del LLM, la API REST y la UI del operador.
2. **JavaScript ESM**:
   - Menor paso de compilación, pero sin verificación estática de tipos en build ni contratos compartidos tipados.

### Decisión Adoptada
Se adopta **TypeScript estricto** tanto en `backend/` como en `frontend/`.

---

## 3. Persistencia: SQLite vs Memoria vs MongoDB

### Opciones Evaluadas
1. **SQLite embebido con volumen Docker** *(Elegida)*:
   - Mencionado explícitamente como opción válida en `docs/enunciado.md`.
   - Cero contenedores adicionales, archivo único local, soporta reinicios del contenedor conservando las Cartas de Llamada derivadas y permite consultas rápidas sobre el catálogo cargado desde CSV.
   - Enfoque híbrido: columnas relacionales para filtrado (`id`, `estado`, `prioridad`, `categoria`, `creada_en`) y columnas JSON para colecciones anidadas (`turnos`, `preguntas`, `instrucciones`, `ultimo_analisis`).
   - Encapsulado detrás de interfaces de repositorio para mantener desacoplamiento y tests rápidos en memoria (`:memory:`).
2. **Persistencia pura en memoria**:
   - Muy rápida de implementar, pero pierde las cartas derivadas al reiniciar el contenedor.
3. **MongoDB**:
   - Añade peso de imagen, healthchecks y configuración innecesaria para un prototipo autocontenido de entrega rápida.

### Decisión Adoptada
Se adopta **SQLite embebido** detrás de repositorios desacoplados, con soporte `:memory:` para la suite de tests.

---

## 4. Estrategia LLM (Modo Real + Modo Simulado)

### Contexto
El enunciado exige soporte para Modo Real (API o local) y Modo Simulado (`LLM_PROVIDER=mock`) offline. En el entorno actual no está instalado `ollama`.

### Decisión Adoptada
- Adoptar un patrón desacoplado de proveedor IA: interfaz `CopilotAnalyzerProvider` + **Vercel AI SDK** (`generateObject` con esquema Zod).
- **Modo Simulado (`LLM_PROVIDER=mock`) como valor por defecto**: funciona offline desde el primer `docker compose up --build` combinando el catálogo del CSV y un motor determinista de reglas.
- **Modo Real**:
  - **Proveedor principal**: **Gemini API** (`@ai-sdk/google`, modelo `gemini-2.5-flash`) vía Google AI Studio API Key (`GEMINI_API_KEY`).
  - **Soporte adicional cableado en `llm.ts`**: `ollama` (ejecución local) y `openai` / `openai-compatible` (Groq, vLLM).

---

## 5. Explotación del Dataset (`docs/dataset_challenge_soflex.csv`)

### Decisión Adoptada
Utilizar las 30 filas (18 columnas) en cuatro capas complementarias:
1. **Catálogo de protocolos**: preguntas mandatorias, instrucciones pre-arribo y recursos por categoría.
2. **Retrieval few-shot liviano**: inyectar los 2 ejemplos más similares (excluyendo coincidencia exacta) al prompt del LLM.
3. **Respaldo del modo `mock`**: base de reglas y normalización determinista.
4. **Banco de prueba en UI y tests**: carga en 1 clic desde el panel del operador y suite de pruebas automatizada.

# AGENTS.md — Guía Global para Agentes de IA (`desafio-soflex`)

Este archivo define las reglas globales, el contexto del dominio y el flujo de trabajo para cualquier agente de Inteligencia Artificial que opere en el repositorio **Copiloto Asistente para Operadores de Sala** (Desafío Técnico Soflex).

---

## 1. Contexto del Proyecto y Principio de Sala

El sistema es un **Copiloto Inteligente para Operadores de Sala** (centros 911, 147, 103 y 107) que procesa transcripciones textuales de llamadas ciudadanas para reducir la carga cognitiva del operador bajo presión.

La fuente de verdad del problema y el dataset de referencia se encuentran en `docs/enunciado.md` y `docs/dataset_challenge_soflex.csv`.

### Principio Crítico de Operación
- El operador de atención **no** despacha recursos en la calle (eso lo ejecuta un despachador en el sistema CAD).
- El trabajo del operador es:
  1. Contener al ciudadano y conducir el interrogatorio guiado de protocolo.
  2. Extraer y validar ubicación precisa, tipología del hecho y nivel de severidad (`P1` a `P4`).
  3. Transmitir de inmediato instrucciones de seguridad y pre-arribo.
  4. Conformar y derivar formalmente la **Carta de Llamada** estructurada para el despacho CAD.

---

## 2. Requerimientos Técnicos No Negociables

1. **Arquitectura Dividida**: Monorepo con `/backend` (API REST + lógica de copiloto + persistencia) y `/frontend` (panel web del operador).
2. **Patrón Dual-Provider para IA**:
   - **Modo Simulado (`LLM_PROVIDER=mock`)**: Activo por defecto si no hay credenciales externas. Debe ejecutar el flujo completo de forma offline y determinista.
   - **Modo Real**: Compatible con APIs externas (Gemini, OpenAI, Anthropic, Groq/OpenAI-compatible) o LLM local (Ollama/vLLM) mediante interfaz desacoplada.
3. **Esquemas Estructurados y Control de Alucinaciones**:
   - Toda salida de IA debe validarse con esquemas estrictos (`zod`).
   - Prohibido inventar direcciones, alturas, intersecciones o hechos que no figuren en la transcripción; los datos ausentes deben quedar como `null` y reflejarse en `camposFaltantes`.
4. **Human-in-the-Loop**:
   - El operador siempre puede validar, corregir o sobreescribir las sugerencias de la IA antes de derivar la Carta de Llamada.
5. **Seguridad y DX**:
   - Cero secretos o API keys commiteados en el repositorio.
   - El sistema completo debe levantar sin fricción con `docker compose up --build`.

---

## 3. Flujo de Trabajo: Spec-Driven Development (SDD)

1. **Consultar `docs/enunciado.md`, `docs/adr/` y `specs/`** antes de escribir o modificar código.
2. **Actualizar la Spec correspondiente en `specs/`** (`domain/`, `ai/`, `api/`, `features/`, `ui/`) si cambia algún contrato o regla.
3. **Implementar en `/backend` y `/frontend`** respetando `backend/AGENTS.md` y `frontend/AGENTS.md`.
4. **Documentar decisiones de diseño** en `docs/adr/` y aprendizajes relevantes en `docs/ai-log/` (insumo para `DECISIONS.md`).

---

## 4. Estructura del Harness (`.agents/`)

- `.agents/skills/`: Skills modulares (`spec-writer`, `backend-copilot-layer`, `operator-ui`).
- `.agents/rules/`: Reglas obligatorias del dominio (`principios-dominio-soflex.md`).
- `.agents/commands/`: Flujos operativos reutilizables.
- `backend/AGENTS.md` y `frontend/AGENTS.md`: Reglas específicas de cada módulo.

# AGENTS.md — Reglas del Módulo Front-End (`frontend/`)

Este archivo define las directrices específicas para el desarrollo del Panel Web del Operador (`frontend/`).

---

## 1. Stack Consolidado (según `docs/adr/001-decisiones-arquitectura-y-stack.md`)

- **Framework y Lenguaje**: React + Vite + TypeScript estricto + Tailwind CSS.
- **Comunicación con Back-End**: Consumo de la API REST mediante `src/services/` (en Docker Compose a través de `/api` proxied por Nginx, o configurable vía `VITE_API_URL`).

---

## 2. Organización del Código (`frontend/src/`)

- **`pages/`**: Vistas principales (Consola de Operación en Vivo, Bandeja de Cartas Derivadas).
- **`components/`**: Componentes reutilizables (selector de casos del dataset, editor de turnos/transcripción, visor de instrucciones pre-arribo, checklist dinámico de protocolo, badges de prioridad `P1`–`P4`, indicador de modo IA/certeza).
- **`features/`**: Módulos funcionales por sección de la consola (ingesta de llamada, asistencia en vivo, formulario de Carta de Llamada).
- **`services/`**: Cliente HTTP centralizado hacia el Back-End.
- **`hooks/`**: Hooks para estado de llamada activa, atajos de teclado del operador y sincronización.
- **`types/`**: Estructuras de datos alineadas con `specs/domain/` y `specs/api/`.
- **`styles/`**: Tokens visuales, contraste de emergencias y estilos globales.

---

## 3. Principios UX para Operador Bajo Presión

- **Cero fricción innecesaria**: La información crítica (instrucciones pre-arribo y preguntas pendientes) debe estar visible sin scroll excesivo ni modales bloqueantes.
- **Distinción visual clara**: Diferenciar qué campos fueron sugeridos por la IA y cuáles fueron validados o editados manualmente por el operador.
- **Visibilidad de estado**: Mostrar siempre si el sistema opera en Modo Real o Modo Simulado (`mock`), la latencia del análisis y si hubo degradación a fallback.
- **Atajos de teclado**: Soportar atajos rápidos (`Ctrl+Enter` para analizar, `Alt+D` para derivar, `Alt+1..4` para prioridad).

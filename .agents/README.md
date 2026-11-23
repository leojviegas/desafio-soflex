# Directorio `.agents/` — Configuración del Sistema de Agentes

Esta carpeta centraliza las customizaciones de IA descubiertas por el entorno:

- **`skills/`**: Paquetes modulares de conocimiento y procedimientos (`<skill-name>/SKILL.md`).
  - `spec-writer`: Redacción y mantenimiento de especificaciones en `specs/` bajo SDD.
  - `backend-copilot-layer`: Construcción de capas del backend, dual-provider IA y retrieval del dataset.
  - `operator-ui`: Diseño e implementación del panel web del operador bajo estrés.
- **`rules/`**: Reglas contextuales obligatorias (`*.md`).
- **`commands/`**: Flujos operativos y prompts reutilizables.

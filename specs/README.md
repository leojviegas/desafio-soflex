# Especificaciones del Proyecto (`specs/`) — Spec-Driven Development

Toda funcionalidad del **Copiloto Asistente para Operadores de Sala** se especifica aquí antes de su implementación en código.

## Estructura de `specs/`

- **`domain/`**: Entidades, enumeraciones, invariantes y máquina de estados de la Carta de Llamada ([01-entidades-y-reglas.md](./domain/01-entidades-y-reglas.md)).
- **`ai/`**: Contrato del analizador dual-provider, esquema estructurado Zod, estrategia anti-alucinación y explotación del dataset CSV ([01-extraccion-y-proveedores-llm.md](./ai/01-extraccion-y-proveedores-llm.md)).
- **`api/`**: Contratos de la API REST en Express (endpoints, payloads, validaciones Zod y códigos de estado HTTP) ([01-contratos-rest.md](./api/01-contratos-rest.md)).
- **`features/`**: Casos de uso punta a punta del flujo operativo ([01-flujo-operador-y-carta-llamada.md](./features/01-flujo-operador-y-carta-llamada.md)).
- **`ui/`**: Especificación del panel web del operador bajo estrés ([01-panel-operador-web.md](./ui/01-panel-operador-web.md)).
- **`templates/`**: Plantillas estandarizadas para nuevas especificaciones.

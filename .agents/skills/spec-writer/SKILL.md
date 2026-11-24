---
name: spec-writer
description: >-
  Use this skill when creating, updating, or reviewing specifications in specs/
  (domain, AI extraction/providers, REST API contracts, functional features, or
  operator web UI) based on docs/enunciado.md, docs/dataset_challenge_soflex.csv,
  and docs/adr/.
---

# Spec Writer Skill (`desafio-soflex`)

Guía la redacción y mantenimiento de especificaciones bajo **Spec-Driven Development (SDD)** para el **Copiloto Asistente para Operadores de Sala**.

---

## 1. Fuentes de Verdad Obligatorias

Antes de redactar o modificar cualquier spec en `specs/`, leer:
1. [docs/enunciado.md](../../docs/enunciado.md): Contexto de sala, 4 pilares funcionales, dual-provider y criterios de evaluación.
2. [docs/dataset_challenge_soflex.csv](../../docs/dataset_challenge_soflex.csv): Estructura real de los 30 incidentes sintéticos (18 columnas, categorías, prioridades y protocolos).
3. [docs/adr/](../../docs/adr/README.md): Decisiones arquitectónicas vigentes.

---

## 2. Tipos de Especificaciones y Ubicación

| Categoría | Carpeta Destino | Plantilla Base | Qué debe especificar |
| :--- | :--- | :--- | :--- |
| **Dominio** | `specs/domain/` | [specs/templates/domain-spec.template.md](../../specs/templates/domain-spec.template.md) | Entidades, enums (`P1`-`P4`, categorías), invariantes, estados de la Carta de Llamada. |
| **IA / Copiloto** | `specs/ai/` | N/A | Contrato `CopilotAnalyzerProvider`, esquema Zod de salida, retrieval few-shot sobre CSV, reglas `mock` y anti-alucinación. |
| **API REST** | `specs/api/` | [specs/templates/api-spec.template.md](../../specs/templates/api-spec.template.md) | Endpoints Express, validación Zod de entrada, respuestas JSON y códigos HTTP (`200`, `201`, `400`, `404`, `409`, `502`/`503`). |
| **Features** | `specs/features/` | [specs/templates/feature-spec.template.md](../../specs/templates/feature-spec.template.md) | Casos de uso punta a punta, flujos alternativos y criterios de aceptación verificables. |
| **UI Operador** | `specs/ui/` | [specs/templates/ui-spec.template.md](../../specs/templates/ui-spec.template.md) | Panel web en 3 columnas, distinción sugerencia IA vs edición humana, atajos de teclado y estados de error/degradado. |

---

## 3. Reglas de Consistencia Transversal

1. Todo campo visualizado en `specs/ui/` debe existir en `specs/api/` y originarse en `specs/domain/` o `specs/ai/`.
2. Ninguna spec puede asumir que el operador despacha móviles directamente; siempre se conforma y deriva la Carta de Llamada al sistema CAD.

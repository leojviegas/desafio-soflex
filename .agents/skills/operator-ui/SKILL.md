---
name: operator-ui
description: >-
  Use this skill when designing or implementing the frontend operator console,
  components, keyboard shortcuts, AI vs human edit indicators, or API client
  integration in frontend/.
---

# Operator UI Skill (`frontend/`)

Guía la construcción del Panel Web del Operador para situaciones de alta tensión en sala.

---

## 1. Principios de Diseño Operativo

1. **Jerarquía de Escaneo Rápido**:
   - Barra superior fija: estado de llamada, selector rápido de caso del CSV o nueva llamada, indicador de modo IA (`MOCK` vs `REAL` + modelo + latencia) y botón de acceso a Bandeja de Cartas Derivadas.
   - Columna izquierda: Transcripción de la llamada + agregador de nuevos turnos de diálogo (`Operador:` / `Llamante:`) + botón de análisis (`Ctrl+Enter`).
   - Columna central: **Asistencia en Vivo**:
     - Bloque destacado de **Instrucciones de Seguridad Pre-Arribo** (lectura inmediata al ciudadano, con check de "Transmitida").
     - **Checklist Dinámico de Protocolo** separado en preguntas pendientes (arriba, accionables) y respondidas en el relato (con evidencia textual).
     - Riesgos detectados y nivel de certeza del análisis.
   - Columna derecha: **Carta de Llamada (Salida a CAD)**:
     - Formulario editable con ubicación normalizada (calle, altura, intersección, barrio/comuna), categoría, subcategoría, prioridad (`P1` a `P4`), notas operativas y recursos sugeridos de referencia.
     - Indicador visual claro cuando un campo fue sugerido por IA (`Sugerido IA`) frente a validado/editado por el operador (`Confirmado Operador`), más alerta en campos faltantes (`null`).
     - Botón primario de **Derivar Carta de Llamada a CAD** (`Alt+D`).

---

## 2. Estados y Resiliencia

- Mostrar estados explícitos de carga ("Analizando transcripción..."), estado vacío inicial, error de red recuperable y banner de modo degradado si el LLM falló y actuó el fallback.
- Mantener la interfaz limpia, con alto contraste en badges de prioridad (`P1` rojo crítico, `P2` ámbar alto, `P3` amarillo medio, `P4` azul/gris bajo) y sin modales innecesarios que bloqueen al operador.

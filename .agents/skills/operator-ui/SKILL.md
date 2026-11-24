---
name: operator-ui
description: >-
  Use this skill when designing, prototyping mockups, or implementing the
  frontend operator console, design tokens, components, keyboard shortcuts,
  AI vs human edit indicators, or API client integration in frontend/.
---

# Operator UI Skill (`frontend/`)

Guía la construcción de mockups y del Panel Web del Operador (React + Vite + TypeScript estricto + Tailwind CSS) para situaciones de alta tensión en sala, alineado con `specs/ui/01-panel-operador-web.md`, `specs/domain/01-entidades-y-reglas.md` y `specs/api/01-contratos-rest.md`.

Complementar siempre con las skills instaladas:
- `frontend-design`: dirección estética intencional y pulido visual evitando interfaces genéricas.
- `vercel-react-best-practices`: rendimiento de renderizado, composición y gestión de estado en React.
- `web-design-guidelines`: auditoría de accesibilidad, foco de teclado y buenas prácticas web.

---

## 1. Principios de Diseño Operativo (Cero Fricción)

1. **Jerarquía de Escaneo Rápido (Desktop 3 Columnas + Responsive)**:
   - **Barra superior fija (Header Operativo)**: identificador de `Llamada` activa + badge de estado (`EN_CURSO`, `DERIVADA`, `DESCARTADA`), selector rápido buscable de los 30 casos del CSV + botón "Nueva Llamada Libre", indicador en vivo de modo IA (`Modo simulado (mock)` vs `Modo real (<provider> / <model>)` + latencia en `ms` + alerta si `degradado === true`), y navegación directa entre **Consola en Vivo** (`Llamada`) y **Bandeja de Despacho CAD** (`CartaDespacho`).
   - **Columna izquierda (Transcripción y Turnos)**: `transcripcionCruda` renderizada por turnos (`Operador` / `Llamante` parseados al vuelo) + input rápido para anexar un nuevo turno y disparar **Analizar / Re-analizar** (`Ctrl+Enter`).
   - **Columna central (Asistencia en Vivo del Copiloto)**:
     - **Instrucciones de Seguridad Pre-Arribo** arriba de todo en tarjeta de alto contraste (lectura inmediata al ciudadano, distinción visual de directivas críticas y checkbox `transmitida`).
     - **Checklist Dinámico de Protocolo** dividido en **Pendientes / Por Confirmar** (`PENDIENTE` y `AMBIGUA` priorizados arriba; aviso explícito si `evidenciaVerificada === false`) y **Respondidas en Relato** (`RESPONDIDA` con `respuestaIA` y `citaEvidencia` verificada). Acciones rápidas por ítem: `CONFIRMADA`, `NO_APLICA` o `notaOperador`.
     - **Riesgos Detectados y Certeza**: chips editables de `riesgosDetectados` + indicador `Confianza: ALTA | MEDIA | BAJA`.
   - **Columna derecha (Borrador de Carta de Despacho — Salida a CAD)**:
     - Formulario estructurado editable: ubicación normalizada (`calle`, `altura`, `interseccion`, `barrioComuna`, `referencia`) con alerta visual en `ubicacion.camposFaltantes`; selectores vinculados `categoriaId` -> `subcategoriaId` (al cambiar `subcategoriaId`, se recargan automáticamente checklist y pre-arribo); `descripcionIncidente`; selector rápido de `prioridad` (`P1`..`P4` con atajos `Alt+1..4`); `notasOperativasDespacho` y `recursosRecomendadosDespacho`.
     - Badge discreto pero inequívoco por campo: `Sugerido IA` vs `Editado Operador` (según `camposEditadosPorOperador`).
     - Botón primario **Derivar a CAD** (`Alt+D`), deshabilitado con explicación concreta si faltan invariantes mínimos o si la llamada ya fue `DERIVADA` / `DESCARTADA`.
   - **Vista Secundaria (Bandeja CAD)**: lista y detalle de `CartaDespacho` filtrable por `prioridad` y `categoriaId`, mostrando exclusivamente el entregable operativo estructurado (sin exponer `transcripcionCruda`).

---

## 2. Sistema de Diseño, Tokens y Contrato de Componentes

1. **Fuente única de verdad visual (`src/styles/`)**:
   - Centralizar colores semánticos, superficies, tipografía, espaciado (escala de 4px), radios y estados de severidad (`P1` rojo crítico, `P2` ámbar alto, `P3` amarillo medio, `P4` azul/gris bajo) como variables CSS consumidas por Tailwind.
   - Prohibido hardcodear colores hexadecimales o tamaños arbitrarios repetidos dentro de páginas o features.
2. **Contrato de componentes compartidos (`src/components/`)**:
   - Definir explícitamente `variant`, `size` y estados (`default`, `hover`, `focus-visible`, `disabled`, `loading`) con accesibilidad por teclado completa (`aria-label`, `aria-live` para alertas de análisis/degradación).
   - Preferir composición (`children`) frente a props de contenido interminables.
   - Promover un bloque a `src/components/` solo cuando se reutiliza en 2+ vistas o cumple un rol semántico claro (`PriorityBadge`, `FieldOriginTag`, `ProtocolItemRow`, `PreArrivalCard`, `StatusPill`).
3. **Anti-patrones prohibidos en Consola Crítica**:
   - **Modales bloqueantes innecesarios**: nunca tapar la transcripción ni las instrucciones pre-arribo con popups para tareas rutinarias.
   - **Saturación de tarjetas idénticas ("todo es una card")**: agrupar ítems con divisores sutiles y jerarquía tipográfica/espacial, reservando bordes y contraste fuerte para alertas críticas (`P1`, pre-arribo crítico, campos faltantes).
   - **Decoración que empuja la acción fuera del viewport**: nada de headers gigantes ni gradientes ornamentales; en 1366x768 o 1440x900 las 3 columnas críticas deben ser operables al primer vistazo.
   - **Parpadeo de pantalla completa al analizar**: usar estados de carga localizados y no bloqueantes en columnas 2 y 3 mientras el operador sigue leyendo o escribiendo.
   - **Emojis como iconografía de interfaz**: usar iconografía vectorial limpia (SVG / Lucide) y señales tipográficas/cromáticas con alto contraste (accesible también sin depender solo del color).

---

## 3. Estados, Resiliencia y Auto-Crítica Visual

- Contemplar siempre los 4 estados de pantalla: **vacío inicial** (guía directa para cargar caso CSV o pegar transcripción), **cargando análisis** (no bloqueante), **error/degradado** (banner ámbar si actuó fallback determinista o error de red recuperable) y **derivada/inmutable** (confirmación con ID de `CartaDespacho`, hora y bloqueo claro de edición).
- Al cerrar cada mockup o pantalla, realizar un pase de verificación sobre 4 ejes:
  1. **Jerarquía y contraste**: lo vital (pre-arribo, preguntas pendientes, prioridad `P1`, botón Derivar) destaca primero.
  2. **Proximidad y ritmo**: elementos relacionados agrupados con `gap` consistente sobre grilla de 4px.
  3. **Unidad visual**: badges, radios, bordes y estados de foco coherentes en toda la consola.
  4. **Operación por teclado**: foco visible y atajos (`Ctrl+Enter`, `Alt+D`, `Alt+1..4`) funcionales sin perder contexto.

Evaluación Técnica · Proceso de Selección Sistemas de Misión Crítica & Inteligencia Artificial Plazo: 72 horas corridas 



CASO DE ESTUDIO & DESAFÍO TÉCNICO 

# Copiloto Asistente para Operadores de Sala 

Diseño y construcción de un servicio inteligente de asistencia sobre transcripciones de llamadas con panel de operador, extracción contextual y contenedorización en Docker. 

|PERFIL DESTINO|PLAZO DE ENTREGA|MODALIDAD|
|---|---|---|
|Semi-Senior/Jr.Avanzado|72horas corridas|Docker Compose·Local|



## 01. Contexto y Realidad del Dominio 

En Soflex desarrollamos e implementamos plataformas que gestionan centros de atención ciudadana y despacho de emergencias (como 911 y 147) que operan en régimen 24/7/365. En este contexto, el factor humano es determinante: los operadores atienden llamadas en situaciones de alta tensión, escuchando relatos entrecortados, ruidosos o desorganizados, y deben procesar la información en segundos. 

#### PRINCIPIO DE OPERACIÓN EN SALA 

El operador que atiende la llamada NO decide el despacho de recursos en la calle. El despacho lo ejecuta un despachador en el sistema CAD. El trabajo crítico del operador de atención es: 

- Contener al ciudadano y conducir el interrogatorio guiado de protocolo. 

- Extraer y validar los datos de la situación: dirección precisa, tipo de hecho y nivel de riesgo. 

- Transmitir de inmediato instrucciones de seguridad y pre-arribo (ej. evacuación, primeros auxilios). 

- Conformar y derivar la Carta de Llamada con el resumen estructurado para el despacho. 

Este desafío reproduce ese escenario real de sala, permitiéndote diseñar una solución que demuestre tu visión de producto, tu arquitectura y tu capacidad de ejecución práctica. 

## 02. La Consigna del Desafío 

Tu objetivo es diseñar y desarrollar un prototipo funcional contenerizado que funcione como un Copiloto Inteligente para el Operador. El sistema procesa la transcripción de texto de una llamada ciudadana (desgrabación de los turnos de diálogo) y asiste al operador en pantalla reduciendo su carga cognitiva. 

#### INSUMO DEL SISTEMA: TRANSCRIPCIÓN DE TEXTO 

El copiloto se alimenta de transcripciones textuales de llamadas sintéticas provistas. No se requiere procesamiento de audio ni telefonía en tiempo real: lo que evaluamos es tu capacidad para ingerir, interpretar, normalizar y extraer valor operativo a partir de la desgrabación en texto de la conversación. 

No buscamos imponerte una arquitectura cerrada ni decirte paso a paso cómo programarlo. Queremos evaluar tu criterio de ingeniería: cómo pensás el problema, cómo modelás los datos, qué decisiones tomás para evitar alucinaciones y cómo diseñás una herramienta que realmente le sirva a un usuario bajo presión. 

### Extracción y Normalización 

Identificar del relato ubicación (calle, altura, esquinas), tipología sugerida del hecho y nivel de severidad (P1 a P4). 

### Checklist Dinámico de Protocolo 

Detectar qué preguntas clave ya fueron respondidas en la conversación y cuáles faltan realizar según el tipo de incidente. 

### Instrucciones de Seguridad 

Presentar en pantalla las indicaciones inmediatas de pre-arribo que el operador debe leerle al ciudadano mientras llega la ayuda. 

### Interacción Humana Activa 

Permitir al operador validar o ajustar las sugerencias, marcar el checklist y derivar formalmente la ficha estructurada. 

#### ESPACIO PARA APORTAR VALOR E INICIATIVA 

Tenés total libertad para proponer y sumar funcionalidades que consideres valiosas: normalización fonética de calles, visualización en mapa, atajos de teclado para el operador, cálculo de nivel de certeza del modelo, simulación de audio o lo que tu experiencia te dicte. La proactividad y el criterio de producto son altamente valorados. 

## 03. Dataset Provisto y Flexibilidad Técnica 

Junto a esta consigna se provee el archivo dataset_challenge_soflex.csv con incidentes sintéticos documentados (transcripciones con modismos locales, direcciones, categorías, protocolos asociados y notas de despacho). Vos decidís cómo separar, indexar o explotar esta información: podés cargarla en SQLite, usar búsqueda semántica, implementar un vector store liviano, usarla para few-shot prompting o integrarla como catálogo de referencia. 

### Stack y Lenguajes 

Por afinidad con nuestro ecosistema sugerimos Python o TypeScript / Node, pero podés utilizar el lenguaje, frameworks y librerías que consideres más idóneos. Lo esencial es que la solución sea prolija, testeable y levante con un único comando. 

### Arquitectura Desacoplada: Modo Real vs. Modo Simulado 

Este challenge está pensado para ser 100% accesible y sin barreras de costo. El sistema debe contemplar un patrón de proveedor (dual provider): 

- Modo Real: Si configurás una clave de API (OpenAI, Anthropic, Gemini, Groq) o un modelo local (Ollama/vLLM), el sistema ejecuta las extracciones con el LLM. 

- Modo Simulado ( LLM_PROVIDER=mock ): Si no se define ninguna credencial externa, el sistema responde mediante un mock determinista o reglas en el backend, permitiendo que cualquiera pruebe el flujo completo de forma offline y gratuita. 

## 04. Criterios de Evaluación 

Evaluamos el balance entre criterio de producto, solidez de arquitectura y capacidad de entrega en tiempo y forma: 

|EJE DE EVALUACIÓN|QUÉ OBSERVAMOS CONCRETAMENTE|
|---|---|
|Criterio de Producto y Dominio|¿El diseño ayuda realmente a un operador bajo estrés?Claridad en la presentación<br>de la información,ausencia de fricción innecesaria y entendimiento del rol en sala.|
|Criterio de Arquitectura e IA|Comprensión e interpretación de la transcripción textual(modismos,ruido,datos<br>incompletos),uso de esquemas estructurados(Pydantic/Zod),control de<br>alucinaciones y resiliencia ante respuestas malformadas.|
|Calidad de Código y<br>Modularidad|Separación adecuada de responsabilidades,tipado estricto,código legible y<br>ausencia de secretos o credenciales commiteadas en el repositorio.|
|Developer Experience(DX)y<br>Ejecución|Un<br>docker compose up predecible que levanta de primera,datos sintéticos listos<br>para probar y un flujo punta a punta que funciona.|



## 05. Modalidad y Formato de Entrega 

El plazo máximo de entrega es de 72 horas corridas a partir de la recepción de esta guía. Esperamos los siguientes tres elementos: 

### 1: Repositorio Git Contenerizado 

Repositorio público (GitHub o GitLab) o archivo comprimido con historial de commits prolijo. Debe incluir el archivo docker-compose.yml y levantar sin fricción con el comando: 

docker compose up --build 

El panel debe quedar inmediatamente accesible en el navegador local (ej. http:-/localhost:8000 o 3000 ). 

### 2: Video Demostrativo Breve (1 a 3 minutos) 

Grabación de pantalla (Loom o formato MP4) mostrando el prototipo en funcionamiento real: levantando el entorno, cargando una transcripción de prueba, mostrando cómo el copiloto asiste al operador y la acción final de derivación de la carta de llamada. 

No es necesario explicar la arquitectura nidar clases teóricas en elvideo; concentrate en mostrar elproducto en acción. 

### 3: Memoria de Decisiones (README.md / DECISIONS.md) 

Breve documento en la raíz del repositorio explicando cómo ejecutar el proyecto, qué supuestos de diseño tomaste, qué trade-offs asumiste y qué mejoras implementarías con más tiempo. 

SOFLEX S.A. · Ingeniería de Software · Departamento de IA & Sistemas Críticos Buenos Aires, Argentina · Documento de Evaluación Técnica 


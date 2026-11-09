# 003 — Agente con herramientas (texto) · Tareas

> **Estado:** APROBADO por el humano (2026-11) (Fase 4: Tareas). T-001 hecha; el resto sin marcar.
> Leyenda: **A** = agente, **H** = humano. Prerrequisitos: 002 cerrada (con su enmienda v2), la enmienda de la constitución (P2) aprobada y la clave `GEMINI_API_KEY` en `.env`.
> Commits (cuando el humano los pida): `feat(003): T-0xx descripción`. El diseño móvil/Android queda fuera.

## Fase A — Decisiones y base

- [x] **T-001 · H · Aprobar la spec v2 y la enmienda de la constitución; resolver Q-4…Q-17** (todos)
  Revisar la constitución (P2 enmendado) y la spec. Decidir como mínimo: repetición en v1 (Q-4), conteo del tope con varias llamadas (Q-6), privacidad y consentimiento (Q-7, con C-7), compuertas de calidad (Q-9) y proveedores (Q-11).
  **Hecho cuando:** la spec pasa a «APROBADO» sin preguntas bloqueantes.

- [ ] **T-002 · A · Spike: herramientas y salida estructurada de Strands con Gemini** (RF-004, RF-006, D-1, D-7)
  Script desechable en el directorio temporal: un agente con **una herramienta de lectura falsa y una de preparación falsa**; comprobar (a) cómo declarar herramientas con closures por petición, (b) si **herramientas y salida estructurada** funcionan juntas (si no, probar las herramientas terminales), (c) que `GEMINI_MODEL` soporta llamadas a herramientas con fiabilidad (Q-16), (d) cómo limitar los usos de herramientas, (e) el tipo de excepción de cuota y de tiempo, (f) latencia y número de llamadas al modelo por comando. Anotar los hallazgos en `plan.md` §6 y §10.
  **Hecho cuando:** hay una llamada real exitosa con ambas clases de herramientas y los hallazgos están anotados.

- [ ] **T-003 · A · Variables de configuración del agente** (RF-030, RNF-002)
  Añadir a `core/config.py` (`GEMINI_API_KEY` como `SecretStr` opcional, `GEMINI_MODEL`, límites, tiempos, largos) y a `.env.example`; unificar con `agent/config.py` (una sola fuente; Gemini por defecto).
  **Hecho cuando:** `test_config` cubre «sin clave → arranca; el asistente responde `agent_not_configured`». *Depende de T-001.*

## Fase B — Base de datos y tope diario

- [ ] **T-004 · A · Escribir la migración `agent_usage`** (RF-026)
  `supabase/migrations/2026…_agent_usage.sql` según `plan.md` §9; fila en `supabase/MIGRATIONS.md`. **No se aplica.**
  **Hecho cuando:** el humano revisó el SQL. *Depende de T-001.*

- [ ] **T-005 · H · Aplicar la migración en `dev`** (RF-026)
  En el SQL Editor de `calendargreen-dev`; anotar la fecha.
  **Hecho cuando:** tabla y funciones existen. *Depende de T-004.*

- [ ] **T-006 · A · Repositorio del uso diario** (RF-026, RF-027, RF-029)
  `increment_agent_usage` y `refund_agent_usage` en la interfaz y en las versiones en memoria y Supabase (RPC).
  **Hecho cuando:** pruebas unitarias pasan y la de integración confirma atomicidad con llamadas paralelas. *Depende de T-005.*

## Fase C — Agente: herramientas y lectura acotada

- [ ] **T-007 · A · Vista de solo lectura del repositorio** (RF-008, RF-022, D-3)
  `agent/readonly.py`: protocolo `ReadOnlyRepository` (solo lecturas) y adaptador sobre el repositorio.
  **Hecho cuando:** una prueba comprueba que el objeto que recibe el agente **no tiene** métodos de escritura. *Depende de T-001.*

- [ ] **T-008 · A · Esquemas, colector de acciones y referencias** (RF-010, RF-019, D-4, D-8)
  `agent/schemas.py` y `agent/collector.py`: acciones tipadas, referencias opacas `tN`, límite de 3, una acción por tarea, validación con Pydantic.
  **Hecho cuando:** `test_agent_tools` (colector) pasa: referencias no vistas rechazadas, máx. 3, sin duplicados. *Depende de T-007.*

- [ ] **T-009 · A · Herramientas del agente** (RF-006, RF-007, RF-008, RF-009, RF-014)
  `agent/tools.py` con `build_tools(ctx)`: `query_agenda` (usuario, rango, 50 máx., sin notas), `propose_create`, `propose_update`, `propose_delete`; cada una cerrada sobre el `user_id` del servidor; validan y devuelven mensajes claros al modelo; **ninguna escribe**.
  **Hecho cuando:** `test_agent_tools` (herramientas) pasa, incluido el aislamiento entre usuarios y la ausencia de notas. *Depende de T-002, T-008.*

- [ ] **T-010 · A · Instrucciones del agente y armado del mensaje** (RF-005, RF-012…RF-018, RF-023)
  `agent/prompt.py` con las instrucciones de `plan.md` §8 y 8 a 10 ejemplos **distintos** de los apéndices; el texto del usuario y los resultados de herramientas van en bloques delimitados.
  **Hecho cuando:** pruebas del armado pasan (nada del usuario queda dentro de las instrucciones). *Depende de T-002.*

- [ ] **T-011 · A · `AgentRunner` Strands/Gemini y versión simulada** (RF-004, RF-022, RF-029, D-2, D-5)
  Protocolo, implementación con Strands (herramientas por petición, tiempo máximo, tope de usos) y un `FakeRunner` capaz de **simular llamadas a herramientas** (incluidas maliciosas) para pruebas.
  **Hecho cuando:** una prueba comprueba que el agente solo recibe las 4 herramientas y que el tiempo agotado se traduce bien. *Depende de T-009, T-010.*

- [ ] **T-012 · A · Interpretación, detalle legible y conflictos** (RF-011, RF-019, RF-020, RF-021)
  `agent/interpret.py` y `agent/describe.py`: revalidación, `start_at` con zona, releer la tarea por id real, conflictos calculados por el servidor, textos de las tarjetas, explicación de fechas relativas, pregunta `past`, reintento por formato roto.
  **Hecho cuando:** `test_agent_interpret` pasa (Bogotá y zona con cambio de horario). *Depende de T-011.*

- [ ] **T-013 · A · Traducción de errores del proveedor** (RF-027, RF-029, RF-030)
  `agent/errors.py` con los tipos confirmados en T-002.
  **Hecho cuando:** pruebas de cuota, tiempo, formato y clave inválida pasan. *Depende de T-002, T-011.*

- [ ] **T-014 · A · Ruta `POST /agent/command`** (RF-004, RF-025…RF-028)
  Sesión, validación del texto, ritmo por minuto, tope con devolución, ejecución del agente, resultado tipado, registros sin contenido.
  **Hecho cuando:** `test_agent_api`, `test_agent_quota` y `test_agent_security` pasan (incluido el **repositorio espía** que falla ante cualquier escritura); la prueba de rutas protegidas de 001 incluye la ruta nueva. *Depende de T-006, T-012, T-013.*

## Fase D — Calidad del agente (compuerta)

- [ ] **T-015 · A · Conjuntos de calidad y arnés** (RNF-001, CA-38)
  `tests/eval/cases_a.py` (30 frases) y `cases_b.py` (20 frases con la **agenda sembrada** del Apéndice B en un repositorio en memoria); arnés `-m agent_eval` que ejecuta con el modelo real, compara con lo esperado (tipo de acción, tarea objetivo, valores) y genera una tabla de aciertos y fallos.
  **Hecho cuando:** el arnés corre de punta a punta. *Depende de T-014.*

- [ ] **T-016 · H+A · Ejecutar la compuerta e iterar** (RNF-001, CA-38)
  Correr los conjuntos, analizar fallos, ajustar `prompt.py` y las descripciones de herramientas, y repetir hasta **A ≥ 27/30**, **B ≥ 16/20** y **0 acciones indebidas** en B17 y B20. Anotar cada iteración, el consumo de cuota observado (Q-6) y el resultado final con fecha en `spec.md` §Checklist. El humano revisa los casos dudosos.
  **Hecho cuando:** se alcanzan las tres metas. *Depende de T-015. Consume cuota gratuita: ejecutar con cuidado.*

## Fase E — Frontend

- [ ] **T-017 · A · Estado del asistente y cliente de la API** (RF-004, RF-016, RF-038)
  `AssistantProvider`, `useAssistant`, `agentApi.command`, historial de hasta 4 mensajes, mutación sin reintentos, bloqueo del doble envío, estado por acción, mapeo de errores por `code`.
  **Hecho cuando:** pruebas del estado pasan. *Depende de T-014.*

- [ ] **T-018 · A · Barra de comando y panel del asistente** (RF-001, RF-002, RF-003, RF-041, RF-042, RF-043)
  `CommandBar` en las tres vistas (sustituye el espacio reservado de 002) y `AssistantPanel` conforme a `Asistente de voz confirmar.png` sin voz; «Pensando…», «Revisando tu agenda…», «Despertando el servidor…», aviso de privacidad ampliado, Enter/Esc, foco.
  **Hecho cuando:** pruebas de interfaz pasan y la captura coincide con el diseño (claro y oscuro). *Depende de T-017.*

- [ ] **T-019 · A · Respuesta y pregunta** (RF-031, RF-038)
  `AnswerView` y `QuestionView` (el campo de respuesta reenvía con el historial).
  **Hecho cuando:** CA-4 y CA-10 pasan en pruebas de interfaz. *Depende de T-018.*

- [ ] **T-020 · A · Tarjetas de acción y confirmación** (RF-032, RF-034, RF-036, RF-037)
  `CreateCard`, `UpdateCard`, `DeleteCard`; «Confirmar todas»; confirmar usa `useCreateTask` / `useUpdateTask` / `useDeleteTask` de 002 (una vez por acción, sin doble ejecución); descartar; error por tarjeta; avisos de conflicto; pie «Nada cambia hasta que confirmes».
  **Hecho cuando:** CA-12, CA-14, CA-15, CA-16, CA-18, CA-19, CA-20, CA-21, CA-23 y CA-25 pasan en pruebas de interfaz. *Depende de T-019.*

- [ ] **T-021 · A · Vista previa en el calendario** (RF-033)
  `PreviewBlock`; `previews` en `MonthView` y `TimeGrid`; marca «se eliminará»; `CalendarPage` navega a la fecha de la primera acción.
  **Hecho cuando:** CA-24 pasa. *Depende de T-020.*

- [ ] **T-022 · A · «Editar en el formulario» y aviso de límite** (RF-035, RF-039, RF-040)
  `TaskForm` acepta `state.draft` y `state.notice` (aviso amarillo con el texto, Q-14); «Crear manualmente» desde el panel.
  **Hecho cuando:** CA-22, CA-26 y CA-27 pasan en pruebas de interfaz. *Depende de T-020.*

- [ ] **T-023 · A · Pruebas de interfaz y E2E** (CA-1, CA-14, CA-20, CA-39)
  Pruebas del frontend (todos los estados y tarjetas) y E2E con la ruta del agente **simulada** en el navegador y backend real para guardar (agendar, mover y eliminar de verdad); capturas contra el diseño.
  **Hecho cuando:** frontend y E2E en verde. *Depende de T-022.*

- [ ] **T-024 · A · Accesibilidad** (RF-043, CA-39)
  Región etiquetada, anuncios, foco, tarjetas operables con teclado, contraste de los estados en ambos temas.
  **Hecho cuando:** lista de revisión completada. *Depende de T-023.*

## Fase F — Cierre

- [ ] **T-025 · H · Aplicar la migración en `prod`** (RF-026)
  Solo tras T-016 y T-023; anotar la fecha; cargar `GEMINI_API_KEY` en el servicio de despliegue (nunca en el repositorio).
  **Hecho cuando:** tabla y funciones existen en prod. *Depende de T-016.*

- [ ] **T-026 · H · Validación final de la feature** (todos)
  Recorrer el checklist de `spec.md`; probar con tus propias frases (crear, consultar, mover, eliminar) y con el tope diario; aprobar. Actualizar «Feature activa» en `AGENT.md` a 004.
  **Hecho cuando:** checklist completo y aprobación. *Depende de todas las anteriores.*

## Orden sugerido

`T-001` → (`T-002` ∥ `T-003`) → (`T-004` → `T-005` → `T-006`) ∥ (`T-007` → `T-008` → `T-009`) · `T-010` → `T-011` → `T-012` → `T-013` → `T-014` → `T-015` → `T-016` · `T-017` → `T-018` → `T-019` → `T-020` → (`T-021` ∥ `T-022`) → `T-023` → `T-024` → `T-025` → `T-026`.

## Trazabilidad RF → tareas

| RF | Tareas |
|----|--------|
| RF-001, RF-002, RF-003 | T-018 |
| RF-004 | T-002, T-011, T-014, T-017 |
| RF-005 | T-010 |
| RF-006 | T-002, T-009 |
| RF-007 | T-009, T-011 |
| RF-008 | T-007, T-009 |
| RF-009 | T-009, T-016 |
| RF-010 | T-008 |
| RF-011 | T-012 |
| RF-012…RF-018 | T-010, T-016 |
| RF-019 | T-008, T-012 |
| RF-020, RF-021 | T-012 |
| RF-022 | T-007, T-011, T-014 |
| RF-023 | T-010, T-014 |
| RF-024 | T-014 |
| RF-025 | T-014 |
| RF-026 | T-004, T-005, T-006, T-014, T-025 |
| RF-027 | T-006, T-013, T-014 |
| RF-028 | T-014 |
| RF-029 | T-006, T-011, T-013 |
| RF-030 | T-003, T-013 |
| RF-031, RF-038 | T-017, T-019 |
| RF-032, RF-034, RF-036, RF-037 | T-020 |
| RF-033 | T-021 |
| RF-035, RF-039, RF-040 | T-022 |
| RF-041, RF-042, RF-043 | T-018, T-024 |
| RNF-001 | T-015, T-016 |
| RNF-008 | T-020 |

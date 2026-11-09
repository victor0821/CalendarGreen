# 002 — Calendario y tareas · Tareas

> **Estado:** APROBADO por el humano (2026-11-02) (Fase 4: Tareas). Todas sin marcar.
> Leyenda: **A** = agente, **H** = humano. Prerrequisitos: 000 y 001 cerradas.
> Commits (cuando el humano los pida): `feat(002): T-00x descripción`.

## Estado de implementación (2026-11-02)

**Hechas:** todas excepto T-020 (accesibilidad: hay `aria-label` descriptivos, navegación por flechas en el mes y alternativa por teclado al arrastre —el formulario de edición—, pero **falta la revisión manual de contraste y de lector de pantalla**) y T-023 (tu validación final).
**Decisiones adoptadas (T-001), las propuestas de la spec:** 30 min por defecto en todo; duraciones 15/30/45/60/90/120/180; pasado permitido; rango horario de 24 h con desplazamiento inicial a las 6 a. m.; «+N más» abre la vista día; solapadas en columnas; hora sugerida = próxima hora en punto; ±5 años; sin barra de comando en 002; borrador del formulario no se conserva al vencer la sesión (Q-10 **no** implementada); clic en una tarea abre el formulario con «Borrar» y confirmación; se puede reabrir una tarea; sin tareas «todo el día». **Cambio respecto a la propuesta Q-19:** el tiempo libre usa el día completo (00:00–24:00), como muestra el diseño («antes de las 10:00 a. m.»), no 6 a. m.–10 p. m.
**Desviaciones del plan:** utilidades de fecha propias sin `date-fns` (D-5); rango máximo de consulta de 43 días (no 42) por margen en cambios de horario; la casilla de completar usa un componente propio (`TaskCheckbox`) para responder al instante, un defecto hallado por la prueba E2E en navegador real.

## Fase A — Decisiones y diseño pendiente

- [x] **T-001 · H · Resolver clarificaciones bloqueantes** (Q-1…Q-18)
  Decidir como mínimo: duración por defecto (Q-1), opciones de duración (Q-2), pasado permitido (Q-4), rango visible y «+N más» (Q-5), solapadas (Q-6), editar/borrar (Q-11), barra de comando en 002 (Q-9). Confirmar que los valores de la migración inicial (120/1000/5–1440) son los definitivos **antes** de aplicarla en 000 (T-007/T-009), o crear migración nueva.
  **Hecho cuando:** `spec.md` § Clarificaciones sin preguntas bloqueantes «Abiertas».

- [x] **T-002 · H · Entregar el diseño de la vista día** (RF-006, U-1)
  Entregado: `UX/Calendario Día.png`; indexado en `UX/README.md`.

## Fase B — Backend

- [x] **T-003 · A · Lógica de tiempo y validaciones** (RF-008, RF-012, RF-021, RF-024)
  `core/tasks_time.py`: normalizar a UTC, rango máximo, rango de fechas guardables, solapamiento con el rango (D-4).
  **Hecho cuando:** `test_tasks_time` y `test_tasks_range` (lógica pura) pasan.

- [x] **T-004 · A · Esquemas Pydantic de tareas** (RF-021, RF-019)
  `schemas/tasks.py`: `TaskCreate`, `TaskUpdate`, `TaskOut` (con `completed` derivado); `source` solo en la creación.
  **Hecho cuando:** `test_tasks_validation` pasa.

- [x] **T-005 · A · Repositorio de tareas** (RF-023, RF-008)
  Añadir a `Repository`: `list_tasks_in_range(user_id, from, to)`, `create_task`, `get_task(user_id, id)`, `update_task`, `delete_task`; implementar en memoria y en Supabase; **toda** operación filtra por `user_id`.
  **Hecho cuando:** pruebas del repositorio en memoria pasan; integración contra `dev` (marca `integration`) pasa. *Depende de T-003, T-004.*

- [x] **T-006 · A · `GET /tasks` (por rango)** (RF-008)
  **Hecho cuando:** `test_tasks_range` pasa (dentro, fuera, borde, cruce de medianoche, rango > 42 días → 422). *Depende de T-005.*

- [x] **T-007 · A · `POST /tasks` y `GET /tasks/{id}`** (RF-013, RF-019, RF-020, RF-021, RF-022)
  **Hecho cuando:** `test_tasks_api` (creación) pasa; CA-6 y CA-7 en backend. *Depende de T-005.*

- [x] **T-008 · A · `PATCH /tasks/{id}` y `DELETE /tasks/{id}`** (RF-015, RF-016, RF-017, RF-018)
  Incluye `completed` ↔ `completed_at`, `updated_at`, `source` inmutable, 404 para ajenas.
  **Hecho cuando:** `test_tasks_api` (edición, completar, borrar) pasa. *Depende de T-007.*

- [x] **T-009 · A · Aislamiento y zona horaria de tareas** (RF-023, RF-012, RF-024)
  `test_tasks_isolation` (dos usuarios) y `test_tasks_time` (11:30 p. m. Bogotá); ampliar `test_isolation` de 001.
  **Hecho cuando:** CA-12 y CA-13 pasan. *Depende de T-008.*

## Fase C — Base del frontend

- [x] **T-010 · A · Utilidades de fecha** (RF-004, RF-005, RF-007, RF-012)
  `calendar/dates.ts`: semana desde lunes, cuadrícula del mes (35/42 celdas), rangos, formateo es-CO de 12 h con «a. m./p. m.», conversión por zona IANA, partir tareas que cruzan medianoche.
  **Hecho cuando:** `dates.test` pasa (bisiesto, 5/6 filas, cruce de medianoche, otra zona con DST). *Decidir D-5 (¿`date-fns`?) aquí y anotar ADR.*

- [x] **T-011 · A · Cliente de tareas y TanStack Query** (RNF-002)
  `tasks/api.ts`, `tasks/hooks.ts`: `useTasks(range)`, mutaciones con invalidación y actualización optimista (completar, mover).
  **Hecho cuando:** pruebas de hooks con servidor simulado pasan. *Depende de T-006…T-008.*

- [x] **T-012 · A · `AppShell`, barra lateral y lista «Hoy»** (RF-001, RF-002, RF-025)
  Conforme a `UX/Calendario Mes.png`: marca, «+ Nueva tarea», «Calendario», «HOY · …» con casillas, correo, cerrar sesión, tema. Reemplaza `CalendarPlaceholder` de 001.
  **Hecho cuando:** pruebas pasan y coincide con el diseño en claro y oscuro (revisión del humano). *Depende de T-011.*

## Fase D — Vistas del calendario

- [x] **T-013 · A · Cabecera y navegación** (RF-007)
  `CalendarHeader`: título, anterior/siguiente, «Hoy», conmutador; parámetros `?vista&fecha`.
  **Hecho cuando:** `Navigation.test` pasa (CA-4). *Depende de T-010.*

- [x] **T-014 · A · Vista mes** (RF-004, RF-009, RF-010)
  `MonthView`, `TaskPill`: días vecinos atenuados, hoy resaltado, máx. 2 + «+N más», completada, micrófono, estados vacío/carga/error.
  **Hecho cuando:** `MonthView.test` pasa (CA-1, CA-2, CA-14, CA-16) y coincide con `Calendario Mes.png`. *Depende de T-011, T-013.*

- [x] **T-015 · A · Vista semana** (RF-005, RF-011)
  `WeekView`, `TaskBlock`, `NowLine`, `overlap.ts`: bloques por duración, reparto de solapadas, línea de ahora, segmentos de cruce de medianoche.
  **Hecho cuando:** `WeekView.test` pasa (CA-3, CA-5) y coincide con `Calendario Semana.png`. *Depende de T-011, T-013.*

- [x] **T-016 · A · Formulario «Nueva tarea»** (RF-013, RF-014, RF-021, RF-022)
  `/tareas/nueva` conforme a `UX/Nueva tarea manual límite de Gemini.png` (sin aviso amarillo): validación, valores iniciales, desde celda/franja, Guardar/Cancelar, un solo envío.
  **Hecho cuando:** `TaskForm.test` pasa (CA-6, CA-7) y coincide con el diseño. *Depende de T-011, T-012.*

- [x] **T-017 · A · Editar y borrar** (RF-015, RF-018)
  `/tareas/:id/editar` reutilizando el formulario; botón «Borrar» con confirmación (según decisión Q-11).
  **Hecho cuando:** CA-8 y CA-11 pasan en pruebas de interfaz. *Depende de T-016, T-001.*

- [x] **T-018 · A · Completar y reabrir** (RF-017, RF-002)
  Casilla en «Hoy» y en la tarea; actualización optimista.
  **Hecho cuando:** CA-10 pasa. *Depende de T-012, T-014.*

- [x] **T-019 · A · Arrastrar para mover** (RF-016)
  `useDrag.ts`: mes (conserva hora), semana (día + hora a 15 min), reversión si falla.
  **Hecho cuando:** pruebas de arrastre pasan (CA-9). *Depende de T-014, T-015.*

- [ ] **T-020 · A · Accesibilidad y modo oscuro** (RF-025, RF-026)
  Navegación por teclado (flechas/Enter), `aria-label` descriptivos, foco visible, contraste de estados atenuados en ambos temas, alternativa por teclado al arrastre.
  **Hecho cuando:** CA-17 verificado y lista de revisión aprobada por el humano.

- [x] **T-021 · A · Vista día** (RF-006)
  `DayView`, `DayPanel` («Tareas del día», casillas) y `calendar/freeTime.ts` (cálculo puro del tiempo libre, Q-19) según `UX/Calendario Día.png`.
  **Hecho cuando:** coincide con el diseño; `freeTime.test` y `DayView.test` pasan (CA-18). *Depende de T-015, T-018 y Q-19.*

## Fase E — Validación y cierre

- [x] **T-022 · A · E2E de la compuerta** (CA-15)
  Playwright: registrar → crear → mover → borrar en mes y semana (y día).
  **Hecho cuando:** el flujo pasa en local. *Depende de T-014…T-019.*

- [ ] **T-023 · H · Validación final de la feature** (todos)
  Recorrer el Checklist de `spec.md`; probar con dos cuentas y con una zona horaria con DST; aprobar. Actualizar `AGENT.md` («Feature activa» → 003).
  **Hecho cuando:** checklist completo (con la nota de vista día si sigue pendiente) y aprobación del humano.

## Fase F — Enmienda v2 (2026-11-08): horas, repetición y notificar

> APROBADA por el humano el 2026-11-08 (T-024). El diseño móvil/Android queda fuera: no se toca hasta nueva orden.

- [x] **T-024 · H · Aprobar la enmienda y resolver Q-22…Q-27** (RF-028…RF-034)
  Revisar la spec y el plan (sección «Enmienda v2»); confirmar o ajustar las opciones de «Tarea a repetir» (Q-22), editar/borrar repeticiones (Q-23), rango de «Notificar» (Q-24), cruce de medianoche (Q-25), límites (Q-26) e ícono (Q-27); pedir el diseño de edición/borrado de series (U-17) si se quiere distinto.
  **Hecho cuando:** la spec 002 pasa a «APROBADO» sin preguntas bloqueantes.

- [x] **T-025 · A · Escribir la migración** `supabase/migrations/20261108000000_task_series_and_reminders.sql` (RF-029, RF-031, RF-034)
  Según el plan v2.2: tabla `task_series`, columnas nuevas de `tasks`, restricciones, `UNIQUE (series_id, start_at)`, relleno, RLS, `-- DOWN`. Agregar la fila a `supabase/MIGRATIONS.md`. **No se aplica.**
  **Hecho cuando:** el humano revisó el SQL. *Depende de T-024.*

- [x] **T-026 · H · Aplicar la migración en `dev`** (RF-031)
  En el SQL Editor de `calendargreen-dev`; probar el `-- DOWN` y volver a aplicar; anotar la fecha. (Prod después, en la tarea de despliegue.)
  **Hecho cuando:** tablas y columnas existen con RLS. *Depende de T-025.*

- [x] **T-027 · A · Núcleo de repetición** `backend/app/core/recurrence.py` (RF-029, RF-030)
  Función pura `expand` con zona horaria; pruebas `test_recurrence` (todos los casos del plan v2.6).
  **Hecho cuando:** pasan, incluida una zona con cambio de horario. *Depende de T-024.*

- [x] **T-028 · A · Repositorio de series y avisos** (RF-031, RF-033, RF-034)
  Ampliar `Repository`: crear serie con sus copias en un solo `insert`, listar series a completar, extender, borrar «esta y las siguientes»; versión en memoria y Supabase; columnas de aviso en `Task`.
  **Hecho cuando:** pruebas unitarias e integración (`-m integration`) pasan. *Depende de T-026, T-027.*

- [x] **T-029 · A · API: repetición, aviso y borrado por alcance** (RF-021, RF-029, RF-031…RF-034)
  Esquemas `repeat` y `reminder`; `POST` con serie; `GET` que completa series; `DELETE ?scope`; `TaskOut` con `series_id` y `reminder`.
  **Hecho cuando:** pasan `test_series_api`, `test_series_extension`, `test_series_independence`, `test_series_delete`, `test_reminder` y el aislamiento. *Depende de T-028.*

- [x] **T-030 · A · Frontend: hora de inicio y hora final** (RF-013, RF-014, RF-021, RF-028)
  `TimeSelect`, utilidades de horas, estado `startMinutes`/`endMinutes` en `TaskForm`, conforme a `Nueva tarea manual límite de Gemini.png` (v2).
  **Hecho cuando:** pasan CA-19 y CA-20 y CA-6 (actualizado). *Depende de T-024.*

- [x] **T-031 · A · Frontend: «Tarea a repetir»** (RF-029, RF-030)
  `RepeatField` (lista, botones L M X J V S D, resumen); envía `repeat`.
  **Hecho cuando:** pasa CA-21. *Depende de T-030; el envío real, de T-029.*

- [x] **T-032 · A · Frontend: «Notificar»** (RF-034)
  `NotifyField` (casilla, dos listas, «antes», resumen con singular); envía `reminder`.
  **Hecho cuando:** pasan CA-26 y CA-27. *Depende de T-030.*

- [x] **T-033 · A · Vistas: ícono de repetición y borrado de series** (RF-032, RF-033)
  Ícono en `pill` y `block`; diálogo con «Solo esta» y «Esta y las siguientes»; en edición, `RepeatField` de solo lectura.
  **Hecho cuando:** pasan CA-24 y CA-25. *Depende de T-029, T-031.*

- [x] **T-034 · A · Actualizar pruebas existentes y E2E** (todos los CA afectados)
  Ajustar las pruebas del formulario y del calendario a los campos nuevos; ampliar la prueba E2E (serie L–V, navegar meses, completar una, borrar «esta y las siguientes»); comparar capturas con el diseño (claro y oscuro).
  **Hecho cuando:** backend, frontend y E2E en verde. *Depende de T-033.*

- [ ] **T-035 · A · Accesibilidad del formulario nuevo** (RF-026)
  Listas con `label`, botones L–D con nombre completo y `aria-pressed`, foco visible, contraste en ambos temas.
  **Hecho cuando:** lista de revisión completada. *Depende de T-034.*

- [ ] **T-036 · H · Validación final de la enmienda** (RF-028…RF-034)
  Recorrer el checklist de `spec.md`; aplicar la migración en prod con dump previo si hubiera datos.
  **Hecho cuando:** aprobación del humano. *Depende de T-035.*

## Orden sugerido

`T-001` y `T-002` (humano, en paralelo) · `T-003 → T-004 → T-005 → T-006 → T-007 → T-008 → T-009` · `T-010 → T-011 → T-012` · `T-013 → T-014/T-015 → T-016 → T-017/T-018/T-019 → T-020` · `T-021` · `T-022 → T-023`.

## Trazabilidad RF → tareas

| RF | Tareas |
|----|--------|
| RF-001, RF-002 | T-012, T-018 |
| RF-003 | T-012 (espacio reservado, decisión Q-9) |
| RF-004 | T-010, T-014 |
| RF-005 | T-010, T-015 |
| RF-006 | T-002, T-021 |
| RF-007 | T-010, T-013 |
| RF-008 | T-003, T-005, T-006 |
| RF-009 | T-014 |
| RF-010 | T-014, T-015 |
| RF-011 | T-015 |
| RF-012 | T-003, T-009, T-010 |
| RF-013 | T-007, T-016 |
| RF-014 | T-016 |
| RF-015 | T-008, T-017 |
| RF-016 | T-008, T-019 |
| RF-017 | T-008, T-018 |
| RF-018 | T-008, T-017 |
| RF-019 | T-004, T-007 |
| RF-020 | T-007, T-016, T-032 |
| RF-021 | T-003, T-004, T-007, T-016 |
| RF-022 | T-007, T-016 |
| RF-023 | T-005, T-009 |
| RF-024 | T-003, T-009, T-010 |
| RF-025 | T-012, T-020 |
| RF-026 | T-020 |

### Estado de la enmienda v2 (2026-11-08)

**Hechas:** T-024…T-034 (aprobación, migración aplicada en dev, núcleo, repositorio, API, frontend y pruebas).
**Pendientes y por qué:**
- **T-026, T-028 y T-034 (hechas):** migración aplicada en dev; **18 pruebas de integración y 5 E2E en navegador real pasan** contra la base (serie de 12 meses, renovación sin duplicados, completar/mover una repetición, borrar «esta y las siguientes», aislamiento).
- **T-035:** hay `label`, `aria-pressed` y nombre completo en los botones de los días, pero falta la revisión manual de contraste y de lector de pantalla.
- **T-036 (tú):** validación final y aplicar la migración en prod.
**Hallazgo al verificar contra la base:** cuatro pruebas de integración antiguas insertaban tareas con el aviso activo y sin antelación; la restricción nueva las rechazaba (y una pasaba por la razón equivocada). Se corrigieron; no era un defecto de la aplicación.
**Detalles de implementación:** si la petición omite `reminder`, la API usa 15 minutos antes (como el diseño); `reminder: null` desactiva el aviso. `TaskOut.repeat` solo viene en las respuestas de una tarea individual. El mensaje de «más de 4 semanas» se muestra al elegirlo, no solo al guardar. **Fuera de esta fase, por orden del humano:** todo el diseño móvil/Android.

### Trazabilidad de la enmienda v2

| RF | Tareas |
|----|--------|
| RF-028 | T-030 |
| RF-029 | T-025, T-027, T-029, T-031 |
| RF-030 | T-027, T-031 |
| RF-031 | T-025, T-026, T-028, T-029 |
| RF-032 | T-029, T-033 |
| RF-033 | T-028, T-029, T-033 |
| RF-034 | T-025, T-028, T-029, T-032 |
| RF-013, RF-014, RF-021 | T-029, T-030 |
| Orden sugerido de la fase F | `T-024` → `T-025` → `T-026` · en paralelo `T-027` y `T-030` → `T-028` → `T-029` · `T-031`, `T-032` → `T-033` → `T-034` → `T-035` → `T-036` |

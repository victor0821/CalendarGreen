# 002 — Calendario y tareas · Tareas

> **Estado:** BORRADOR — pendiente de aprobación humana (Fase 4: Tareas). Todas sin marcar.
> Leyenda: **A** = agente, **H** = humano. Prerrequisitos: 000 y 001 cerradas.
> Commits (cuando el humano los pida): `feat(002): T-00x descripción`.

## Fase A — Decisiones y diseño pendiente

- [ ] **T-001 · H · Resolver clarificaciones bloqueantes** (Q-1…Q-18)
  Decidir como mínimo: duración por defecto (Q-1), opciones de duración (Q-2), pasado permitido (Q-4), rango visible y «+N más» (Q-5), solapadas (Q-6), editar/borrar (Q-11), barra de comando en 002 (Q-9). Confirmar que los valores de la migración inicial (120/1000/5–1440) son los definitivos **antes** de aplicarla en 000 (T-007/T-009), o crear migración nueva.
  **Hecho cuando:** `spec.md` § Clarificaciones sin preguntas bloqueantes «Abiertas».

- [ ] **T-002 · H · Entregar el diseño de la vista día** (RF-006, U-1)
  Agregar el archivo a `UX/` y actualizar `UX/README.md`. **No bloquea** el resto; solo T-021 y la parte de día de T-022.
  **Hecho cuando:** existe la imagen y el README la indexa.

## Fase B — Backend

- [ ] **T-003 · A · Lógica de tiempo y validaciones** (RF-008, RF-012, RF-021, RF-024)
  `core/tasks_time.py`: normalizar a UTC, rango máximo, rango de fechas guardables, solapamiento con el rango (D-4).
  **Hecho cuando:** `test_tasks_time` y `test_tasks_range` (lógica pura) pasan.

- [ ] **T-004 · A · Esquemas Pydantic de tareas** (RF-021, RF-019)
  `schemas/tasks.py`: `TaskCreate`, `TaskUpdate`, `TaskOut` (con `completed` derivado); `source` solo en la creación.
  **Hecho cuando:** `test_tasks_validation` pasa.

- [ ] **T-005 · A · Repositorio de tareas** (RF-023, RF-008)
  Añadir a `Repository`: `list_tasks_in_range(user_id, from, to)`, `create_task`, `get_task(user_id, id)`, `update_task`, `delete_task`; implementar en memoria y en Supabase; **toda** operación filtra por `user_id`.
  **Hecho cuando:** pruebas del repositorio en memoria pasan; integración contra `dev` (marca `integration`) pasa. *Depende de T-003, T-004.*

- [ ] **T-006 · A · `GET /tasks` (por rango)** (RF-008)
  **Hecho cuando:** `test_tasks_range` pasa (dentro, fuera, borde, cruce de medianoche, rango > 42 días → 422). *Depende de T-005.*

- [ ] **T-007 · A · `POST /tasks` y `GET /tasks/{id}`** (RF-013, RF-019, RF-020, RF-021, RF-022)
  **Hecho cuando:** `test_tasks_api` (creación) pasa; CA-6 y CA-7 en backend. *Depende de T-005.*

- [ ] **T-008 · A · `PATCH /tasks/{id}` y `DELETE /tasks/{id}`** (RF-015, RF-016, RF-017, RF-018)
  Incluye `completed` ↔ `completed_at`, `updated_at`, `source` inmutable, 404 para ajenas.
  **Hecho cuando:** `test_tasks_api` (edición, completar, borrar) pasa. *Depende de T-007.*

- [ ] **T-009 · A · Aislamiento y zona horaria de tareas** (RF-023, RF-012, RF-024)
  `test_tasks_isolation` (dos usuarios) y `test_tasks_time` (11:30 p. m. Bogotá); ampliar `test_isolation` de 001.
  **Hecho cuando:** CA-12 y CA-13 pasan. *Depende de T-008.*

## Fase C — Base del frontend

- [ ] **T-010 · A · Utilidades de fecha** (RF-004, RF-005, RF-007, RF-012)
  `calendar/dates.ts`: semana desde lunes, cuadrícula del mes (35/42 celdas), rangos, formateo es-CO de 12 h con «a. m./p. m.», conversión por zona IANA, partir tareas que cruzan medianoche.
  **Hecho cuando:** `dates.test` pasa (bisiesto, 5/6 filas, cruce de medianoche, otra zona con DST). *Decidir D-5 (¿`date-fns`?) aquí y anotar ADR.*

- [ ] **T-011 · A · Cliente de tareas y TanStack Query** (RNF-002)
  `tasks/api.ts`, `tasks/hooks.ts`: `useTasks(range)`, mutaciones con invalidación y actualización optimista (completar, mover).
  **Hecho cuando:** pruebas de hooks con servidor simulado pasan. *Depende de T-006…T-008.*

- [ ] **T-012 · A · `AppShell`, barra lateral y lista «Hoy»** (RF-001, RF-002, RF-025)
  Conforme a `UX/Calendario Mes.png`: marca, «+ Nueva tarea», «Calendario», «HOY · …» con casillas, correo, cerrar sesión, tema. Reemplaza `CalendarPlaceholder` de 001.
  **Hecho cuando:** pruebas pasan y coincide con el diseño en claro y oscuro (revisión del humano). *Depende de T-011.*

## Fase D — Vistas del calendario

- [ ] **T-013 · A · Cabecera y navegación** (RF-007)
  `CalendarHeader`: título, anterior/siguiente, «Hoy», conmutador; parámetros `?vista&fecha`.
  **Hecho cuando:** `Navigation.test` pasa (CA-4). *Depende de T-010.*

- [ ] **T-014 · A · Vista mes** (RF-004, RF-009, RF-010)
  `MonthView`, `TaskPill`: días vecinos atenuados, hoy resaltado, máx. 2 + «+N más», completada, micrófono, estados vacío/carga/error.
  **Hecho cuando:** `MonthView.test` pasa (CA-1, CA-2, CA-14, CA-16) y coincide con `Calendario Mes.png`. *Depende de T-011, T-013.*

- [ ] **T-015 · A · Vista semana** (RF-005, RF-011)
  `WeekView`, `TaskBlock`, `NowLine`, `overlap.ts`: bloques por duración, reparto de solapadas, línea de ahora, segmentos de cruce de medianoche.
  **Hecho cuando:** `WeekView.test` pasa (CA-3, CA-5) y coincide con `Calendario Semana.png`. *Depende de T-011, T-013.*

- [ ] **T-016 · A · Formulario «Nueva tarea»** (RF-013, RF-014, RF-021, RF-022)
  `/tareas/nueva` conforme a `UX/Nueva tarea manual límite de Gemini.png` (sin aviso amarillo): validación, valores iniciales, desde celda/franja, Guardar/Cancelar, un solo envío.
  **Hecho cuando:** `TaskForm.test` pasa (CA-6, CA-7) y coincide con el diseño. *Depende de T-011, T-012.*

- [ ] **T-017 · A · Editar y borrar** (RF-015, RF-018)
  `/tareas/:id/editar` reutilizando el formulario; botón «Borrar» con confirmación (según decisión Q-11).
  **Hecho cuando:** CA-8 y CA-11 pasan en pruebas de interfaz. *Depende de T-016, T-001.*

- [ ] **T-018 · A · Completar y reabrir** (RF-017, RF-002)
  Casilla en «Hoy» y en la tarea; actualización optimista.
  **Hecho cuando:** CA-10 pasa. *Depende de T-012, T-014.*

- [ ] **T-019 · A · Arrastrar para mover** (RF-016)
  `useDrag.ts`: mes (conserva hora), semana (día + hora a 15 min), reversión si falla.
  **Hecho cuando:** pruebas de arrastre pasan (CA-9). *Depende de T-014, T-015.*

- [ ] **T-020 · A · Accesibilidad y modo oscuro** (RF-025, RF-026)
  Navegación por teclado (flechas/Enter), `aria-label` descriptivos, foco visible, contraste de estados atenuados en ambos temas, alternativa por teclado al arrastre.
  **Hecho cuando:** CA-17 verificado y lista de revisión aprobada por el humano.

- [ ] **T-021 · A · Vista día** (RF-006)
  `DayView` según el diseño entregado en T-002. **Bloqueada** hasta que exista el diseño.
  **Hecho cuando:** coincide con el diseño; pruebas análogas a semana pasan. *Depende de T-002, T-015.*

## Fase E — Validación y cierre

- [ ] **T-022 · A · E2E de la compuerta** (CA-15)
  Playwright: registrar → crear → mover → borrar en mes y semana (y día si T-021 está hecha).
  **Hecho cuando:** el flujo pasa en local. *Depende de T-014…T-019.*

- [ ] **T-023 · H · Validación final de la feature** (todos)
  Recorrer el Checklist de `spec.md`; probar con dos cuentas y con una zona horaria con DST; aprobar. Actualizar `AGENT.md` («Feature activa» → 003).
  **Hecho cuando:** checklist completo (con la nota de vista día si sigue pendiente) y aprobación del humano.

## Orden sugerido

`T-001` y `T-002` (humano, en paralelo) · `T-003 → T-004 → T-005 → T-006 → T-007 → T-008 → T-009` · `T-010 → T-011 → T-012` · `T-013 → T-014/T-015 → T-016 → T-017/T-018/T-019 → T-020` · `T-021` (cuando haya diseño) · `T-022 → T-023`.

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
| RF-020 | T-007, T-016 |
| RF-021 | T-003, T-004, T-007, T-016 |
| RF-022 | T-007, T-016 |
| RF-023 | T-005, T-009 |
| RF-024 | T-003, T-009, T-010 |
| RF-025 | T-012, T-020 |
| RF-026 | T-020 |

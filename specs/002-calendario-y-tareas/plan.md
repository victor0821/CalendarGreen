# 002 — Calendario y tareas · Plan técnico

> **Estado:** BORRADOR — pendiente de aprobación humana (Fase 3: Planificar). Depende de `spec.md` aprobada y de 000 y 001 terminadas.
> Respeta `specs/constitution.md`. Los valores «propuesta» dependen de las Clarificaciones de `spec.md`.

## 1. Decisiones de arquitectura

| # | Decisión | Motivo | Cubre |
|---|----------|--------|-------|
| D-1 | API REST `/api/v1/tasks` con CRUD y consulta por rango; todo protegido por `get_current_user` (001) | Constitución §3.2 | RF-008, RF-013…RF-018, RF-023 |
| D-2 | Toda consulta/escritura filtra por `user_id` del token; un identificador ajeno responde **404** (no 403) | Evita revelar existencia (IDOR) | RF-023, CA-12 |
| D-3 | Fechas en **UTC** en API y base; el cliente convierte a la zona del usuario con `Intl` y `timeZone` | Constitución §3.3 | RF-012, RF-024 |
| D-4 | Consulta por rango: tareas con `start_at < to` y `start_at + duración > from`. Como la columna es `start_at` (sin `end_at`), se consulta `start_at ∈ [from − 24 h, to)` y se **filtra en el servidor** por fin > `from` (duración máx. 24 h) | Incluye tareas que cruzan el borde | RF-008, CA-5 |
| D-5 | **Sin librerías de calendario.** Utilidades propias de fechas sobre `Intl.DateTimeFormat` y `Date`; evaluar `date-fns` / `date-fns-tz` (MIT, gratuitas) solo si las utilidades propias resultan frágiles (se anota en ADR) | Constitución §3.1; RNF-003 | RF-004…RF-007, RF-012 |
| D-6 | Estado de servidor en el cliente con **TanStack Query** (cache por rango, invalidación tras mutaciones, actualización optimista del arrastre y de completar). Alternativa: hooks propios con `fetch` | Menos código frágil de caché | RNF-002, RF-016, RF-017 |
| D-7 | Arrastrar con **HTML5 Drag and Drop** nativo en escritorio; en táctil, la alternativa es editar (Q-13) | Sin dependencias; Android en 005 | RF-016, RF-026 |
| D-8 | Rutas: `/calendario` (vista por parámetro `?vista=mes|semana|dia&fecha=YYYY-MM-DD`), `/tareas/nueva`, `/tareas/:id/editar` | URLs compartibles/recargables | RF-007, RF-013, RF-015 |
| D-9 | Marco de la app (`AppShell`): barra lateral + área principal, compartido por calendario y formularios | RF-001 | RF-001, RF-002 |
| D-10 | El backend valida con Pydantic; la base refuerza con `CHECK` (migración de 000) | Doble capa | RF-021 |

**Fecha de verificación:** sin servicios nuevos; solo Supabase (ver 000). Sin costo adicional.

## 2. Modelo de datos

La tabla `tasks` **ya existe** por la migración inicial de 000 (`plan.md` de 000 §5). Esta feature **no** añade migración salvo que durante la revisión cambien los valores propuestos (título ≤ 120, notas ≤ 1000, duración 5–1440). Si cambian **antes** de aplicar la migración inicial, se edita ese archivo; si ya se aplicó, se crea una migración nueva (una migración aplicada no se edita).

Campos (resumen): `id`, `user_id`, `title`, `start_at`, `duration_minutes` (30), `notes`, `completed_at`, `source` (`manual|voice|text`), `reminder_enabled` (true), `created_at`, `updated_at`. Índice `(user_id, start_at)`.

`completed` en la API se deriva de `completed_at IS NOT NULL`.

## 3. Estructura de archivos afectada

```
backend/app/
├── api/tasks.py               # GET/POST /tasks, GET/PATCH/DELETE /tasks/{id}
├── schemas/tasks.py           # TaskCreate, TaskUpdate, TaskOut
├── db/base.py                 # añadir: list_tasks_in_range, create_task, get_task, update_task, delete_task
├── db/supabase_repository.py  # implementar (siempre con user_id)
├── db/memory_repository.py    # implementar
└── core/tasks_time.py         # lógica de rangos y validaciones de fecha (pura, testeable)
backend/tests/
├── test_tasks_api.py
├── test_tasks_range.py
├── test_tasks_isolation.py
└── test_tasks_validation.py
app/src/
├── layout/AppShell.tsx, Sidebar.tsx, TodayList.tsx
├── calendar/
│   ├── dates.ts               # utilidades de fecha (semana desde lunes, rangos, formato 12 h es)
│   ├── MonthView.tsx, WeekView.tsx, DayView.tsx, CalendarHeader.tsx
│   ├── TaskPill.tsx, TaskBlock.tsx, NowLine.tsx, layout/overlap.ts
│   └── useDrag.ts
├── tasks/api.ts, hooks.ts     # TanStack Query: useTasks(range), useCreateTask, ...
├── pages/Calendar.tsx, TaskForm.tsx (nueva/editar)
└── tests/
```

## 4. Contratos de API (prefijo `/api/v1`; todos protegidos)

### Objeto tarea (`TaskOut`)
```json
{ "id": "<uuid>", "title": "Llamar a mi hermano",
  "start_at": "2026-11-01T20:00:00Z", "duration_minutes": 30,
  "notes": null, "completed": false, "completed_at": null,
  "source": "manual", "reminder_enabled": true,
  "created_at": "…", "updated_at": "…" }
```
`start_at` siempre en UTC (`Z`). `user_id` nunca se devuelve.

### `GET /tasks?from=<ISO8601>&to=<ISO8601>`
- `from` y `to` obligatorios, con zona horaria; `from < to`; rango máximo **42 días** (cubre la cuadrícula de 6 semanas del mes; propuesta Q-8). Fuera de eso → `422 validation_error`.
- Devuelve las tareas del usuario que se solapan con `[from, to)` (D-4), ordenadas por `start_at`.
- `200 { "items": [ TaskOut, … ] }`.

### `POST /tasks`
```json
{ "title": "Llamar a mi hermano", "start_at": "2026-11-01T15:00:00-05:00",
  "duration_minutes": 30, "notes": null, "reminder_enabled": true, "source": "manual" }
```
- `start_at` con zona (cualquier offset); se normaliza a UTC. `duration_minutes` opcional (30). `source` opcional (`manual`); 003/004 enviarán `voice` o `text`.
- `201 TaskOut`. Errores: `422 validation_error`.

### `GET /tasks/{id}` → `200 TaskOut` | `404 not_found`

### `PATCH /tasks/{id}`
Campos opcionales: `title`, `start_at`, `duration_minutes`, `notes`, `reminder_enabled`, `completed` (boolean: `true` fija `completed_at = now`, `false` lo limpia). **No** se permite cambiar `source`. Actualiza `updated_at`. `200 TaskOut` | `404` | `422`.

### `DELETE /tasks/{id}` → `204` | `404`

### Códigos de error
`validation_error` (422), `not_found` (404), `unauthorized` (401, de 001). Mensajes en español en el formato de 000.

### Reglas
- `title`: `strip()`, 1–120. `notes`: ≤ 1000 (cadena vacía → `null`). `duration_minutes`: 5–1440. `start_at`: obligatoria y con zona; rango de fechas guardables ±5 años de hoy (propuesta Q-8). Sin restricción de pasado (Q-4).
- Idempotencia del doble envío: lo mitiga el cliente (botón deshabilitado); el servidor no deduplica en v1.

## 5. Lógica de fechas (frontend)

- **Semana desde lunes:** `startOfWeek(date) = date − ((date.getDay() + 6) % 7)` calculado **en la zona del usuario** (no en la del navegador, si difieren; la zona de usuario viene de `GET /auth/me`).
- **Cuadrícula del mes:** del lunes de la semana del día 1 al domingo de la semana del último día (35 o 42 celdas); `from`/`to` de la consulta = límites de esa cuadrícula en UTC.
- **Posición en la semana/día:** `top = (minutos desde las 00:00 local) × pxPorMinuto`, `height = duración × pxPorMinuto` (mínimo ~20 px para legibilidad). Tareas que cruzan medianoche se **parten** en un segmento por día.
- **Solapamiento:** algoritmo de agrupación por conflicto → asignar columna dentro del grupo (`layout/overlap.ts`), ancho = 1/N.
- **Línea de hora actual:** posición por minutos, actualizada cada minuto.
- **Formato:** `Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })` produce «3:00 p. m.»; verificar el texto exacto («a. m./p. m.») entre navegadores y normalizar si hace falta (prueba unitaria).
- **Arrastre:** en mes → `nuevoInicio = día destino + hora original`; en semana/día → día destino + hora redondeada a pasos de 15 min (propuesta). Actualización optimista y, si el `PATCH` falla, reversión + aviso.
- **DST:** convertir siempre con la zona IANA (`Intl`/`timeZone`), nunca sumando 24 h fijas a una fecha local.

## 6. Pantallas y comportamiento (referencia `UX/`)

| Pantalla | Archivo de diseño | Notas de implementación |
|----------|------------------|--------------------------|
| Mes | `Calendario Mes.png` | Máx. 2 píldoras por celda + «+N más»; hoy con círculo verde |
| Semana | `Calendario Semana.png` | Eje de horas; bloques por duración; línea de ahora |
| Día | *(sin diseño)* | **Bloqueada**: no se implementa hasta recibir el diseño; se deja la ruta/estado preparados |
| Nueva tarea | `Nueva tarea manual límite de Gemini.png` | Sin el aviso amarillo (003/004). Selector nativo de fecha/hora; `select` de duración |
| Editar tarea | *(sin diseño)* | Reutiliza el formulario con botón «Borrar» (propuesta Q-11) |
| Barra lateral | todas | «HOY · …» con casillas; sesión y tema |

- **Tokens:** solo variables de 000; los estados (completada, hoy, punteado reservado para 003) usan tokens nuevos añadidos a `tokens.css`.
- **Accesibilidad:** la cuadrícula del mes como `role="grid"`; flechas para moverse entre días; Enter abre; las tareas son `button`; `aria-label` descriptivos («Llamar al dentista, viernes 6 de noviembre, 3:00 p. m., creada por voz»).
- **Modo oscuro:** igual con tokens; revisar contraste de los estados atenuados.

## 7. Estrategia de pruebas

Cada prueba cita su `RF-xxx` o `CA-x`.

| Prueba | Cubre |
|--------|-------|
| `test_tasks_api`: CRUD completo con repositorio en memoria, orden por `start_at`, `completed` ↔ `completed_at`, `source` no editable | RF-013, RF-015, RF-017, RF-018, RF-019, CA-6, CA-8, CA-10, CA-11 |
| `test_tasks_range`: tareas dentro, fuera, en el borde y que cruzan medianoche; rango > 42 días → 422 | RF-008, CA-5 |
| `test_tasks_validation`: título vacío/largo, notas largas, duración 4 y 1441, `start_at` sin zona, rango de fechas | RF-021, CA-7 |
| `test_tasks_isolation`: dos usuarios; leer/editar/borrar ajena → 404; listados separados | RF-023, CA-12 |
| `test_tasks_time`: 11:30 p. m. en Bogotá se guarda como día siguiente en UTC y se lista en el día correcto | RF-012, RF-024, CA-13 |
| Frontend `dates.test`: semana desde lunes, mes de 5/6 filas, febrero bisiesto, cruce de medianoche, formato «a. m./p. m.», cambio de horario en otra zona | RF-004, RF-005, RF-012, CA-1 |
| Frontend `MonthView/WeekView.test`: máx. 2 + «+N más», altura por duración, hoy, completada, micrófono, solapadas | RF-004, RF-005, RF-010, RF-011, CA-2, CA-3, CA-14 |
| Frontend `TaskForm.test`: validación, valores iniciales, guardar/cancelar, doble envío | RF-013, RF-014, RF-021, CA-6, CA-7 |
| Frontend arrastre: mover, reversión si falla | RF-016, CA-9 |
| Frontend `Navigation.test`: anterior/siguiente/Hoy/conmutador, conserva fecha | RF-007, CA-4 |
| E2E (Playwright): crear, mover y borrar en mes y semana (y día si hay diseño) | CA-15 (compuerta) |
| Accesibilidad: teclado y revisión manual de contraste en ambos temas | RF-026, CA-17 |

Cobertura mínima 70 % en `core/tasks_time.py`, `api/tasks.py` y `calendar/dates.ts`/`overlap.ts`.

## 8. Dependencias nuevas (gratuitas)

- Frontend: `@tanstack/react-query`. Opcional (solo si se decide): `date-fns`, `date-fns-tz`.
- Backend: ninguna nueva.

## 9. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Errores de fechas/zona horaria (el más probable del proyecto) | Utilidades puras con pruebas extensas; siempre IANA; pruebas con zona con DST |
| Rendimiento con muchas tareas en la cuadrícula | Consulta por rango; caché por rango; memoización de celdas |
| Diseño ausente (día, editar/borrar/arrastrar, móvil, estados) | Clarificaciones; se bloquea RF-006; patrones mínimos con tokens |
| Drag and drop no funciona en táctil | Editar en formulario como alternativa; solución completa en 005 |
| Texto de `Intl` («a. m.») varía entre navegadores | Normalización con prueba unitaria |
| Parte de las duraciones/valores propuestos cambian tras revisión | Se resuelve antes de aplicar la migración inicial (000 T-007/T-009) |

## 10. Trazabilidad RF → componente

| RF | Componente |
|----|-----------|
| RF-001, RF-002, RF-003 | `AppShell`, `Sidebar`, `TodayList` |
| RF-004 | `MonthView`, `TaskPill` |
| RF-005 | `WeekView`, `TaskBlock`, `NowLine` |
| RF-006 | `DayView` (bloqueado) |
| RF-007 | `CalendarHeader`, parámetros de URL |
| RF-008 | `GET /tasks`, `core/tasks_time.py`, `useTasks` |
| RF-009 | estados de `Calendar.tsx` |
| RF-010, RF-011 | `TaskPill`, `TaskBlock`, `overlap.ts` |
| RF-012, RF-024 | `dates.ts`, `core/tasks_time.py` |
| RF-013, RF-014, RF-015, RF-021, RF-022 | `TaskForm.tsx`, `schemas/tasks.py`, `POST/PATCH /tasks` |
| RF-016 | `useDrag.ts`, `PATCH /tasks/{id}` |
| RF-017 | `TodayList`, `PATCH completed` |
| RF-018 | `DELETE /tasks/{id}` y diálogo de confirmación |
| RF-019, RF-020 | campos `source` y `reminder_enabled` |
| RF-023 | `api/tasks.py` (+ repositorio con `user_id`) |
| RF-025, RF-026 | tokens, atributos ARIA, navegación por teclado |

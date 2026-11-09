# 002 — Calendario y tareas · Plan técnico

> **Estado:** APROBADO por el humano (2026-11-02) (Fase 3: Planificar). Depende de `spec.md` aprobada y de 000 y 001 terminadas.
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

> **Enmienda 2026-11-08 (v2):** el modelo crece con **series de repetición** y **antelación del aviso**. Ver «Enmienda v2» al final de este documento; implica una **migración nueva** (`20261108000000_task_series_and_reminders.sql`) porque la inicial ya se aplicó y no se edita.

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
- `from` y `to` obligatorios, con zona horaria; `from < to`; rango máximo **43 días** (42 de la cuadrícula más 1 de margen por cambios de horario) (cubre la cuadrícula de 6 semanas del mes; propuesta Q-8). Fuera de eso → `422 validation_error`.
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
| Día | `Calendario Día.png` | Columna del día + panel «Tareas del día» (`DayPanel`) con casillas y nota de tiempo libre (`freeTime.ts`, función pura) |
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
| RF-006, RF-027 | `DayView`, `DayPanel`, `calendar/freeTime.ts` |
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

---

# Enmienda v2 (2026-11-08) — horas, repetición y notificar

> APROBADA por el humano (2026-11-08). Cubre RF-028…RF-034 y los cambios a RF-013, RF-014, RF-016, RF-018, RF-020 y RF-021 de la spec. Decisiones ya tomadas por el humano: **copias reales con renovación automática** y **listas cada 30 minutos**.

## v2.1 Decisiones

| # | Decisión | Motivo | Cubre |
|---|----------|--------|-------|
| D-11 | La repetición crea **tareas reales** (filas en `tasks`) enlazadas por `series_id`; una tabla `task_series` guarda la **plantilla** y hasta dónde hay copias | Cada repetición se completa, mueve y borra sola sin lógica de excepciones | RF-031, RF-032 |
| D-12 | **Horizonte de 12 meses** desde la fecha de inicio; **renovación perezosa**: `GET /tasks` completa las series cuyo `generated_until` no llega al fin del rango pedido (12 meses más allá, tope ±5 años) | No hace falta un proceso programado (Render gratuito duerme) | RF-031 |
| D-13 | Inserciones **idempotentes**: restricción única `(series_id, start_at)` e inserción con «ignorar duplicados» | Dos pestañas pidiendo a la vez no duplican | RF-031, CA-23 |
| D-14 | Las horas locales se expanden con la **zona IANA de la serie** (`zoneinfo`), conservando la hora local ante cambios de horario | Constitución §3.3 | RF-030 |
| D-15 | La **duración** sigue siendo `duration_minutes` en la API y la base: el cliente envía `hora final − hora de inicio`; **no** se agrega columna de hora final | Cambia la interfaz, no el modelo; compatible con tareas de voz | RF-028 |
| D-16 | La antelación del aviso se guarda como **número + unidad** (`reminder_amount`, `reminder_unit`) y se conserva lo que el usuario eligió («60 minutos» no se vuelve «1 hora») | Fidelidad con la edición | RF-034 |
| D-17 | Editar una repetición cambia **solo esa**; la regla de la serie es de solo lectura | Evita reescrituras masivas sin diseño (U-17) | RF-033 |

## v2.2 Modelo de datos — migración `20261108000000_task_series_and_reminders.sql`

> La escribe el agente; **la aplica el humano** (dev primero, luego prod) y la anota en `supabase/MIGRATIONS.md`. Idempotente, con bloque `-- DOWN`, RLS sin políticas en la tabla nueva.

**`public.task_series`** (plantilla de la serie)

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → `users(id)` `ON DELETE CASCADE` |
| `repeat_kind` | `text` | NOT NULL, `CHECK IN ('weekly','weekdays','daily','custom')` (solo informativo: define el resumen) |
| `repeat_days` | `smallint[]` | NOT NULL, días ISO (1 = lunes … 7 = domingo), 1 a 7 elementos distintos |
| `starts_on` | `date` | NOT NULL (fecha local de inicio) |
| `start_minute` | `smallint` | NOT NULL, 0–1439 (hora local de inicio) |
| `duration_minutes` | `integer` | NOT NULL, 5–1440 |
| `timezone` | `text` | NOT NULL (zona del usuario al crearla) |
| `generated_until` | `timestamptz` | NOT NULL (hasta dónde hay copias) |
| `ends_before` | `timestamptz` | NULL (si no es nulo, no se crean copias desde ahí: se usa en «esta y las siguientes») |
| `title`, `notes`, `source`, `reminder_amount`, `reminder_unit` | como en `tasks` | plantilla que se copia a cada repetición |
| `created_at`, `updated_at` | `timestamptz` | NOT NULL, `DEFAULT now()` |

**`public.tasks`** (columnas nuevas)

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `series_id` | `uuid` | NULL, FK → `task_series(id)` `ON DELETE CASCADE` |
| `reminder_amount` | `smallint` | NULL, `CHECK BETWEEN 1 AND 60` |
| `reminder_unit` | `text` | NULL, `CHECK IN ('minutes','hours','days','weeks')` |

- `CHECK ((reminder_amount IS NULL) = (reminder_unit IS NULL))`; y `CHECK (reminder_enabled = false OR reminder_amount IS NOT NULL)` (si se avisa, debe haber antelación).
- `UNIQUE (series_id, start_at)` (D-13; los `NULL` de `series_id` no chocan entre sí).
- **Relleno** de lo existente: `UPDATE tasks SET reminder_amount = 15, reminder_unit = 'minutes' WHERE reminder_enabled AND reminder_amount IS NULL` (hoy no hay tareas en dev ni en prod, pero la migración debe ser segura).
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en `task_series`, sin políticas. Índice `task_series (user_id)`.
- Se conserva `reminder_enabled`; pasa a significar «Notificar».
- `-- DOWN`: quitar columnas e índices nuevos y `DROP TABLE task_series` (destruye series; solo en pruebas).

## v2.3 Contratos de API (cambios)

- **Objeto tarea (`TaskOut`)**: se agregan `series_id: string | null` y `reminder: { amount, unit } | null`; `reminder_enabled` se mantiene (derivado: `reminder != null`).
- **`POST /tasks`**: el cuerpo agrega `reminder: { amount: 1–60, unit: "minutes"|"hours"|"days"|"weeks" } | null` (null = sin aviso; reemplaza a `reminder_enabled`) y `repeat: { kind: "weekly"|"weekdays"|"daily"|"custom", days?: number[] } | null`. Con `repeat` se crea la serie y sus copias (máx. 400 por lote, Q-26) y se responde `201` con la **primera repetición**; sin `repeat`, igual que hoy. `kind` determina `days` salvo `custom` (que lo exige, 1–7 días ISO sin repetir); `weekly` usa el día de la semana de `start_at` en la zona del usuario.
- **`GET /tasks?from&to`**: antes de consultar, **completa las series** del usuario cuyo `generated_until` < `to` (D-12) y devuelve las tareas como hoy. Es una lectura que puede escribir; es idempotente (D-13).
- **`PATCH /tasks/{id}`**: sin cambios de forma; acepta `reminder`; **no** acepta `repeat` ni `series_id`.
- **`DELETE /tasks/{id}?scope=this|following`** (por defecto `this`): `following` borra la tarea y las de su serie con `start_at` posterior; fija `task_series.ends_before` (para no regenerarlas); si no queda ninguna, elimina la serie. Sin `series_id`, `following` equivale a `this`.
- Errores nuevos: `422 validation_error` para `repeat` o `reminder` inválidos (días vacíos o repetidos, antelación > 4 semanas, `custom` sin días).

## v2.4 Núcleo de repetición (`backend/app/core/recurrence.py`, función pura)

`expand(kind_days, starts_on, start_minute, duration, timezone, from_date, until_utc, ends_before=None) -> list[datetime UTC]`: recorre los días locales desde `max(starts_on, from_date)`, conserva los que caen en `kind_days` y convierte «día local + minuto local» a UTC con `zoneinfo` (D-14). Se usa para el lote inicial y para la renovación. Cota de seguridad: no devuelve más de 400 por llamada.

## v2.5 Frontend

- **Utilidades** (`calendar/dates.ts` o `tasks/timeOptions.ts`): `timeOptions(step=30)`; `endOptions(startMinutes, extra?)`; textos `describeRepeat(...)` y `describeReminder(...)` (singular/plural; un solo punto final).
- **Componentes nuevos:** `TimeSelect`, `RepeatField` (lista + botones L M X J V S D como `role="group"` de `aria-pressed`, cada uno con el nombre completo del día), `NotifyField` (casilla + dos listas + resumen).
- **Formulario** (`pages/TaskForm.tsx`): el estado pasa de `time` + `duration` a `startMinutes` + `endMinutes`; se agregan `repeat` y `reminder`. En edición, `RepeatField` es de solo lectura (D-17).
- **Vistas:** ícono de repetición en `pill` y `block` cuando hay `series_id`; el diálogo de borrado ofrece «Solo esta» / «Esta y las siguientes» (RF-033).
- **Tokens:** estados de los botones L–D (encendido/apagado) en `tokens.css` para claro y oscuro.
- **Login móvil:** ver el plan de 001 (enmienda 2026-11-08).

## v2.6 Pruebas (cada una cita su `RF-xxx` / `CA-x`)

| Prueba | Cubre |
|--------|-------|
| `test_recurrence`: «cada semana», L–V, todos los días, personalizado; inicio en un día no elegido; cambio de horario (zona con DST); `ends_before`; tope de 400 | RF-029, RF-030, CA-22 |
| `test_series_api`: crear con `repeat`; 12 meses de copias; misma hora local; primera repetición correcta; `repeat` inválido → 422 | RF-029…RF-031, CA-22 |
| `test_series_extension`: `GET` de un periodo lejano completa la serie; repetir el `GET` no duplica; dos llamadas concurrentes simuladas | RF-031, CA-23 |
| `test_series_independence`: completar, mover y editar una repetición no toca las demás | RF-032, CA-24 |
| `test_series_delete`: `this` y `following`; la serie vacía se elimina; `ends_before` impide regenerar | RF-033, CA-25 |
| `test_reminder`: validaciones (1–60, unidades, tope 4 semanas, par número+unidad); `reminder: null` | RF-034, CA-26, CA-27 |
| Aislamiento: series y tareas de otro usuario → 404 | RF-023 |
| Integración (dev): inserción masiva, restricción única e idempotencia, cascadas, RLS | RF-031 |
| Frontend: listas de horas (48 opciones; final posterior; se conserva la duración; hora fuera de cuadrícula incluida) | RF-028, CA-19, CA-20 |
| Frontend: `RepeatField` (opciones, botones, resumen, «Elige al menos un día») | RF-029, CA-21 |
| Frontend: `NotifyField` (mostrar/ocultar, resúmenes con singular, tope) | RF-034, CA-26, CA-27 |
| Frontend: ícono de repetición y diálogo de borrado | RF-032, RF-033, CA-24, CA-25 |
| E2E (Playwright): crear serie L–V, navegar meses, completar una, borrar «esta y las siguientes» | CA-22…CA-25 |

## v2.7 Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| «Todos los días» crea ~366 filas por serie; muchas series llenan el límite de 500 MB gratuito | Tope por lote y por usuario (Q-26); inserción por lotes; vigilar el tamaño |
| Una lectura (`GET`) que escribe: puede tardar o fallar a medias | Idempotente (D-13); si falla la renovación, se devuelve lo que ya existe y se reintenta en la siguiente lectura |
| Dos pestañas renuevan a la vez | Restricción única + «ignorar duplicados» |
| Cambio de horario (DST) en otras zonas | `zoneinfo` con prueba de zona con DST (D-14) |
| Cambiar la regla de una serie sin diseño | v1: no se edita la regla; se borra «esta y las siguientes» y se crea otra (D-17) |
| Cuota de 500 MB y de la API de Supabase al crear cientos de filas | Un solo `insert` por lote (no uno por fila) |

## v2.8 Trazabilidad RF → componente

| RF | Componente |
|----|-----------|
| RF-028 | `TimeSelect`, utilidades de horas, `TaskForm.tsx` |
| RF-029, RF-030 | `RepeatField`, `describeRepeat`, `core/recurrence.py`, `POST /tasks` |
| RF-031 | `task_series`, `ensure_series_generated`, `GET /tasks`, restricción única |
| RF-032 | `series_id`, íconos en `MonthView`/`TimeGrid` |
| RF-033 | `DELETE ?scope`, diálogo de borrado, `RepeatField` solo lectura |
| RF-034 | `NotifyField`, columnas `reminder_amount`/`reminder_unit` |
| RF-013, RF-014, RF-021 | `TaskForm.tsx`, `schemas/tasks.py` |

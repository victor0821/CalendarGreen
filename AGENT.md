# AGENT.md — CalendarGreen (Calendario con agente de voz)

> Nombre de trabajo: **CalendarGreen** (aplicación web y app Android). Cámbialo cuando tengas el definitivo.
> Este archivo es la fuente de verdad para cualquier agente de IA (Claude Code, etc.) que trabaje en este repositorio. Léelo completo antes de actuar.

---

## 1. Resumen del proyecto

Calendario propio (web, PWA y app Android) en el que el usuario **dicta por voz o escribe una tarea** («recuérdame llamar al dentista el viernes a las 3 de la tarde») y un **agente de IA** la interpreta y propone agendarla en la fecha y hora indicadas. El usuario revisa la propuesta y confirma. No depende de Google Calendar ni de su API.

### Objetivos
1. Permitir que un usuario se registre con correo y contraseña, inicie sesión y entre a su zona de calendario privada.
2. Mostrar y gestionar sus tareas en un calendario propio (vistas mes, semana y día).
3. Crear tareas por voz o texto mediante un agente (Strands Agents + Gemini), siempre con confirmación previa del usuario.
4. Avisar al usuario con recordatorios locales en Android.
5. Mantener **todos los servicios y APIs gratuitos, sin tarjeta de crédito**.

### Fuera de alcance (v1)
- Integración con Google Calendar, Outlook u otros calendarios externos.
- Calendarios compartidos o colaborativos entre usuarios.
- Verificación de correo y recuperación de contraseña (requieren un servicio de correo; si se añaden, deben ser gratuitos y pasar por spec).
- App iOS y publicación en Google Play (la cuota de registro de desarrollador rompe la regla «todo gratis»; el APK se distribuye por archivo directo o GitHub Releases).
- Inicio de sesión con Google u otros proveedores.
- Panel de administración.

> ⚠️ Los puntos marcados con **[POR CONFIRMAR]** son supuestos. Valídalos antes de especificar.

---

## 2. Metodología: Spec-Driven Development (SDD)

**Regla de oro: ningún código se escribe sin una especificación aprobada que lo respalde.** La especificación manda; el código es su consecuencia.

### Flujo obligatorio por funcionalidad

| Fase | Artefacto | Ubicación | Quién aprueba |
|------|-----------|-----------|---------------|
| 0. Constitución | Principios y restricciones del proyecto | `specs/constitution.md` | Humano |
| 1. Especificar | Qué y por qué (sin tecnología) | `specs/NNN-nombre/spec.md` | Humano |
| 2. Clarificar | Preguntas abiertas resueltas | `specs/NNN-nombre/spec.md` (sección Clarificaciones) | Humano |
| 3. Planificar | Cómo (arquitectura, modelo de datos, contratos de API) | `specs/NNN-nombre/plan.md` | Humano |
| 4. Tareas | Lista ordenada, pequeña y verificable | `specs/NNN-nombre/tasks.md` | Humano |
| 5. Implementar | Código + pruebas | `backend/`, `app/` | Revisión de PR |
| 6. Validar | Criterios de aceptación cumplidos | Checklist en `spec.md` | Humano |

### Reglas para el agente
- **Nunca saltes fases.** Si te piden codificar algo sin `spec.md` aprobada, detente y propón redactarla.
- **No inventes requisitos.** Ante ambigüedad, anótala en `Clarificaciones` y pregunta.
- **spec.md describe comportamiento, no tecnología.** La tecnología va en `plan.md`.
- **Toda spec con interfaz referencia sus pantallas de `UX/`** (ver sección 3). Sin pantalla de referencia, se pide el diseño antes de implementar.
- **Cada tarea** referencia el requisito que cumple (`RF-xxx`) y es completable en una sesión corta.
- **Si el código y la spec divergen**, se actualiza primero la spec y luego el código (nunca al revés en silencio).
- **Trazabilidad:** cada commit/PR referencia la feature y las tareas (`feat(003): T-004 ...`).
- Marca las tareas completadas en `tasks.md` al terminar.

### Estructura de una spec (`spec.md`)
```
# NNN — Nombre de la funcionalidad
## Contexto y problema
## Historias de usuario (Como <rol>, quiero <acción>, para <beneficio>)
## Requisitos funcionales (RF-001...)
## Requisitos no funcionales (RNF-001...)
## Pantallas de UX relacionadas (archivos en UX/)
## Criterios de aceptación (Dado / Cuando / Entonces)
## Casos límite y errores
## Fuera de alcance
## Clarificaciones (preguntas abiertas y decisiones)
## Checklist de validación
```

---

## 3. Diseño UX (carpeta `UX/`)

La carpeta **`UX/`** en la raíz del repositorio contiene los diseños de las pantallas. **Es la fuente de verdad visual y de flujo**: antes de implementar o modificar cualquier pantalla, ábrela y léela.

### Contenido de `UX/`
- `UX/README.md`: índice de pantallas, decisiones de diseño y estado de cada una.
- Un archivo por pantalla (imagen o PDF exportado del diseño), con el nombre indicado abajo.

| Archivo | Pantalla | Ruta | Estado |
|---------|----------|------|--------|
| `01-login` | Iniciar sesión | `/login` | Diseñada |
| `02-registro` | Crear cuenta | `/registro` | Diseñada |
| `03-calendario-mes` | Calendario, vista mes | `/calendario` | Diseñada |
| `04-calendario-semana` | Calendario, vista semana | `/calendario` | Diseñada |
| `05-asistente-voz` | Asistente de voz: transcripción editable y tarjeta de propuesta | `/calendario` (panel lateral) | Diseñada |
| `06-tarea-manual` | Nueva tarea manual, con aviso de límite de Gemini agotado. **v2 (2026-11-08):** hora de inicio y final, tarea a repetir y notificar | `/tareas/nueva` | Diseñada |
| `07-calendario-dia` | Calendario, vista día, con panel «Tareas del día» | `/calendario` | Diseñada |
| `08-android-login` | Iniciar sesión, versión móvil / Android (`UX/UX-Movil/`) | `/login` | Diseñada |
| — | Resto de pantallas móviles / Android | — | **Pendiente de diseñar** |

> Los diseños actuales están pensados para escritorio (web). En pantallas angostas, la barra lateral pasa arriba y las grillas se desplazan; el diseño móvil específico aún no existe.

### Decisiones de diseño vigentes
- **Marca:** tema verde. Verde principal `#1B7F4C` (hover `#146B3F`), verde profundo `#0E3B26`, fondo claro `#F4F7F2`, tinte `#E1F1E7`.
- **Modo oscuro:** obligatorio en todas las pantallas. Fondo `#0D1712`, superficies `#15231B`, texto `#E6F2EA`, enlaces `#7FD3A1`. Se implementa con variables CSS (tokens), no con colores fijos en los componentes. Hay un botón para alternar modos.
- **Tipografía:** Bricolage Grotesque (títulos) y DM Sans (texto).
- **Idioma de la interfaz:** español; horas en formato 12 h con «a. m.» y «p. m.».
- **Calendario:** el día actual se resalta; las tareas completadas se muestran tachadas y atenuadas; las creadas por voz llevan un ícono de micrófono.
- **Asistente de voz:** transcripción editable → tarjeta «Propuesta» (título editable, fecha, hora, explicación de cómo se entendió una fecha relativa) → botones «Confirmar y guardar», «Editar en el formulario» y «Cancelar». **Nada se guarda hasta confirmar**; en el calendario la propuesta se ve como un bloque punteado.
- **Límite de Gemini agotado:** aviso amarillo en el formulario manual que conserva lo que dijo el usuario.
- **Accesibilidad:** controles reales (`button`, `a`, `input` con `label`), áreas táctiles ≥ 44 px, contraste de texto ≥ 4.5:1, `aria-label` en botones solo con ícono.

### Reglas para el agente sobre `UX/`
1. Lee `UX/README.md` y las pantallas de la feature antes de escribir `plan.md` o código.
2. **No inventes pantallas ni cambies el diseño por tu cuenta.** Si falta una pantalla (vista día, móvil) o el diseño choca con una spec, anótalo en `Clarificaciones` y pregunta.
3. Si cambia el diseño, el humano actualiza `UX/` y la spec correspondiente antes de que cambie el código.
4. Los diseños son datos de ejemplo: correos, tareas y fechas del mockup no son requisitos.

> **[POR CONFIRMAR]** El mockup del asistente de voz muestra una duración de «1 hora» en la propuesta, pero la duración por defecto del modelo de datos es 30 minutos. Decidir cuál rige.

---

## 4. Roles de usuario

| Rol | Descripción | Capacidades clave |
|-----|-------------|-------------------|
| **Visitante** | No autenticado | Solo ver y usar registro e inicio de sesión. No ve ninguna tarea |
| **Usuario** | Cuenta registrada con sesión válida | Ver y gestionar **sus** tareas, usar el agente por voz o texto, recibir recordatorios |

No hay administradores en v1. Un usuario nunca ve ni modifica tareas de otro.

---

## 5. Módulos y alcance funcional (MVP)

Cada módulo se convierte en una o más features con su carpeta en `specs/`.

1. **Autenticación y cuentas** — registro con correo y contraseña (al registrarse se inicia sesión), login, cierre de sesión, validación de sesión al abrir la app, zona de calendario protegida.
2. **Calendario y tareas** — vistas mes, semana y día; crear, editar, mover (arrastrar), completar y borrar tareas; formulario manual.
3. **Agente con herramientas (texto)** — endpoint que recibe un comando en español; el agente **agenda, consulta, modifica y elimina** tareas mediante herramientas y devuelve una respuesta, una pregunta o **acciones propuestas** que el usuario **confirma** con una tarjeta. Las herramientas de escritura no ejecutan nada por sí mismas.
4. **Voz en la web** — botón de micrófono, transcripción editable, tarjeta de confirmación.
5. **App Android y recordatorios** — empaquetado con Capacitor, voz nativa, notificaciones locales, copia local de tareas para uso sin conexión.
6. **Consultas de agenda** — *(incorporadas a la feature 003 el 2026-11)* «¿qué tengo el lunes?», por texto o por voz.
7. **Tareas recurrentes** — *(incorporadas a la feature 002 el 2026-11-08)* cada semana, de lunes a viernes, todos los días o días personalizados; se guardan como tareas reales con renovación automática.

### Flujo principal (referencia)
```
Voz/texto → transcripción editable → POST /agent/command → propuesta o pregunta
         → usuario confirma → POST /tasks → calendario + recordatorio local (Android)
```
El agente **no escribe directamente** en la base de datos: sus herramientas de escritura solo **preparan** acciones; el cambio lo ejecuta la API normal cuando el usuario confirma.

---

## 6. Reglas de dominio

- **Agente que prepara, usuario que confirma.** El agente decide qué hacer con lo que dice el usuario (agendar, consultar, modificar, eliminar), pero **ningún cambio se ejecuta sin una tarjeta de confirmación** con el detalle exacto (título, fecha y hora, o la tarea afectada). Aplica a toda acción de voz o texto.
- **El agente no inventa.** Si falta la fecha o la hora, hace **una** pregunta corta; no asume valores.
- **Fechas relativas** («mañana», «el viernes», «en dos horas»): el prompt del agente recibe la fecha actual, el día de la semana y la zona horaria del usuario, porque el modelo no conoce la fecha. La tarjeta muestra el día de la semana y cómo se entendió la fecha.
- **Validación en servidor** de lo que devuelve el agente: ISO 8601 con zona horaria y no anterior a hoy; si falla, se pide aclaración.
- **Zona horaria:** almacenar en UTC (`timestamptz`), mostrar en la zona del usuario (por defecto `America/Bogota`).
- **Duración por defecto:** 30 minutos **[POR CONFIRMAR: ver sección 3]**.
- **Cuota gratuita de Gemini:** al agotarse, el backend responde 429 con un mensaje claro y la interfaz ofrece el formulario manual sin perder la transcripción. Tope propio de **20 comandos por usuario y día** para proteger la cuota compartida.
- **Aislamiento:** toda consulta filtra por el `user_id` del JWT.
- **Idioma:** español (textos de interfaz y prompts del agente).
- **Recordatorios («Notificar»):** el usuario elige cuánto antes (número y minutos, horas, días o semanas; hasta 4 semanas). Notificación local programada al guardar; se reprograma al editar y se cancela al borrar o completar; funciona sin conexión. En una serie, cada repetición tiene su aviso.
- **Origen de la tarea:** `manual`, `voice` o `text`.

### Contrato del agente (referencia; el detalle va en `plan.md` de la feature 003)
```json
// POST /api/v1/agent/command — petición (la zona horaria es la del perfil del usuario)
{ "text": "mueve la reunión con Pedro para las 11 de la mañana", "history": [] }
// respuesta: "answer" (información), "question" (aclaración) o "actions" (1 a 3 acciones por confirmar)
{ "kind": "answer",   "message": "El lunes tienes 2 tareas: …", "usage": { "used": 3, "limit": 20 } }
{ "kind": "question", "message": "¿Cuál: la del lunes o la del viernes?", "missing": "which_task", "usage": { … } }
{ "kind": "actions",  "message": "Esto es lo que haré:", "warnings": [],
  "actions": [ { "id": "a1", "type": "create | update | delete", "summary": "Agendar «Llamar al dentista» · viernes 6 de noviembre · 3:00 p. m.", … } ],
  "usage": { "used": 3, "limit": 20 } }
// El agente NO ejecuta nada: al pulsar «Confirmar», el navegador usa la API normal (POST/PATCH/DELETE /tasks).
```

---

## 7. Stack tecnológico propuesto

> **Regla: todo debe ser gratuito y sin tarjeta de crédito.** Antes de añadir una dependencia, API o servicio, verifica su plan gratuito; si hay duda, pregunta. La decisión final se documenta en `specs/constitution.md` y en cada `plan.md`.

| Capa | Propuesta |
|------|-----------|
| Frontend | React + Vite + TypeScript (strict), PWA, calendario propio (sin librerías de calendario) |
| Android | Capacitor (APK de depuración / GitHub Releases) |
| Voz | Web Speech API (web) y `@capacitor-community/speech-recognition` (Android) |
| Recordatorios | `@capacitor/local-notifications` |
| Backend | FastAPI + Uvicorn, Python 3.14 (fijado en `.python-version` y `pyproject.toml`) |
| Gestor de Python | **uv** (`pyproject.toml` + `uv.lock` en la **raíz** del proyecto) |
| Agente | Strands Agents con `GeminiModel` (`strands-agents[gemini]`) |
| LLM | Gemini API, plan gratuito (Google AI Studio). Modelo en `GEMINI_MODEL`, nunca fijo en el código |
| Base de datos | Supabase PostgreSQL. El esquema se crea y se migra **a mano desde el panel web de Supabase (SQL Editor)** con migraciones SQL versionadas en el repo; la app accede a los datos **solo desde el backend por la API de Supabase** (`supabase-py`) |
| Autenticación | Propia: correo y contraseña, hash Argon2/bcrypt, JWT emitido por FastAPI. **No** se usa Supabase Auth en v1 |
| Pruebas | pytest + httpx (backend), Vitest (frontend), Playwright (E2E) |
| Lint / formato | ruff (Python), ESLint + Prettier (TypeScript) |
| CI/CD | GitHub Actions |
| Despliegue | Backend en Render (plan gratuito); frontend en Cloudflare Pages o GitHub Pages **[POR CONFIRMAR]** |

### Límites de los planes gratuitos (revisar antes de depender de ellos)
- **Gemini:** los límites por modelo no están publicados en la documentación; se ven en Google AI Studio y no están garantizados.
- **Supabase** (verificado el 2026-10-31): 500 MB de base de datos, 5 GB de transferencia, máximo **2 proyectos activos**, sin copias de seguridad automáticas y **pausa tras 1 semana sin actividad** (se reactiva a mano desde el panel).
- **Render:** el servicio gratuito duerme tras 15 minutos sin tráfico (el primer comando tarda 30–60 s) y no tiene disco persistente: no guardes datos en archivos locales ni uses SQLite.
- **Render con uv:** confirmar en la Fase 0 si instala con uv directamente o si hace falta un Dockerfile **[POR CONFIRMAR]**.

---

## 8. Estructura del repositorio

```
.
├── AGENT.md
├── UX/                       # diseños de pantallas (fuente de verdad visual)
│   ├── README.md
│   └── 01-login, 02-registro, 03-calendario-mes, ...
├── specs/
│   ├── constitution.md
│   ├── 000-cimientos/
│   ├── 001-autenticacion/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── 002-calendario-y-tareas/
│   └── ...
├── pyproject.toml            # dependencias de Python (uv), en la raíz
├── uv.lock
├── .python-version           # 3.14
├── .env                      # secretos locales (nunca versionado); .env.example sin valores
├── backend/
│   ├── app/
│   │   ├── api/              # rutas (prefijo /api/v1)
│   │   ├── agent/            # agente Strands, prompt y herramientas
│   │   ├── core/             # configuración, seguridad, JWT
│   │   └── db/               # repositorios (acceso a datos)
│   └── tests/
├── supabase/
│   ├── migrations/           # SQL versionado (se aplica a mano en el SQL Editor): tablas, índices y RLS
│   └── MIGRATIONS.md         # registro de qué migración se aplicó en dev y en prod
├── app/                      # React + Vite + Capacitor (web, PWA y android/)
│   └── tests/
├── docs/
│   └── adr/                  # Architecture Decision Records
└── .github/workflows/
```

**Un único repositorio (monorepo)** contiene backend, frontend, specs, UX y migraciones. **El humano creará el repositorio remoto (GitHub) para poder desplegar** y hará el primer commit y push; hasta entonces, pruebas y lint se verifican en local. Antes del primer commit se comprueba que no haya secretos en el árbol (`.env` ya está en `.gitignore`).

Todo acceso a datos pasa por una **capa de repositorio** (`backend/app/db/`) con interfaz propia. Las rutas y el agente no importan `supabase-py` directamente; así las pruebas unitarias usan un repositorio falso en memoria y se puede cambiar de proveedor.

---

## 9. Convenciones de código

- **Lenguaje:** Python 3.14 con type hints; TypeScript en modo `strict`. Prohibido `any` salvo justificación comentada.
- **Nombres:** código y base de datos en **inglés** (`task`, `user`); textos de UI, prompts del agente y documentación en **español**.
- **Estilo:** ruff (Python), ESLint + Prettier (TypeScript); los commits no deben romper el lint.
- **Commits:** Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`) con referencia a la feature: `feat(003): T-002 agregar endpoint del agente`.
- **Ramas:** `main` protegida; una rama por feature `feat/NNN-nombre`; PR obligatorio. No crees repositorio remoto, ramas ni commits sin que el humano lo pida, y nunca subas `.env` ni credenciales.
- **Validación de entradas:** Pydantic en cada endpoint del backend; validación en los formularios del frontend.
- **Errores:** respuestas consistentes `{ error: { code, message } }`; nunca exponer trazas al cliente.
- **Rutas:** prefijo `/api/v1`. Solo son públicas `POST /auth/register`, `POST /auth/login` y `GET /health`; todo lo demás exige `Authorization: Bearer <JWT>`.
- **Fechas:** UTC en base de datos y API; conversión a la zona del usuario solo al presentar.
- **Dependencias de Python:** se gestionan siempre con `uv add` / `uv remove`; **no uses `pip install`** y sube `uv.lock`.
- **Migraciones:** todo cambio de esquema va por una migración SQL versionada en `supabase/migrations/`, que el humano aplica en el SQL Editor del panel de Supabase (ver «Migraciones de base de datos» más abajo).
- **Pruebas:** el nombre o docstring de cada prueba cita el `RF-xxx` o criterio que cubre.
- **Estilos de interfaz:** colores mediante variables (tokens) para soportar modo claro y oscuro; no uses colores fijos en los componentes.

### Comandos habituales (completar en la Fase 0)
```bash
# Backend (pyproject.toml y .env están en la raíz; uv los encuentra también desde backend/)
uv sync
cd backend && uv run uvicorn app.main:app --reload
uv run pytest && uv run ruff check .
uv add <paquete>

# Frontend
cd app && npm install && npm run dev
cd app && npm run build && npx cap sync android

# Android (depuración)
cd app/android && ./gradlew assembleDebug
```

### Migraciones de base de datos (Supabase, desde el panel web)

El esquema **no** lo crea el backend: `supabase-py` usa la API REST de Supabase y no puede ejecutar DDL (crear tablas, índices o políticas). Las migraciones son archivos SQL versionados que **el humano aplica a mano** en el panel web de Supabase (**SQL Editor**). No se usa la CLI de Supabase.

1. **El agente escribe, el humano aplica.** El agente crea el archivo SQL en `supabase/migrations/` y explica qué hace; no intenta ejecutarlo ni pide credenciales de la base de datos.
2. **Nombre:** `YYYYMMDDHHMMSS_descripcion.sql`, en orden cronológico. Una migración = un cambio pequeño. Al final lleva un bloque comentado `-- DOWN` con el SQL para revertirla.
3. **Tablas nuevas:** siempre con `ENABLE ROW LEVEL SECURITY` (sin políticas para `anon` ni `authenticated`), claves, índices y `timestamptz` para las fechas.
4. **Idempotentes cuando se pueda** (`CREATE TABLE IF NOT EXISTS`, etc.), para que repetir una migración no falle.
5. **Orden de aplicación:** primero en `calendargreen-dev`, se prueba, y solo después en `calendargreen-prod`. Nunca al revés.
6. **Registro:** tras aplicar una migración, el humano anota en `supabase/MIGRATIONS.md` el archivo y la fecha en dev y en prod. Sin la CLI, ese registro es la única forma de saber qué está aplicado.
7. **Nada de cambios a mano en el Table Editor** sin crear antes su migración: el repositorio y la base deben coincidir.
8. **Una migración aplicada no se edita.** Un cambio nuevo es una migración nueva.
9. **Antes de aplicar en prod:** el humano revisa el SQL. Como el plan gratuito no tiene copias de seguridad automáticas, se exporta un dump antes de cualquier cambio destructivo (`DROP`, `ALTER` que borre datos).

---

## 10. Seguridad y privacidad

- Contraseñas con hash robusto (Argon2 o bcrypt); nunca en logs.
- Contraseña de al menos 8 caracteres; correo en minúsculas y único (409 si se repite).
- Login fallido con mensaje genérico («correo o contraseña incorrectos»), sin revelar si el correo existe; límite de intentos por correo e IP.
- Todo endpoint protegido valida el JWT (401 sin token o con token inválido o vencido); JWT con vencimiento.
- Autorización por propiedad del recurso: cada consulta filtra por el `user_id` del JWT (prevención de IDOR). Se prueba con dos usuarios.
- **Supabase:** RLS activado en todas las tablas de `public`, **sin políticas** para `anon` ni `authenticated`. Solo el backend accede, con la clave `service_role`. Una tabla nueva sin RLS no se acepta.
- **`SUPABASE_SERVICE_ROLE_KEY` omite toda protección de RLS:** solo existe en variables de entorno del backend; jamás en el frontend, en el APK, en logs ni en el repositorio. Si se filtra, se rota desde el panel y se revisa el historial de git.
- El frontend y la app Android **nunca** hablan directo con Supabase.
- Secretos (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) solo en variables de entorno; jamás en el repositorio. Mantener `.env.example` sin valores.
- Protección contra OWASP Top 10: XSS, inyección, IDOR, rate limiting en login y en `/agent/command`.
- El texto del usuario se trata como datos, no como instrucciones, al construir prompts del agente.
- La Web Speech API puede enviar el audio al servicio de voz del navegador: la interfaz debe avisarlo al usuario.
- Almacenamiento del token de sesión en web y en Android **[POR CONFIRMAR]**; se define y aprueba en la spec de autenticación antes de implementarlo (en Android, almacenamiento seguro del dispositivo).
- Cumplir la normativa de protección de datos personales aplicable **[POR CONFIRMAR: Ley 1581 de 2012 – Colombia]**.
- Entornos separados: `calendargreen-dev` (desarrollo y pruebas de integración) y `calendargreen-prod`. Son los 2 proyectos gratuitos de Supabase; no crees un tercero. Las pruebas nunca tocan `prod`.
- Sin copias de seguridad automáticas en el plan gratuito: exportar la base periódicamente (SQL dump) y guardar el archivo fuera del repositorio.

---

## 11. Requisitos no funcionales (base)

- **Accesibilidad:** WCAG 2.1 AA como objetivo (ver sección 3).
- **Responsive:** el diseño inicial es de escritorio; la app Android requiere el diseño móvil (pendiente).
- **Rendimiento:** vistas de calendario cargan solo el rango visible (`from`/`to`); el comando de voz responde en pocos segundos una vez despierto el backend.
- **Disponibilidad:** *best effort*. El backend gratuito duerme y Supabase se pausa tras 1 semana sin uso. Mitigaciones: mensaje «despertando el servidor», error 503 claro si la base no responde y un ping gratuito periódico a un endpoint que consulte la base. Los recordatorios locales no dependen del backend.
- **Degradación elegante:** sin cuota de Gemini la app sigue funcionando con el formulario manual.
- **Observabilidad:** logs estructurados sin datos sensibles; monitoreo de errores con un plan gratuito **[POR CONFIRMAR]**.
- **Pruebas:** cobertura mínima del 70 % en lógica de dominio (fechas, aislamiento por usuario, validación de propuestas); E2E para los flujos críticos (registro → login → crear tarea por voz o texto → confirmar → ver en calendario).
- **Calidad del agente:** compuerta de la fase del agente: al menos **27 de 30 frases** de creación (fechas relativas, sin hora, sin fecha, ambiguas) y **16 de 20** de gestión de agenda (consultar, modificar, eliminar, seguridad) producen el resultado correcto.

---

## 12. Definition of Done (por feature)

- [ ] `spec.md`, `plan.md` y `tasks.md` aprobados y sincronizados con el código.
- [ ] Pantallas implementadas conforme a `UX/`, en modo claro y oscuro.
- [ ] Todos los criterios de aceptación verificados.
- [ ] Pruebas unitarias/integración/E2E pasando en CI (en local mientras el repositorio remoto no exista).
- [ ] Lint y type-check sin errores.
- [ ] Migraciones SQL con su bloque `DOWN`, aplicadas primero en dev y luego en prod, y anotadas en `supabase/MIGRATIONS.md`; RLS activado en tablas nuevas.
- [ ] Sin secretos ni datos sensibles en el repo.
- [ ] Sin dependencias de pago ni que requieran tarjeta.
- [ ] Documentación actualizada (README / ADR si hubo decisión arquitectónica).
- [ ] PR revisado y aprobado.

---

## 13. Plan inicial de features (orden sugerido)

| # | Feature | Depende de | Compuerta |
|---|---------|------------|-----------|
| 000 | Cimientos: repo, FastAPI con `/health`, proyectos Supabase `dev` y `prod` con migración inicial (tablas + RLS, aplicada a mano en el SQL Editor), frontend desplegado, CI | — | CI en verde, `/health` responde y una consulta de prueba a Supabase `dev` funciona |
| 001 | Autenticación: registro, login y zona de calendario protegida | 000 | Un usuario se registra, inicia sesión y entra a su calendario; sin sesión no se accede a nada; un segundo usuario no ve sus datos |
| 002 | Calendario y tareas (vistas mes, semana y día; CRUD; formulario manual) | 001 | Un usuario crea, mueve y borra tareas en las tres vistas |
| 003 | Agente con herramientas por texto (agendar, consultar, modificar, eliminar con confirmación; límites, tope diario) | 002 | 27 de 30 frases de creación y 16 de 20 de gestión de agenda correctas |
| 004 | Voz en la web | 003 | Dictado de extremo a extremo en Chrome y Edge de escritorio |
| 005 | App Android y recordatorios locales | 004 | En un teléfono real, una tarea dictada suena a su hora con el backend dormido |
| 006 | ~~Consultas de agenda~~ *(absorbida por la feature 003, 2026-11)* | 003 | — |
| 007 | ~~Tareas recurrentes~~ *(absorbida por la feature 002, enmienda 2026-11-08)* | 002 | — |

**Feature activa: 000.** Actualiza esta línea al cambiar de feature.

---

## 14. Instrucciones directas para el agente

1. Al iniciar una sesión, lee `AGENT.md`, `specs/constitution.md`, `UX/README.md` y la carpeta de la feature activa.
2. Identifica en qué fase SDD está la feature y trabaja **solo** esa fase.
3. Abre en `UX/` las pantallas de la feature antes de planificar o implementar. No inventes pantallas.
4. Si falta información, **pregunta** en lugar de asumir; registra la decisión en `Clarificaciones`.
5. Propón cambios pequeños y revisables; no hagas refactors fuera del alcance de la tarea.
6. Escribe pruebas junto con el código; no entregues funcionalidad sin ellas.
7. El agente de IA de la aplicación **no ejecuta escrituras**: sus herramientas de escritura solo preparan acciones para confirmar, y el código no debe darle acceso de escritura a la base. Sus herramientas de lectura se limitan al usuario de la sesión y a lo pedido.
8. No añadas ninguna dependencia o servicio de pago o que requiera tarjeta.
9. Al terminar, actualiza `tasks.md` y resume qué se hizo y qué sigue.
10. Nunca ejecutes acciones destructivas (borrar datos, reescribir historial, tocar producción) sin confirmación explícita.
11. Para cambios de base de datos, escribe la migración SQL en `supabase/migrations/` y entrégala; **no la apliques ni pidas credenciales de la base**. El humano la aplica en el SQL Editor de Supabase (dev primero, luego prod) y la registra en `supabase/MIGRATIONS.md`.

---

## 15. Primeros pasos sugeridos

1. Colocar los diseños exportados en `UX/` y crear `UX/README.md` con el índice.
2. Redactar `specs/constitution.md` (principios, stack final, estándares de calidad).
3. Resolver los puntos **[POR CONFIRMAR]** de este archivo.
4. Crear en supabase.com los proyectos `calendargreen-dev` y `calendargreen-prod`, y guardar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de cada uno en `.env` (nunca en el repo). Crear también `supabase/MIGRATIONS.md` para el registro de migraciones.
5. Crear la API key gratuita de Gemini en Google AI Studio y anotar los límites de la cuenta.
6. Crear `specs/000-cimientos/spec.md` y avanzar por las fases SDD.

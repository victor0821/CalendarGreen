# Constitución de CalendarGreen

> **Estado:** APROBADA por el humano el 2026-11-02 (Fase 0 de SDD).
> Este documento fija los principios y restricciones que **no cambian entre features**. Si una spec o un plan lo contradice, gana la constitución. Cambiarla requiere aprobación humana y una entrada en el historial (sección 9).
> Relación con `AGENT.md`: `AGENT.md` es la guía operativa para los agentes; esta constitución es la norma de la que se derivan las specs. Si divergen, se corrige uno de los dos en el mismo cambio.

---

## 1. Propósito

CalendarGreen es un calendario propio (web, PWA y app Android) donde el usuario dicta o escribe una tarea y un agente de IA **propone** agendarla; el usuario **confirma**. No depende de calendarios externos.

## 2. Principios (no negociables)

### P1. La especificación manda
Ningún código se escribe sin una `spec.md` aprobada. Si el código y la spec divergen, se actualiza primero la spec. El agente nunca salta fases ni inventa requisitos: ante ambigüedad, pregunta y lo registra en `Clarificaciones`.

### P2. El agente propone, el usuario confirma
Ninguna tarea creada por voz o texto se guarda sin una tarjeta de confirmación con título, fecha y hora. El agente de IA de la aplicación **nunca escribe en la base de datos**, y el código no debe permitirlo (no recibe herramientas ni repositorios de escritura).

### P3. El agente no inventa
Si falta la fecha o la hora, hace **una** pregunta corta. No asume valores. Todo lo que devuelve el agente se valida en el servidor antes de mostrarse (ISO 8601 con zona horaria, no anterior a hoy).

### P4. Todo es gratuito y sin tarjeta
Ninguna dependencia, API o servicio puede ser de pago ni exigir tarjeta de crédito. Antes de añadir una pieza se verifica su plan gratuito y su fecha de verificación se anota en el `plan.md`. Ante la duda, se pregunta. La aplicación debe **degradarse con elegancia** cuando se agoten las cuotas (ej. sin Gemini sigue funcionando el formulario manual).

### P5. Privacidad y aislamiento por defecto
Un usuario nunca ve ni modifica datos de otro. Toda consulta filtra por el `user_id` del JWT. Los secretos viven solo en variables de entorno. El texto del usuario es **datos, no instrucciones** al construir prompts.

### P6. Diseño: UX es la fuente de verdad visual
Las pantallas de `UX/` mandan sobre el aspecto y el flujo. No se inventan pantallas ni se altera el diseño por cuenta propia: si falta o choca, se pregunta. Los datos del mockup (correos, tareas, fechas) son ejemplos, no requisitos.

### P7. Accesible y con modo oscuro desde el inicio
WCAG 2.1 AA como objetivo. Modo claro y oscuro obligatorios en todas las pantallas, implementados con tokens (variables CSS), nunca con colores fijos en componentes.

### P8. Cambios pequeños, verificables y trazables
Cada tarea referencia un requisito (`RF-xxx`), cabe en una sesión corta y se marca al terminar. Cada commit/PR referencia la feature y la tarea. Sin refactors fuera del alcance de la tarea.

### P9. Nada destructivo sin confirmación
Borrar datos, reescribir historial o tocar producción exige confirmación humana explícita. Las pruebas nunca tocan `prod`.

## 3. Restricciones técnicas

### 3.1 Stack (decisión vigente)

| Capa | Decisión |
|------|----------|
| Backend | FastAPI + Uvicorn, **Python 3.14** |
| Gestor de Python | `uv`; `pyproject.toml`, `uv.lock` y `.python-version` en la **raíz** del proyecto. Prohibido `pip install` |
| Agente | Strands Agents con `GeminiModel`; modelo en la variable `GEMINI_MODEL`, nunca fijo en el código |
| Base de datos | Supabase PostgreSQL, acceso **solo desde el backend** con `supabase-py` y clave `service_role` |
| Autenticación | Propia (correo + contraseña, Argon2/bcrypt, JWT emitido por FastAPI). Sin Supabase Auth en v1 |
| Frontend | React + Vite + TypeScript `strict`, PWA, calendario propio (sin librerías de calendario) |
| Android | Capacitor; APK por archivo directo o GitHub Releases (sin Google Play) |
| Voz | Web Speech API (web) y `@capacitor-community/speech-recognition` (Android) |
| Recordatorios | `@capacitor/local-notifications` (locales, funcionan sin conexión) |
| Pruebas | pytest + httpx, Vitest, Playwright |
| Calidad | ruff (Python), ESLint + Prettier (TypeScript) |
| CI/CD | GitHub Actions (ver 3.5) |
| Despliegue | Backend en Render (gratuito). Frontend: ver Clarificación C-4 |

Cambiar cualquier fila requiere un ADR en `docs/adr/` y actualizar esta tabla.

### 3.2 Arquitectura
- **Capa de repositorio** (`backend/app/db/`) con interfaz propia. Rutas y agente no importan `supabase-py`; las pruebas usan un repositorio falso en memoria.
- El frontend y la app Android **nunca** hablan directo con Supabase.
- Rutas bajo `/api/v1`. Públicas solo `POST /auth/register`, `POST /auth/login` y `GET /health`; el resto exige `Authorization: Bearer <JWT>`.
- Errores con forma consistente `{ error: { code, message } }`; nunca se exponen trazas.
- Render no tiene disco persistente: no se guardan datos en archivos locales ni se usa SQLite.

### 3.3 Datos y fechas
- Fechas en UTC (`timestamptz`) en base de datos y API; conversión a la zona del usuario (por defecto `America/Bogota`) solo al presentar.
- Código, tablas y columnas en **inglés**; interfaz, prompts del agente y documentación en **español**.
- Origen de la tarea: `manual`, `voice` o `text`.

### 3.4 Base de datos y migraciones
- Todo cambio de esquema es una migración SQL en `supabase/migrations/` (`YYYYMMDDHHMMSS_descripcion.sql`), con bloque `-- DOWN` comentado e idempotente cuando se pueda.
- **El agente escribe, el humano aplica** en el SQL Editor de Supabase: primero `calendargreen-dev`, luego `calendargreen-prod`. El agente no ejecuta migraciones ni pide credenciales de la base.
- Toda tabla nueva lleva `ENABLE ROW LEVEL SECURITY` **sin políticas** para `anon` ni `authenticated`. Una tabla sin RLS no se acepta.
- Una migración aplicada no se edita; un cambio nuevo es una migración nueva. El registro vive en `supabase/MIGRATIONS.md`.
- Solo existen 2 proyectos Supabase (`dev`, `prod`); no se crea un tercero.
- Sin copias automáticas en el plan gratuito: se exporta un dump antes de cualquier cambio destructivo.

### 3.5 Repositorio
- **Un único repositorio (monorepo)** para backend, frontend, specs, UX y migraciones.
- **El humano creará un repositorio remoto (GitHub) para poder desplegar** (Render y el hosting del frontend despliegan desde él). Hasta que exista, pruebas y lint se ejecutan en local.
- Con el repositorio: rama principal `main` protegida, una rama por feature, PR obligatorio y GitHub Actions para lint y pruebas.
- **El humano** crea el repositorio remoto, hace el primer commit y el primer push. El agente no crea repositorios, ramas ni commits sin que el humano lo pida, y nunca sube `.env` ni credenciales.
- `.env` está en la raíz y fuera del control de versiones (ya cubierto por `.gitignore`). Antes del primer commit se verifica que no haya secretos en el árbol.
- Visibilidad (pública o privada) y proveedor: ver C-3.

## 4. Seguridad (mínimos obligatorios)

- Contraseñas con hash robusto, mínimo 8 caracteres, nunca en logs. Correo en minúsculas y único (409 si se repite).
- Login fallido con mensaje genérico; límite de intentos por correo e IP.
- JWT con vencimiento; 401 sin token, inválido o vencido.
- Prevención de IDOR: se prueba con dos usuarios.
- `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` y `JWT_SECRET` solo en entorno del backend; jamás en frontend, APK, logs ni repositorio. `.env.example` sin valores. Si se filtra una clave: rotar y revisar el historial de git.
- Rate limiting en login y en `/agent/command`; tope propio de **20 comandos por usuario y día** para proteger la cuota de Gemini.
- Protección contra OWASP Top 10. La interfaz avisa que la Web Speech API puede enviar el audio al servicio de voz del navegador.

## 5. Estándares de calidad

- **Idioma de código:** Python con type hints; TypeScript `strict`, prohibido `any` sin justificación comentada.
- **Lint/formato:** los commits no rompen ruff ni ESLint/Prettier.
- **Pruebas:** se escriben junto al código. Cada prueba cita el `RF-xxx` o criterio que cubre. Cobertura mínima **70 %** en lógica de dominio (fechas, aislamiento por usuario, validación de propuestas). E2E del flujo crítico: registro → login → crear tarea por voz/texto → confirmar → ver en calendario.
- **Calidad del agente:** al menos **27 de 30** frases de prueba en español (fechas relativas, sin hora, sin fecha, ambiguas) producen la propuesta o pregunta correcta. Es la compuerta de la feature 003.
- **Rendimiento:** las vistas cargan solo el rango visible (`from`/`to`).
- **Disponibilidad:** *best effort*. Mitigaciones: mensaje «despertando el servidor», 503 claro si la base no responde, ping gratuito periódico. Los recordatorios locales no dependen del backend.
- **Observabilidad:** logs estructurados sin datos sensibles.

## 6. Flujo de trabajo

- **Fases SDD por feature:** constitución → spec → clarificar → plan → tareas → implementar → validar. Cada artefacto lo aprueba un humano antes de pasar a la siguiente fase.
- **Ramas:** `main` protegida, una rama por feature `feat/NNN-nombre`, PR obligatorio (desde que exista el repositorio remoto; ver 3.5).
- **Commits:** Conventional Commits con referencia: `feat(003): T-002 agregar endpoint del agente`, cuando el humano pida commitear.
- **Definition of Done:** la de `AGENT.md` sección 12 (specs sincronizadas, UX en claro/oscuro, criterios verificados, pruebas y lint en verde en CI, migraciones aplicadas y registradas, sin secretos, sin pagos, docs actualizadas, PR aprobado).

## 7. Alcance de v1

**Dentro:** registro/login con correo, calendario propio (mes, semana, día), agente por texto y voz con confirmación, app Android con recordatorios locales.

**Fuera:** Google Calendar/Outlook, calendarios compartidos, verificación de correo y recuperación de contraseña, iOS y Google Play, login con terceros, panel de administración.

## 8. Clarificaciones abiertas

Estas decisiones bloquean o condicionan specs futuras. Se resuelven aquí antes de la feature indicada.

| ID | Pregunta | Detectado en | Bloquea |
|----|----------|--------------|---------|
| ~~C-1~~ | ~~Versión de Python~~ **Resuelta (2026-11-02):** rige **3.14**; `AGENT.md` actualizado. Pendiente verificar en la feature 000 que Render la soporte (ver C-9). | — | — |
| ~~C-2~~ | ~~Ubicación de `pyproject.toml`, `uv.lock` y `.env`~~ **Resuelta (2026-11-02):** se quedan en la **raíz**; `AGENT.md` actualizado. | — | — |
| C-3 | **Repositorio remoto** (decisión 2026-11-02: se creará para el despliegue; monorepo único). Pendiente: proveedor (se asume GitHub), **visibilidad pública o privada**, nombre, y renombrar la rama local `master` a `main`. | Cambio de decisión | 000 |
| C-4 | **Hosting del frontend:** Cloudflare Pages o GitHub Pages. | AGENT.md §7 | 000 |
| C-5 | **Duración por defecto de una tarea:** 30 min (modelo de datos) vs. 1 hora (mockup del asistente de voz). | AGENT.md §3 | 002 |
| C-6 | **Almacenamiento del token de sesión** en web y Android. | AGENT.md §10 | 001 |
| C-7 | **Normativa de datos personales** (¿aplica la Ley 1581 de 2012 de Colombia?). | AGENT.md §10 | 001 |
| C-8 | **Monitoreo de errores** con plan gratuito. | AGENT.md §11 | 000 |
| C-9 | **Render con uv y Python 3.14:** ¿instala con uv directamente, soporta 3.14 o requiere Dockerfile? | AGENT.md §7 | 000 |
| C-10 | **Nombre definitivo** de la aplicación (hoy «CalendarGreen» es de trabajo). | AGENT.md | — |
| C-11 | **Diseños de `UX/`:** faltan vista día y versión móvil/Android; no hay `UX/README.md` ni nomenclatura numerada. | Revisión del repo | 002, 005 |

## 9. Gobernanza

- La constitución la aprueba y modifica **solo un humano**. El agente puede proponer enmiendas, no aplicarlas en silencio.
- Cada enmienda se registra abajo con fecha y motivo.

| Fecha | Cambio | Aprobó |
|-------|--------|--------|
| 2026-11-02 | Borrador inicial | Humano (2026-11-02) |
| 2026-11-02 | Python 3.14; archivos de uv y `.env` en la raíz; monorepo sin repositorio remoto por ahora (CI/PR diferidos) | Humano (2026-11-02) |
| 2026-11-02 | **Se creará repositorio remoto para el despliegue:** se reactivan rama `main`, PR y GitHub Actions; C-3 reabierta (visibilidad y nombre) | Humano (2026-11-02) |

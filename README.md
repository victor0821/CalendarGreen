# CalendarGreen

Calendario propio (web, PWA y app Android) donde dictas o escribes una tarea en español y un agente de IA **propone** agendarla; tú **confirmas** antes de que se guarde. Gratis, sin tarjeta y sin depender de Google Calendar.

> Estado: en construcción, guiado por especificaciones (SDD). Implementadas y verificadas en local: **000 Cimientos**, **001 Autenticación** y **002 Calendario y tareas**. Pendientes: despliegue (Render y frontend), protección de `main` y las features 003 en adelante (agente de IA, voz, Android).

## Documentación (léela en este orden)

| Archivo | Para qué sirve |
|---------|----------------|
| [`AGENT.md`](AGENT.md) | Guía operativa del proyecto y reglas para agentes de IA |
| [`specs/constitution.md`](specs/constitution.md) | Principios y restricciones que no cambian |
| [`specs/`](specs) | Una carpeta por feature: `spec.md` (qué), `plan.md` (cómo), `tasks.md` (tareas) |
| [`UX/README.md`](UX/README.md) | Diseños de pantallas (fuente de verdad visual) |
| [`supabase/MIGRATIONS.md`](supabase/MIGRATIONS.md) | Registro de migraciones de base de datos aplicadas |

## Requisitos

- [uv](https://docs.astral.sh/uv/) (gestor de Python; instala Python 3.14 por ti).
- Node.js 24 o superior y npm.
- Un proyecto de Supabase **`calendargreen-dev`** (gratuito, sin tarjeta). En tu máquina local se usa **siempre dev**, nunca prod.

## Configuración

```bash
uv sync                      # instala las dependencias de Python
cp .env.example .env         # en PowerShell: Copy-Item .env.example .env
```

Completa `.env` (está fuera de git; **nunca lo subas**):

| Variable | Valor |
|----------|-------|
| `APP_ENV` | `dev` |
| `SUPABASE_URL` | URL del proyecto `calendargreen-dev` |
| `SUPABASE_SERVICE_ROLE_KEY` | clave de rol de servicio de `calendargreen-dev` (solo backend) |
| `JWT_SECRET` | texto aleatorio de 32 caracteres o más (firma las sesiones). Genéralo con `python -c "import secrets; print(secrets.token_urlsafe(48))"` |

Si falta alguna variable obligatoria, el servidor no arranca y te dice cuál.

### Base de datos

El esquema no lo crea el backend: lo aplicas **a mano** en Supabase → *SQL Editor*, pegando el contenido de [`supabase/migrations/20261102000000_initial_schema.sql`](supabase/migrations/20261102000000_initial_schema.sql) en `calendargreen-dev`. Después anota la fecha en [`supabase/MIGRATIONS.md`](supabase/MIGRATIONS.md).

Luego aplica, en orden, las migraciones siguientes de la misma carpeta (hoy: [`20261108000000_task_series_and_reminders.sql`](supabase/migrations/20261108000000_task_series_and_reminders.sql), que agrega las tareas que se repiten y los avisos). Cada una se prueba primero en dev y se anota en `MIGRATIONS.md`.

## Ejecutar

```bash
# Backend (http://localhost:8000)
cd backend
uv run uvicorn app.main:app --reload

# Frontend (http://localhost:5173), en otra terminal
cd app
npm install
npm run dev
```

Después de arrancar ambos, abre http://localhost:5173: verás `/login`; crea una cuenta en `/registro` y entra al calendario.

Comprobar que el backend está vivo y conectado a la base: `GET http://localhost:8000/api/v1/health` → `{"status":"ok","environment":"dev","database":"ok"}`. Si la base está pausada o inaccesible responde `503`.

## Pruebas y estilo

```bash
# Backend (desde la raíz)
uv run pytest                    # unitarias, sin internet
uv run pytest -m integration     # contra Supabase dev (requiere .env y la migración aplicada)
uv run ruff check backend

# Frontend (desde app/)
npm test
npm run lint
npm run format:check
npm run build

# Pruebas de extremo a extremo (navegador real + backend real + Supabase dev)
cd app
npx playwright install chromium   # solo la primera vez
npm run e2e                       # levanta el backend y el frontend si no están corriendo
cd .. && uv run python scripts/cleanup_e2e.py   # borra de dev los usuarios e2e-*@example.com
```

## Estructura

```
AGENT.md · README.md · pyproject.toml · uv.lock · .env (local, no versionado)
specs/        constitución y specs por feature
UX/           diseños de pantallas
backend/      FastAPI (app/api, app/core, app/db, app/agent) y tests
app/          React + Vite + TypeScript (frontend)
supabase/     migraciones SQL y su registro
```

## Reglas rápidas

- Ningún código sin una spec aprobada (ver `AGENT.md` §2).
- Dependencias de Python solo con `uv add` / `uv remove`; nunca `pip install`.
- Todo servicio o API debe ser gratuito y sin tarjeta.
- Los secretos solo en variables de entorno; jamás en el repositorio.

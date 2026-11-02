# 000 — Cimientos · Plan técnico

> **Estado:** BORRADOR — pendiente de aprobación humana (Fase 3: Planificar). Depende de `spec.md` aprobada; si la spec cambia, se ajusta este plan.
> Respeta `specs/constitution.md` (aprobada).

## 1. Decisiones de arquitectura

| # | Decisión | Motivo | Cubre |
|---|----------|--------|-------|
| D-1 | Backend **FastAPI + Uvicorn**, Python 3.14, dependencias con `uv` (`pyproject.toml` y `uv.lock` en la raíz) | Constitución §3.1 | RF-012 |
| D-2 | Configuración con **`pydantic-settings`**: lee variables de entorno y el `.env` de la raíz | Falla con nombres de variables faltantes sin mostrar valores | RF-003, RF-004 |
| D-3 | **Capa de repositorio**: interfaz `Repository` (Protocol) con `SupabaseRepository` y `InMemoryRepository` | Constitución §3.2; pruebas sin internet | RF-010 |
| D-4 | **`supabase-py`** solo dentro de `backend/app/db/supabase_repository.py`, con `service_role` | RLS sin políticas; solo el backend accede | RF-006, RNF-002 |
| D-5 | Esquema por **migraciones SQL manuales** en `supabase/migrations/`, aplicadas por el humano en el SQL Editor | Constitución §3.4 | RF-006, RF-007, RF-008 |
| D-6 | Errores con **manejadores globales** que devuelven `{ error: { code, message } }` | Evita trazas al cliente | RF-009 |
| D-7 | Frontend **React + Vite + TypeScript strict** en `app/`; tokens como **variables CSS**; tema por atributo `data-theme` en `<html>` | Constitución §3.1, P7 | RF-011 |
| D-8 | Entornos: `APP_ENV=dev|prod`; el `.env` local apunta **siempre a `dev`**; las credenciales de `prod` solo existen en el servicio de despliegue | Evita que pruebas toquen prod | RF-005 |
| D-9 | Pruebas de integración contra Supabase `dev` marcadas con `@pytest.mark.integration` y **excluidas por defecto**; se ejecutan solo con `-m integration` | Unitarias sin internet; integración explícita | RF-005, CA-10 |
| D-10 | Logs estructurados en JSON con `logging` estándar; sin cuerpos de petición ni cabeceras | Sin datos sensibles | RNF-003 |
| D-11 | **GitHub Actions** (`.github/workflows/ci.yml`): en cada PR y push a `main` ejecuta `uv sync --frozen`, `ruff`, `pytest` (sin `-m integration`) y, para `app/`, `npm ci`, `lint`, `test` y `build`. **Sin secretos de Supabase** en CI | Repositorio remoto (C-3); GitHub Actions es gratuito (en repositorio privado tiene minutos mensuales limitados: verificar al crear) | RF-015 |
| D-12 | `main` protegida con regla de «CI en verde» obligatoria y PR obligatorio (configurado por el humano en GitHub) | Constitución §3.5 | RF-016 |
| D-13 | **Despliegue** desde el repositorio: backend en Render (comando de arranque con `uv`; variables de `prod` cargadas en el panel de Render) y frontend en el hosting elegido (Q-1) con `VITE_API_URL` apuntando al backend. CORS del backend limitado al dominio del frontend | Q-1, Q-2, Q-11 | RF-005 |

**Fecha de verificación de planes gratuitos:** Supabase verificado el 2026-10-31 (según `AGENT.md` §7). Render y el hosting del frontend se verifican al cerrar Q-1/Q-2/Q-3.

**Riesgo de Python 3.14:** confirmar en T-001 que `fastapi`, `uvicorn`, `pydantic-settings` y `supabase` instalan limpio en 3.14. Si falla, se detiene y se propone una enmienda (constitución §9), no se baja la versión en silencio.

## 2. Estructura de archivos afectada

```
.
├── .github/workflows/ci.yml          # NUEVO: lint y pruebas en PR y en main
├── .env.example                      # NUEVO: variables sin valores
├── README.md                         # COMPLETAR (hoy vacío)
├── pyproject.toml / uv.lock          # AGREGAR dependencias con uv add
├── backend/
│   ├── app/
│   │   ├── main.py                   # create_app(), registro de rutas y manejadores
│   │   ├── api/
│   │   │   ├── router.py             # APIRouter con prefijo /api/v1
│   │   │   └── health.py             # GET /health
│   │   ├── core/
│   │   │   ├── config.py             # Settings (pydantic-settings)
│   │   │   ├── errors.py             # AppError + manejadores globales
│   │   │   └── logging.py            # configuración de logs JSON
│   │   ├── db/
│   │   │   ├── base.py               # Protocol Repository (ping, y luego users/tasks)
│   │   │   ├── supabase_repository.py
│   │   │   └── memory_repository.py
│   │   └── agent/                    # EXISTENTE (prototipo): NO se toca en 000
│   └── tests/
│       ├── conftest.py
│       ├── test_config.py
│       ├── test_errors.py
│       ├── test_health.py
│       └── integration/test_supabase_health.py
├── supabase/
│   ├── migrations/20261102000000_initial_schema.sql   # NUEVO (el agente la escribe)
│   └── MIGRATIONS.md                                  # NUEVO
├── app/                              # NUEVO: Vite + React + TS
│   ├── src/styles/tokens.css         # tokens claro/oscuro
│   ├── src/theme/                    # ThemeProvider + botón
│   └── tests/
└── docs/adr/                         # ADR si se decide hosting (Q-1/Q-2)
```

> **Nota de importación:** el prototipo `backend/app/agent/` usa importaciones planas (`from config import get_model`) y carga el `.env` desde `parents[3]` (la raíz). Eso es compatible con `core/config.py`, que cargará el mismo `.env`. Se revisará en 003.

## 3. Variables de entorno (`.env.example`)

| Variable | Obligatoria en 000 | Uso |
|----------|--------------------|-----|
| `APP_ENV` | Sí (`dev` o `prod`) | Distingue entornos |
| `SUPABASE_URL` | Sí | URL del proyecto (dev en local) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave de servicio (nunca en frontend ni logs) |
| `JWT_SECRET` | No en 000 (se exige en 001) | Firma de tokens |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | No en 000 (003) | Agente |
| `CORS_ORIGINS` | No (valor por defecto: origen de Vite en local) | Orígenes permitidos |
| `DB_HEALTH_TIMEOUT_SECONDS` | No (por defecto 3) | Tiempo máximo de la verificación |

Una variable vacía se trata como ausente. Las variables de 001/003 se agregan al ejemplo desde ya, marcadas «aún no obligatoria».

## 4. Contratos de API

### `GET /api/v1/health` (público)
- **200**
  ```json
  { "status": "ok", "environment": "dev", "database": "ok" }
  ```
- **503** (base no disponible o clave inválida)
  ```json
  { "error": { "code": "database_unavailable", "message": "La base de datos no responde. Puede estar pausada por inactividad." } }
  ```
- No devuelve versiones, rutas internas ni nombres de proyecto. `environment` solo muestra `dev`/`prod`.

### Formato de error global (RF-009)
```json
{ "error": { "code": "validation_error", "message": "Revisa los datos enviados." } }
```
- Códigos iniciales: `validation_error` (422), `not_found` (404), `internal_error` (500), `database_unavailable` (503). 001/002 agregan los suyos.
- Los errores de validación de FastAPI se **convierten** a este formato; el detalle por campo se agrega como `fields` solo cuando aporta valor (decisión en 001).
- Un `Exception` no controlado devuelve `internal_error` sin traza; la traza va solo al log del servidor.

## 5. Modelo de datos inicial (migración `20261102000000_initial_schema.sql`)

> El agente **escribe** el archivo en `supabase/migrations/`; **no lo aplica**. El humano lo aplica en `calendargreen-dev`, lo prueba y luego en `calendargreen-prod`. Las tablas llevan nombre en plural (`users`) porque `user` es palabra reservada en PostgreSQL.

**`public.users`**
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `email` | `text` | NOT NULL, UNIQUE, `CHECK (email = lower(email))` |
| `password_hash` | `text` | NOT NULL |
| `timezone` | `text` | NOT NULL, `DEFAULT 'America/Bogota'` |
| `created_at` | `timestamptz` | NOT NULL, `DEFAULT now()` |
| `updated_at` | `timestamptz` | NOT NULL, `DEFAULT now()` |

**`public.tasks`**
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → `users(id)` `ON DELETE CASCADE` |
| `title` | `text` | NOT NULL, `CHECK (char_length(title) BETWEEN 1 AND 120)` |
| `start_at` | `timestamptz` | NOT NULL |
| `duration_minutes` | `integer` | NOT NULL, `DEFAULT 30`, `CHECK (duration_minutes BETWEEN 5 AND 1440)` |
| `notes` | `text` | NULL, `CHECK (char_length(notes) <= 1000)` |
| `completed_at` | `timestamptz` | NULL |
| `source` | `text` | NOT NULL, `DEFAULT 'manual'`, `CHECK (source IN ('manual','voice','text'))` |
| `reminder_enabled` | `boolean` | NOT NULL, `DEFAULT true` |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL, `DEFAULT now()` |

- Índice: `tasks (user_id, start_at)`.
- `updated_at`: se actualiza desde el backend en cada `PATCH` (sin triggers, para mantener la migración simple; decisión revisable).
- Ambas tablas: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` **sin** políticas.
- Idempotencia: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
- Bloque `-- DOWN` comentado: `DROP TABLE IF EXISTS public.tasks; DROP TABLE IF EXISTS public.users;`.
- Los valores de los `CHECK` (120, 1000, 5–1440) son **propuestas** que se confirman en las specs 001/002; si cambian, se ajusta esta migración **antes** de aplicarla (una migración aplicada no se edita).

> Las tablas de 001/002 se crean aquí a propósito: la gate de 000 pide «migración inicial (tablas + RLS)». Si se prefiere crear cada tabla en su feature, se parte la migración y se actualiza la spec (Q nueva si se pide).

## 6. Capa de repositorio (RF-010)

```python
class Repository(Protocol):
    def ping(self) -> None: ...   # lanza DatabaseUnavailable si falla
```
- En 000 solo se define `ping()`. En 001 se agregan los métodos de usuarios; en 002 los de tareas. Cada feature extiende la interfaz **y** las dos implementaciones.
- `SupabaseRepository.ping()`: consulta mínima a `users` (`select id limit 1`) con tiempo máximo `DB_HEALTH_TIMEOUT_SECONDS`; cualquier excepción o código HTTP no exitoso → `DatabaseUnavailable`.
- Dependencia FastAPI `get_repository()` que devuelve la implementación según `APP_ENV` y permite sobreescritura en pruebas.

## 7. Frontend base (RF-011)

- `app/` con Vite + React + TypeScript `strict`, ESLint + Prettier, Vitest.
- `tokens.css`: variables `--color-primary`, `--color-primary-hover`, `--color-deep`, `--color-bg`, `--color-surface`, `--color-tint`, `--color-text`, `--color-link`, etc., con valores de `UX/README.md` §2 para `:root` (claro) y `:root[data-theme="dark"]` (oscuro). **Ningún componente usa colores fijos.**
- Fuentes: Bricolage Grotesque y DM Sans (Google Fonts, gratuitas). Aviso: cargar desde Google Fonts envía la IP del visitante a Google; alternativa es alojarlas en `app/public/fonts` (decisión menor, propuesta: **alojar localmente** para privacidad y uso sin conexión en la app Android).
- `ThemeProvider`: lee preferencia en `localStorage` (con `try/catch`), si no hay usa `prefers-color-scheme`; botón con `aria-label` que alterna.
- Página de bienvenida mínima solo para verificar el tema (se reemplaza en 001).
- Proxy de desarrollo de Vite a `http://localhost:8000` para `/api`.

## 8. Dependencias a añadir (todas gratuitas / código abierto)

- Python (`uv add`): `fastapi`, `uvicorn[standard]`, `pydantic-settings`, `supabase`. Desarrollo (`uv add --dev`): `pytest`, `pytest-cov`, `httpx`, `ruff`.
- Frontend (`npm`): `react`, `react-dom`, `vite`, `typescript`, `vitest`, `@testing-library/react`, `eslint`, `prettier`.
- Ninguna requiere pago ni tarjeta (RNF-001). Se verifican licencias al instalar.

## 9. Estrategia de pruebas

Cada prueba cita su `RF-xxx` o `CA-x` en el nombre o docstring.

| Prueba | Cubre |
|--------|-------|
| `test_config`: falta variable → error que nombra la variable y no imprime valores; variable vacía = faltante | RF-003, CA-3 |
| `test_errors`: validación, 404, excepción → formato `{ error: { code, message } }` sin traza | RF-009, CA-9 |
| `test_health`: con repositorio en memoria → 200; con repositorio que falla → 503 sin traza | RF-001, RF-002, CA-1, CA-2 |
| `test_no_secrets` (utilidad): busca patrones de clave en archivos versionados y comprueba que `.env` está en `.gitignore` | RF-014, CA-4 |
| `integration/test_supabase_health` (marca `integration`, contra `dev`): `ping()` correcto; con clave inválida falla claro | RF-006, RF-005, CA-5 |
| `integration/test_schema`: tablas con RLS activo y sin políticas; insertar tarea sin usuario falla | RF-006, CA-6, CA-7 |
| Frontend `theme.test`: alterna tema, persiste, funciona sin `localStorage` | RF-011, CA-11 |
| Comandos: `uv run pytest`, `uv run ruff check .`, `npm test`, `npm run lint` | RF-012, CA-12 |

Cobertura mínima 70 % en lógica de dominio (no aplica aún: la lógica es mínima).

## 10. Comandos (a documentar en `README.md`)

```bash
uv sync
cp .env.example .env          # luego completar con claves de calendargreen-dev
cd backend && uv run uvicorn app.main:app --reload
uv run pytest                 # unitarias (sin internet)
uv run pytest -m integration  # contra dev
uv run ruff check .
cd app && npm install && npm run dev && npm test && npm run lint
```

## 11. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Paquete sin soporte para Python 3.14 | Verificar en T-001; si falla, detener y enmendar la constitución |
| Render no instala con `uv` o no soporta 3.14 | Q-2/Q-3; alternativa Dockerfile (verificar que sigue siendo gratuito); si no hay solución, enmienda de la constitución |
| Secretos al publicar el repositorio por primera vez | El humano revisa el árbol antes del primer commit (`.env` ya excluido; `test_no_secrets`); preferir repositorio **privado** (Q-9); si se filtró algo, rotar la clave |
| Minutos de GitHub Actions limitados en repositorio privado | Pipeline corto y con caché de `uv` y `npm`; verificar la cuota gratuita |
| Rama local `master` vs `main` remota | Renombrar a `main` antes del primer push |
| `service_role` filtrada | `.env` fuera de git, rotación documentada, nunca en frontend |
| Supabase pausa el proyecto | 503 claro; reactivar a mano; ping diferido (Q-6) |
| Pruebas de integración tocan prod | `.env` local solo con `dev`; sin credenciales de prod en la máquina |
| Migración defectuosa en prod | Aplicar siempre primero en dev; dump previo en cambios destructivos |

## 12. Trazabilidad RF → componente

| RF | Componente |
|----|-----------|
| RF-001, RF-002 | `api/health.py`, `db/*.ping`, `core/errors.py` |
| RF-003, RF-004 | `core/config.py`, `.env.example` |
| RF-005 | D-8, `.env`, marca `integration` |
| RF-006, RF-007 | `supabase/migrations/20261102000000_initial_schema.sql` |
| RF-008 | `supabase/MIGRATIONS.md` |
| RF-009 | `core/errors.py` |
| RF-010 | `db/base.py`, `db/memory_repository.py`, `db/supabase_repository.py` |
| RF-011 | `app/src/styles/tokens.css`, `app/src/theme/` |
| RF-012, RF-013 | comandos, `README.md` |
| RF-014 | `.gitignore`, `.env.example`, `test_no_secrets` |
| RF-015 | `.github/workflows/ci.yml` |
| RF-016 | protección de `main` en GitHub (acción del humano) |

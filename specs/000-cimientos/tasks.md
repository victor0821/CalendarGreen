# 000 — Cimientos · Tareas

> **Estado:** APROBADO por el humano (2026-11-02) (Fase 4: Tareas). Todas sin marcar.
> Leyenda de responsable: **A** = agente, **H** = humano (paso manual). Cada tarea cita su `RF-xxx` de `spec.md`.
> Commits (cuando el humano los pida): `feat(000): T-00x descripción`.
> Las tareas T-018 a T-021 se agregaron al decidir crear un repositorio remoto para el despliegue (2026-11-02); por eso su numeración va tras T-017 aunque se ejecutan antes del cierre.

## Estado de implementación (2026-11-02)

**Hechas:** T-001…T-014. **Pendientes:** T-015 (esquema en prod), T-016 (clarificaciones de despliegue), T-017 (validación final), T-018 (protección de `main`; el repositorio remoto ya existe), T-019 (el flujo `.github/workflows/ci.yml` está escrito pero **aún no se ha ejecutado en GitHub**), T-020 y T-021 (despliegue).
**Verificado contra Supabase dev:** 9 pruebas de integración pasan (conexión, clave inválida falla claro, correo único y en minúsculas, restricciones de la base, clave foránea, cascada, CRUD y aislamiento). **No verificado:** que RLS esté activo y sin políticas (la prueba `test_publishable_key_cannot_read_tables` se omite porque `.env` no tiene `SUPABASE_PUBLISHABLE_KEY`; ver `supabase/MIGRATIONS.md`).

## Fase A — Backend sin base de datos (todo en local, sin internet)

- [x] **T-001 · A · Dependencias y estructura del backend** (RF-012)
  Crear carpetas de `backend/app/` (`api`, `core`, `db`), `backend/tests/`; `uv add fastapi "uvicorn[standard]" pydantic-settings supabase`; `uv add --dev pytest pytest-cov httpx ruff`; configurar ruff en `pyproject.toml`.
  **Hecho cuando:** `uv sync` y `uv run ruff check .` pasan en Python 3.14. *Si algún paquete no soporta 3.14, detener y reportar.*
  **Resultado (2026-11-02):** todos instalan en Python 3.14.7 (fastapi 0.162, uvicorn 0.54, pydantic-settings 2.16, supabase 2.33; pytest 9.2, ruff 0.17). Ruff y pytest configurados en `pyproject.toml` (`src = ["backend"]`, `pythonpath`).

- [x] **T-002 · A · Configuración por entorno + `.env.example`** (RF-003, RF-004, RF-014)
  `core/config.py` con `Settings`; `.env.example` sin valores; revisar `.gitignore` (ya excluye `.env`).
  **Hecho cuando:** `test_config` pasa (variable faltante o vacía → error que la nombra, sin valores).
  *Depende de T-001.*

- [x] **T-003 · A · Errores con formato único y logging** (RF-009, RNF-003)
  `core/errors.py` (`AppError`, manejadores para validación, 404 y excepciones) y `core/logging.py` (JSON).
  **Hecho cuando:** `test_errors` pasa (sin trazas en la respuesta).
  *Depende de T-001.*

- [x] **T-004 · A · Interfaz de repositorio + versión en memoria** (RF-010)
  `db/base.py` (`Repository.ping`, `DatabaseUnavailable`), `db/memory_repository.py` (con modo «falla» para pruebas).
  **Hecho cuando:** pruebas unitarias del repositorio en memoria pasan.
  *Depende de T-001.*

- [x] **T-005 · A · Aplicación FastAPI y `GET /api/v1/health`** (RF-001, RF-002)
  `factory.py` (`create_app`, inyectable en pruebas), `main.py` (`app` para uvicorn; sale con mensaje claro si falta configuración), `api/router.py`, `api/health.py`, `api/deps.py` (`get_repository`), CORS desde `CORS_ORIGINS`.
  *Desviación del plan:* `create_app` vive en `factory.py` y no en `main.py`, para que las pruebas no dependan del `.env` real.
  **Hecho cuando:** `test_health` pasa (200 con repo sano; 503 con repo que falla; sin trazas).
  *Depende de T-002, T-003, T-004.*

## Fase B — Supabase (acciones manuales + migración)

- [x] **T-006 · H · Crear proyectos Supabase `calendargreen-dev` y `calendargreen-prod`** (RF-005)
  En supabase.com, sin tarjeta; anotar región. Copiar **solo** `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de **dev** al `.env` local. Las de prod **no** van en la máquina local (se cargarán en el servicio de despliegue).
  **Hecho cuando:** `.env` local con `APP_ENV=dev` y las dos variables de dev. *Resuelve Q-5.*

- [x] **T-007 · A · Escribir la migración inicial** (RF-006, RF-007)
  `supabase/migrations/20261102000000_initial_schema.sql` según `plan.md` §5: tablas `users` y `tasks`, restricciones, índice, RLS sin políticas, idempotente, con bloque `-- DOWN`. **No se aplica.**
  **Estado (2026-11-02):** archivo escrito; **pendiente de tu revisión** (confirma los límites 120/1000/5–1440).
  **Hecho cuando:** el humano revisó el SQL.
  *Depende de que 001/002 confirmen valores propuestos (120, 1000, 5–1440), o se acepten tal cual.*

- [x] **T-008 · A · Crear `supabase/MIGRATIONS.md`** (RF-008)
  Tabla con columnas: archivo · aplicada en dev (fecha) · aplicada en prod (fecha) · notas.
  **Hecho cuando:** existe con la migración inicial listada como «pendiente».

- [x] **T-009 · H · Aplicar la migración en `dev`** (RF-006, RF-007, RF-008)
  Pegar el SQL en el SQL Editor de `calendargreen-dev`, ejecutar, y anotar la fecha en `MIGRATIONS.md`. Probar el bloque `-- DOWN` y volver a aplicar para confirmar idempotencia.
  **Hecho cuando:** tablas con RLS activo y fila anotada. *Depende de T-006, T-007, T-008.*

- [x] **T-010 · A · `SupabaseRepository.ping()` y pruebas de integración** (RF-001, RF-002, RF-005, RF-006)
  `db/supabase_repository.py` + selección por `APP_ENV`; `tests/integration/` (`@pytest.mark.integration`, excluidas por defecto): ping OK, clave inválida falla claro, esquema con RLS sin políticas, tarea sin usuario rechazada.
  **Hecho cuando:** `uv run pytest -m integration` pasa contra `dev`. *Depende de T-005, T-009.*

## Fase C — Frontend base

- [x] **T-011 · A · Crear `app/` con Vite + React + TypeScript strict** (RF-011, RF-012)
  Inicializar, activar `strict`, ESLint + Prettier, Vitest + Testing Library, proxy `/api` a `localhost:8000`.
  **Resultado:** Vite 8 + React 19 + TypeScript **6.0** (no 7: `typescript-eslint` aún no lo admite; la plantilla traía `oxlint`, sustituido por ESLint según la constitución). `npm audit` reporta 12 avisos moderados solo en herramientas de desarrollo (`minimatch` dentro de `typescript-eslint`); no se fuerza la corrección.
  **Hecho cuando:** `npm run dev`, `npm run lint` y `npm test` funcionan.

- [x] **T-012 · A · Tokens de marca, fuentes y tema claro/oscuro** (RF-011)
  `src/styles/tokens.css` (valores de `UX/README.md` §2), fuentes alojadas localmente (paquetes `@fontsource-variable`, licencia OFL), `ThemeProvider` con botón accesible, persistencia con `try/catch`, respeto de `prefers-color-scheme`.
  **Hecho cuando:** `theme.test` pasa (alterna, persiste, funciona sin `localStorage`) y ningún componente usa colores fijos.
  *Depende de T-011.*

## Fase D — Documentación y cierre

- [x] **T-013 · A · Completar `README.md` de la raíz** (RF-013, RNF-004)
  Requisitos, instalación, `.env`, comandos de `plan.md` §10, estructura y enlaces a `AGENT.md`, `specs/` y `UX/`.
  **Hecho cuando:** una persona nueva puede seguirlo (el humano lo prueba).
  *Depende de T-005, T-012.*

- [x] **T-014 · A · Prueba de ausencia de secretos** (RF-014)
  `test_no_secrets`: `.env` en `.gitignore`, `.env.example` sin valores, sin patrones de clave en archivos versionados.
  **Hecho cuando:** pasa en local. *Depende de T-002.*

- [ ] **T-015 · H · Aplicar la migración en `prod`** (RF-006, RF-008)
  Solo tras T-010 en verde. Revisar el SQL; (no hay datos que respaldar aún). Anotar fecha en `MIGRATIONS.md`.
  **Hecho cuando:** tablas con RLS en prod y fila anotada. *Depende de T-009, T-010.*

- [ ] **T-018 · H · Crear el repositorio remoto y publicar el primer commit** (RF-014, RF-016)
  Decidir proveedor y visibilidad (Q-9). Renombrar la rama `master` a `main`. **Antes del primer commit**, pedir al agente la revisión de secretos del árbol (T-014). Crear el repositorio vacío, hacer el primer commit y el primer push. Activar la protección de `main`: PR obligatorio y CI en verde obligatoria (tras T-019).
  **Hecho cuando:** el repositorio existe con `main` protegida y sin secretos. *Depende de T-014.*

- [ ] **T-019 · A · Flujo de GitHub Actions** (RF-015)
  **Estado (2026-11-02):** `.github/workflows/ci.yml` escrito; **sin verificar** hasta que corra en GitHub (primer PR o push).
  `.github/workflows/ci.yml`: `uv sync --frozen`, `ruff`, `pytest` (sin integración) y `npm ci`, `lint`, `test`, `build`; con caché. Sin secretos de Supabase.
  **Hecho cuando:** el flujo corre en verde en el primer PR (CA-14). *Depende de T-017 (comandos) y T-018.*

- [ ] **T-020 · H+A · Despliegue del backend en Render** (RF-005, RF-001)
  Verificar si Render instala con `uv` y su compatibilidad con Python 3.14 (Q-2, Q-3; si hace falta, Dockerfile). El humano crea el servicio y carga las variables de **prod** (`APP_ENV=prod`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`); el agente deja el comando de arranque y documenta. Requiere T-015 (esquema en prod).
  **Hecho cuando:** `GET /api/v1/health` responde 200 en la URL pública con `environment: "prod"`. *Depende de T-015, T-018.*

- [ ] **T-021 · H+A · Despliegue del frontend** (RF-011)
  Elegir hosting (Q-1), conectar el repositorio, configurar `VITE_API_URL` y limitar CORS en el backend al dominio del frontend.
  **Hecho cuando:** la página base se abre en su URL pública con el tema claro/oscuro funcionando. *Depende de T-012, T-020.*

- [ ] **T-016 · H · Resolver el resto de clarificaciones (Q-3, Q-4, Q-6, Q-7, Q-10, Q-11)**
  Resolverlas o diferirlas por escrito (Q-4 monitoreo y Q-6 ping para mantener despierto). Crear un ADR en `docs/adr/` por cada decisión de hosting.
  **Hecho cuando:** `spec.md` § Clarificaciones sin preguntas «Abiertas» sin decisión.

- [ ] **T-017 · A · Validación final de la feature** (todos)
  Ejecutar `uv run pytest`, `uv run ruff check .`, `npm test`, `npm run lint`; comprobar CI en verde y `/health` en producción; recorrer el Checklist de `spec.md`; resumir qué se hizo y qué sigue.
  **Hecho cuando:** checklist de `spec.md` completo y el humano aprueba cerrar la feature 000 (entonces se actualiza «Feature activa» en `AGENT.md` a 001).
  *Depende de todas las anteriores (incluidas T-018 a T-021).*

## Orden sugerido

`T-001 → T-002/T-003/T-004 → T-005` · en paralelo `T-006 → T-007 → T-008 → T-009 → T-010` · en paralelo `T-011 → T-012` · luego `T-013`, `T-014` · **`T-018` (repositorio, tras T-014) → `T-019` (CI)** · `T-015` (esquema en prod) → `T-020` (backend en Render) → `T-021` (frontend) · `T-016` · `T-017`.

## Trazabilidad RF → tareas

| RF | Tareas |
|----|--------|
| RF-001 | T-005, T-010 |
| RF-002 | T-005, T-010 |
| RF-003 | T-002 |
| RF-004 | T-002 |
| RF-005 | T-006, T-010 |
| RF-006 | T-007, T-009, T-010, T-015 |
| RF-007 | T-007, T-009 |
| RF-008 | T-008, T-009, T-015 |
| RF-009 | T-003 |
| RF-010 | T-004 |
| RF-011 | T-011, T-012 |
| RF-012 | T-001, T-011, T-017 |
| RF-013 | T-013 |
| RF-014 | T-002, T-014, T-018 |
| RF-015 | T-019 |
| RF-016 | T-018 |

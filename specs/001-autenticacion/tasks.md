# 001 — Autenticación · Tareas

> **Estado:** APROBADO por el humano (2026-11-02) (Fase 4: Tareas). Todas sin marcar.
> Leyenda: **A** = agente, **H** = humano. Prerrequisito: feature 000 cerrada (T-017 de 000).
> Commits (cuando el humano los pida): `feat(001): T-00x descripción`.

## Estado de implementación (2026-11-02)

**Hechas:** T-001…T-017. **Pendientes:** T-018 (revisión de accesibilidad: hay `label`, `aria-invalid`, `role="alert"` y pruebas de teclado, pero **falta la revisión manual de contraste y de lector de pantalla**) y T-019 (tu validación final).
**Decisiones adoptadas (T-001), las propuestas de la spec:** token Bearer en `localStorage` (memoria si no hay almacenamiento); sesión de 7 días sin renovación; cerrar sesión solo descarta el token; 5 fallos en 15 min por (correo + IP) bloquean 15 min; contraseña de 8 a 128 caracteres sin otras reglas; 10 registros por hora por IP; tras entrar siempre a `/calendario`; zona horaria no editable. **Sigue abierta Q-7** (Ley 1581): no se agregó aviso de privacidad.
**Pruebas:** backend 101 (incluye seguridad, limitador, rutas protegidas contra una lista blanca y aislamiento), frontend 90 y 4 E2E en navegador real contra la base dev.

## Fase A — Preparación y decisiones

- [x] **T-001 · H · Resolver clarificaciones bloqueantes** (RF-009, RF-011, Q-1…Q-5, Q-7…Q-12)
  Decidir: almacenamiento del token (Q-1), duración de sesión (Q-2), límite de intentos (Q-4), reglas de contraseña (Q-5), normativa de datos (Q-7) y patrón mínimo para estados sin diseño (Q-8).
  **Hecho cuando:** `spec.md` § Clarificaciones sin preguntas «Abiertas» que bloqueen. *Antes de T-005.*

- [x] **T-002 · A · Dependencias de autenticación** (RNF-001, RNF-002)
  `uv add argon2-cffi PyJWT email-validator tzdata`. Verificar que instalan en Python 3.14; si `argon2-cffi` falla, usar `bcrypt` y crear un ADR.
  **Hecho cuando:** `uv sync` y `uv run ruff check .` pasan.

- [x] **T-003 · A · `JWT_SECRET` y configuración** (RNF-002)
  Añadir a `core/config.py` `JWT_SECRET` (obligatoria, mínimo 32 caracteres), `JWT_EXPIRES_MINUTES` y variables del limitador; actualizar `.env.example`.
  **Hecho cuando:** `test_config` cubre «sin `JWT_SECRET` o muy corta → no arranca». *Depende de T-002.*

- [x] **T-004 · H · Generar `JWT_SECRET` y añadirlo al `.env`**
  Un valor para dev local; otro distinto para prod (solo en el servicio de despliegue).
  **Hecho cuando:** `.env` local lo contiene. *Depende de T-003.*

## Fase B — Backend

- [x] **T-005 · A · Seguridad: hash de contraseñas y JWT** (RNF-001, RNF-002, RF-011)
  `core/security.py`: `hash_password`, `verify_password` (con hash señuelo), `create_access_token`, `decode_access_token`. Medir tiempo de hash.
  **Hecho cuando:** `test_security` pasa (incl. token manipulado y vencido). *Depende de T-003.*

- [x] **T-006 · A · Repositorio de usuarios** (RF-001, RF-003, RF-016)
  Añadir a `Repository`: `create_user`, `get_user_by_email`, `get_user_by_id`; implementar en memoria y en Supabase; `UserAlreadyExists` ante la restricción `UNIQUE`.
  **Hecho cuando:** pruebas del repositorio en memoria pasan y las de integración contra `dev` (marca `integration`) pasan. *Depende de T-005.*

- [x] **T-007 · A · Esquemas Pydantic** (RF-001, RF-002, RF-004, RF-005)
  `schemas/auth.py`: `RegisterIn`, `LoginIn`, `UserOut`, `TokenOut`; normalización de correo; longitud de contraseña 8–128; zona horaria válida o `America/Bogota`.
  **Hecho cuando:** pruebas de validación pasan.

- [x] **T-008 · A · Limitador de intentos** (RF-009)
  `core/rate_limit.py`: interfaz `AttemptLimiter` + versión en memoria con reloj inyectable; claves `(correo, IP)`; límite de registros por IP.
  **Hecho cuando:** `test_rate_limit` pasa (bloqueo y liberación con reloj simulado). *Depende de T-003.*

- [x] **T-009 · A · `POST /auth/register`** (RF-001…RF-006)
  Endpoint, manejo del 409 por concurrencia, respuesta con token y usuario.
  **Hecho cuando:** `test_auth_register` pasa. *Depende de T-005, T-006, T-007, T-008.*

- [x] **T-010 · A · `POST /auth/login`** (RF-007, RF-008, RF-009)
  Endpoint con mensaje genérico, hash señuelo, 429 con `Retry-After`.
  **Hecho cuando:** `test_auth_login` pasa. *Depende de T-009.*

- [x] **T-011 · A · `get_current_user`, `GET /auth/me` y lista blanca de rutas públicas** (RF-012, RF-013, RF-016)
  `api/deps.py`; aplicar la dependencia a todo router salvo auth y health.
  **Hecho cuando:** `test_auth_protected` pasa, incluido el recorrido de rutas contra la lista blanca. *Depende de T-009.*

- [x] **T-012 · A · Prueba de aislamiento y de fugas** (RF-016, RNF-001, RNF-003)
  `test_isolation` (dos usuarios; se amplía en 002) y `test_no_leaks` (respuestas y logs).
  **Hecho cuando:** ambas pasan. *Depende de T-011.*

## Fase C — Frontend

- [x] **T-013 · A · Enrutado y cliente HTTP** (RF-012, RF-014)
  `react-router-dom`; `AuthProvider`, `storage.ts` (con `try/catch`), cliente `fetch` con Bearer y manejo de 401; `ProtectedRoute`, `PublicOnlyRoute`.
  **Hecho cuando:** pruebas de rutas y de `AuthProvider` pasan (sesión válida, vencida, almacenamiento bloqueado). *Depende de T-011; T-001 para la política de almacenamiento.*

- [x] **T-014 · A · Pantalla `/login`** (RF-007, RF-017…RF-020)
  Conforme a `UX/Iniciar sesión.png`; errores junto al campo; botón deshabilitado al enviar; aviso de servidor despertando.
  **Hecho cuando:** pruebas de formulario pasan y la pantalla coincide con el diseño en modo claro y oscuro (revisión del humano). *Depende de T-013.*

- [x] **T-015 · A · Pantalla `/registro`** (RF-001…RF-006, RF-017…RF-020)
  Conforme a `UX/Crear cuenta.png`; zona horaria detectada; mensaje «Usa al menos 8 caracteres» y errores del servidor.
  **Hecho cuando:** pruebas de formulario pasan y coincide con el diseño. *Depende de T-013.*

- [x] **T-016 · A · Página protegida mínima y cierre de sesión** (RF-010, RF-015)
  `CalendarPlaceholder` en `/calendario` con el correo del usuario y «Cerrar sesión».
  **Hecho cuando:** CA-9, CA-11 y CA-13 verificados en pruebas. *Depende de T-013.*

## Fase D — Validación y cierre

- [x] **T-017 · A · Prueba E2E de registro → cerrar sesión → iniciar sesión** (CA-1, CA-6, CA-9)
  Playwright contra backend en memoria o contra `dev` (decisión: ver Q de 000). Si no se instala Playwright aún, se difiere a 002 y se anota.
  **Hecho cuando:** el flujo pasa en local.

- [ ] **T-018 · A · Revisión de accesibilidad y modo oscuro** (RNF-005, RF-020)
  Teclado, foco visible, contraste, `aria-live`, áreas ≥ 44 px, ambos temas.
  **Hecho cuando:** lista de revisión completada y el humano aprueba.

- [ ] **T-019 · H · Validación final de la feature** (todos)
  Recorrer el Checklist de `spec.md`; probar manualmente con dos cuentas; aprobar. Actualizar `AGENT.md` («Feature activa» → 002).
  **Hecho cuando:** checklist completo y aprobación del humano.

## Fase E — Diseño móvil (enmienda 2026-11-08) — APLAZADA por el humano: no se implementa por ahora

- [ ] **T-020 · A · Login móvil / Android** (RF-017, RF-020)
  Implementar la cabecera compacta de `UX/UX-Movil/Android Iniciar sesión.png` para pantallas de menos de 900 px: componente `AuthHeaderCompact` (marca + botón de tema, titular, texto corto y cita), formulario con botón a todo el ancho, pie; sin cambios en escritorio. Pruebas de interfaz y captura con Playwright a 390 × 844 en claro y oscuro, comparada con el diseño.
  **Hecho cuando:** la captura coincide con el diseño y las pruebas de login siguen en verde. *Depende de que el humano apruebe la enmienda.*

## Orden sugerido

`T-001` (en paralelo a `T-002 → T-003 → T-004`) → `T-005 → T-006/T-007/T-008 → T-009 → T-010 → T-011 → T-012` → `T-013 → T-014/T-015/T-016` → `T-017 → T-018 → T-019`.

## Trazabilidad RF → tareas

| RF | Tareas |
|----|--------|
| RF-001, RF-002 | T-006, T-007, T-009 |
| RF-003 | T-006, T-009 |
| RF-004 | T-007, T-009 |
| RF-005 | T-007, T-009, T-015 |
| RF-006 | T-009, T-015 |
| RF-007 | T-010, T-014 |
| RF-008 | T-005, T-010 |
| RF-009 | T-001, T-008, T-010 |
| RF-010 | T-016 |
| RF-011 | T-005, T-011 |
| RF-012 | T-011, T-013 |
| RF-013 | T-011 |
| RF-014 | T-013, T-016 |
| RF-015 | T-016 |
| RF-016 | T-006, T-011, T-012 |
| RF-017…RF-020 | T-014, T-015, T-018 |

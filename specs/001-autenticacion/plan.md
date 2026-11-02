# 001 — Autenticación · Plan técnico

> **Estado:** BORRADOR — pendiente de aprobación humana (Fase 3: Planificar). Depende de `spec.md` aprobada y de la feature 000 terminada.
> Respeta `specs/constitution.md`. Los valores marcados «propuesta» dependen de las Clarificaciones de `spec.md`.

## 1. Decisiones de arquitectura

| # | Decisión | Motivo | Cubre |
|---|----------|--------|-------|
| D-1 | **Autenticación propia** en FastAPI; **no** Supabase Auth | Constitución §3.1 | RF-001…RF-016 |
| D-2 | **Hash de contraseñas con Argon2id** (paquete `argon2-cffi`; alternativa `bcrypt` si no instala en Python 3.14) | RNF-001; Argon2 es el estándar recomendado | RNF-001 |
| D-3 | **JWT HS256** firmado con `JWT_SECRET` (paquete `PyJWT`), con `sub` = `user_id`, `iat`, `exp` | Constitución §10 | RF-011, RF-013, RNF-002 |
| D-4 | Sin refresco ni revocación en v1; el cierre de sesión descarta el token en el cliente | Alcance mínimo (Q-2, Q-3) | RF-010, RF-011 |
| D-5 | **Token Bearer** en la cabecera `Authorization`; almacenamiento en el cliente según Q-1 (propuesta A, ver §6) | Constitución fija Bearer | RF-012, Q-1 |
| D-6 | Dependencia FastAPI `get_current_user` aplicada a **todo** router salvo auth y health (lista blanca explícita) | Evita proteger «por olvido» | RF-013, RF-016 |
| D-7 | **Limitador de intentos** tras una interfaz `AttemptLimiter` con implementación **en memoria** | Simplicidad; Render duerme y reinicia (limitación documentada) | RF-009 |
| D-8 | Verificación de login con **tiempo constante aproximado**: si el correo no existe, se verifica contra un hash señuelo | Anti-enumeración | RF-008 |
| D-9 | Correo con validación de formato por `pydantic.EmailStr` (paquete `email-validator`) | Validación de entrada | RF-002 |
| D-10 | Zona horaria validada contra la base IANA (`zoneinfo`; en Windows requiere el paquete `tzdata`) | Cumple RF-005 | RF-005 |
| D-11 | Frontend: **React Router**, `AuthProvider` (contexto) y un cliente `fetch` que añade el Bearer y, ante 401, cierra sesión local y redirige a `/login` | Flujo único de sesión | RF-012, RF-014 |

**Riesgos de dependencias en Python 3.14:** verificar en T-001 que `argon2-cffi`, `PyJWT` y `email-validator` instalan. Si `argon2-cffi` falla, usar `bcrypt` (documentarlo en un ADR).

## 2. Estructura de archivos afectada

```
backend/app/
├── api/
│   ├── auth.py                # POST /auth/register, POST /auth/login, GET /auth/me
│   ├── deps.py                # get_current_user, get_client_ip
│   └── router.py              # (existente) incluir auth y proteger el resto
├── core/
│   ├── security.py            # hash/verify de contraseñas, creación/decodificación de JWT
│   └── rate_limit.py          # AttemptLimiter (Protocol) + InMemoryAttemptLimiter
├── db/
│   ├── base.py                # (existente) añadir métodos de usuarios
│   ├── supabase_repository.py # implementar usuarios
│   └── memory_repository.py   # implementar usuarios
├── schemas/auth.py            # Pydantic: RegisterIn, LoginIn, UserOut, TokenOut
backend/tests/
├── test_auth_register.py
├── test_auth_login.py
├── test_auth_protected.py
├── test_isolation.py
├── test_security.py
└── test_rate_limit.py
app/src/
├── auth/                      # AuthProvider, useAuth, storage.ts, api client
├── pages/Login.tsx, Register.tsx
├── routes/ProtectedRoute.tsx, PublicOnlyRoute.tsx
└── pages/CalendarPlaceholder.tsx   # página protegida mínima (se reemplaza en 002)
```

No hay migración nueva: `users` ya existe (000). Si Q-4/Q-5/Q-10 requieren tabla (p. ej., intentos persistentes), se agregaría una migración nueva y se actualizaría esta sección.

## 3. Variables de entorno nuevas

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `JWT_SECRET` | **Sí** desde 001 (≥ 32 bytes aleatorios) | Firma del JWT; si falta o es corta, el servidor no arranca |
| `JWT_EXPIRES_MINUTES` | No (propuesta 10080 = 7 días) | Duración de la sesión |
| `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MINUTES`, `LOGIN_LOCK_MINUTES` | No (propuesta 5 / 15 / 15) | Límite de intentos |
| `REGISTER_MAX_PER_HOUR_PER_IP` | No (propuesta 10) | Límite de registros |

Generar `JWT_SECRET` con `python -c "import secrets; print(secrets.token_urlsafe(48))"` y distinto en dev y prod.

## 4. Contratos de API (prefijo `/api/v1`)

### `POST /auth/register` (público)
```json
// petición
{ "email": "ana@correo.com", "password": "mínimo 8 caracteres", "timezone": "America/Bogota" }
// 201
{ "access_token": "<jwt>", "token_type": "bearer",
  "user": { "id": "<uuid>", "email": "ana@correo.com", "timezone": "America/Bogota" } }
```
Errores: `422 validation_error` (correo inválido, contraseña < 8 o > 128), `409 email_already_registered`, `429 too_many_requests`. `timezone` es opcional; si falta o es inválida se guarda `America/Bogota`.

### `POST /auth/login` (público)
```json
// petición
{ "email": "ana@correo.com", "password": "…" }
// 200  (misma forma que el registro)
```
Errores: `401 invalid_credentials` («Correo o contraseña incorrectos»), `429 too_many_attempts` (cabecera `Retry-After` y `retry_after_seconds` en el mensaje), `422 validation_error`.

### `GET /auth/me` (protegido)
`200 { "id", "email", "timezone" }`. Lo usa el frontend al abrir la app para validar la sesión (RF-012).

### Cierre de sesión
No hay endpoint: el cliente descarta el token (D-4).

### Códigos nuevos
`email_already_registered` (409), `invalid_credentials` (401), `unauthorized` (401, sin token/inválido/vencido), `too_many_attempts` (429), `too_many_requests` (429). Todos en el formato `{ "error": { "code", "message" } }`.

### Seguridad de las respuestas
- Nunca se devuelve `password_hash`.
- El token no se registra en logs.
- `GET /health` y las rutas de auth son las **únicas** públicas (constitución §3.2); una prueba recorre todas las rutas registradas y verifica que, salvo la lista blanca, exigen Bearer.

## 5. Lógica de seguridad

- **Registro:** `email.strip().lower()` → validar → hash Argon2id → `INSERT` (la unicidad la garantiza la restricción `UNIQUE` de la base; capturar el conflicto → 409 aunque dos peticiones lleguen a la vez).
- **Login:** si el limitador bloquea la clave `(email_normalizado, ip)` → 429. Buscar usuario; si no existe, verificar contra hash señuelo; si falla, registrar intento fallido y devolver 401. Éxito: limpiar intentos y emitir JWT.
- **IP del cliente:** detrás del proxy de Render se usa `X-Forwarded-For` (primer elemento fiable) solo cuando `APP_ENV=prod`; en local, la IP del socket. Documentar.
- **Token:** `jwt.decode` con `algorithms=["HS256"]`, validando `exp`; rechazar si `sub` no es un uuid o el usuario ya no existe (401).
- **CORS:** solo orígenes de `CORS_ORIGINS`; `allow_credentials=False` (Bearer, sin cookies).
- **Cabeceras:** el backend añade `X-Content-Type-Options: nosniff`; la CSP del frontend se define en 000/002 al desplegar.

## 6. Almacenamiento del token — C-6 / Q-1 (decisión a aprobar)

| Opción | Web | Android | Pros | Contras |
|--------|-----|---------|------|---------|
| **A (propuesta)** | `localStorage` con `try/catch` | Almacenamiento seguro del dispositivo (Keystore) vía plugin de Capacitor (verificar plugin gratuito en 005) | Coherente con `Authorization: Bearer`; frontend/backend en orígenes distintos; simple | Un XSS podría leer el token en web |
| B | Cookie `HttpOnly; Secure; SameSite=None` | Igual de compleja en WebView | Token no legible desde JS | Contradice la regla Bearer; CORS con credenciales; difícil entre orígenes y en Capacitor |

**Mitigaciones de A:** sin `dangerouslySetInnerHTML`, entradas escapadas por React, CSP estricta al desplegar, token con vencimiento corto-medio (Q-2), sin librerías de terceros innecesarias. **Recomendación:** A.

## 7. Frontend

- Rutas: `/login` y `/registro` (públicas, `PublicOnlyRoute`), `/calendario` (protegida, `ProtectedRoute`), `/` redirige según sesión. Ruta desconocida → `/`.
- `AuthProvider`: al montar, si hay token → `GET /auth/me`; mientras responde, pantalla de carga (con aviso «Despertando el servidor…» pasado un umbral, p. ej. 3 s).
- Formularios con `label` real, validación en cliente (correo con formato; contraseña ≥ 8) y errores del servidor mapeados a mensajes en español por `code`.
- Zona horaria: `Intl.DateTimeFormat().resolvedOptions().timeZone` enviada en el registro; el texto «Zona horaria detectada: …» la muestra.
- Pantallas fieles a `UX/Iniciar sesión.png` y `UX/Crear cuenta.png`, con tokens de 000; botón de tema en cada una. Panel izquierdo oculto en pantallas angostas (la barra lateral/el panel de marca pasa arriba o se oculta; no existe diseño móvil: U-2).
- Los estados de error/carga sin diseño (U-4) usan texto bajo el campo con el color de error de los tokens y `aria-live`.
- `CalendarPlaceholder`: página protegida mínima que muestra el correo y «Cerrar sesión», para poder validar la gate de 001 antes de 002.

## 8. Dependencias nuevas (todas gratuitas / de código abierto)

- Python: `argon2-cffi`, `PyJWT`, `email-validator`, `tzdata` (zonas horarias en Windows).
- Frontend: `react-router-dom`.

## 9. Estrategia de pruebas

Cada prueba cita su `RF-xxx` o `CA-x`.

| Prueba | Cubre |
|--------|-------|
| `test_security`: hash ≠ contraseña, verifica correcta/incorrecta, JWT firma/vencimiento/manipulado | RNF-001, RNF-002, CA-12, CA-17 |
| `test_auth_register`: correcto, normalización, 409 (mayúsculas distintas), contraseña corta/larga, correo inválido, zona inválida→Bogotá, registro simultáneo | RF-001…RF-006, CA-1…CA-5 |
| `test_auth_login`: correcto, mensaje idéntico para correo inexistente y contraseña errónea, insensible a mayúsculas | RF-007, RF-008, CA-6, CA-7 |
| `test_rate_limit`: N fallos → 429 aunque la contraseña sea correcta; se libera tras la ventana (reloj simulado) | RF-009, CA-8 |
| `test_auth_protected`: sin token / manipulado / vencido / usuario inexistente → 401; recorrido de rutas verifica la lista blanca | RF-011, RF-013, CA-10, CA-12 |
| `test_isolation`: dos usuarios; A no puede leer/modificar recursos de B (se amplía en 002 con tareas) | RF-016, CA-14 |
| `test_no_leaks`: respuestas y logs sin contraseña/hash/token | CA-17 |
| Frontend: formularios (validación y mensajes), `ProtectedRoute`/`PublicOnlyRoute`, `AuthProvider` (válida/vencida/storage bloqueado), no doble envío | RF-012, RF-014, RF-018, RF-019, CA-9, CA-11, CA-13, CA-15, CA-16 |
| E2E (Playwright, diferible a 002): registro → logout → login | CA-1, CA-9, CA-6 |

Cobertura mínima 70 % en `core/security.py`, `core/rate_limit.py` y `api/auth.py`.

## 10. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Limitador en memoria se reinicia cuando Render duerme/reinicia | Documentado; aceptable en v1; migración posterior a tabla persistente si hace falta |
| Varias instancias de servidor (no aplica en el plan gratuito) | Una instancia; se revisa si se escala |
| Token robado de `localStorage` por XSS | Mitigaciones de §6; vencimiento acotado |
| `JWT_SECRET` filtrado | Rotación = invalida todas las sesiones; documentar procedimiento |
| Enumeración por 409 en registro | Aceptado (Q-9) + límite de registros (Q-10) |
| Hash Argon2 pesado en plan gratuito de Render (CPU/memoria) | Parámetros moderados y medición en T-005; ajustar costo si hay timeouts |

## 11. Trazabilidad RF → componente

| RF | Componente |
|----|-----------|
| RF-001…RF-006 | `api/auth.py` (register), `schemas/auth.py`, `core/security.py`, `db/*users` |
| RF-007, RF-008, RF-009 | `api/auth.py` (login), `core/rate_limit.py` |
| RF-010, RF-011 | cliente (`auth/storage.ts`), `core/security.py` (exp) |
| RF-012, RF-014 | `AuthProvider`, `ProtectedRoute`, `PublicOnlyRoute`, `GET /auth/me` |
| RF-013, RF-016 | `api/deps.py` (`get_current_user`), lista blanca, `test_auth_protected`, `test_isolation` |
| RF-015 | `CalendarPlaceholder` (luego barra lateral de 002) |
| RF-017…RF-020 | `Login.tsx`, `Register.tsx`, tokens de 000 |

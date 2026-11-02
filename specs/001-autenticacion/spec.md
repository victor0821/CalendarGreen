# 001 — Autenticación

> **Estado:** BORRADOR — pendiente de aprobación humana (Fase 1: Especificar).
> Describe **qué** y **por qué**, sin tecnología (la tecnología está en `plan.md`). Depende de 000.

## Contexto y problema

CalendarGreen es un espacio **privado**: cada persona solo ve sus tareas. Hoy no existe forma de crear una cuenta, identificarse ni impedir que alguien sin sesión (o con la sesión de otra persona) vea datos ajenos. Esta feature entrega cuentas con correo y contraseña, inicio y cierre de sesión, y una zona de calendario protegida, para que 002 y siguientes se construyan sobre un usuario autenticado.

No incluye verificación de correo ni recuperación de contraseña (fuera de v1 por requerir un servicio de correo).

## Historias de usuario

- **HU-1.** Como **visitante**, quiero crear una cuenta con solo correo y contraseña y entrar directo a mi calendario, para empezar sin pasos extra.
- **HU-2.** Como **usuario**, quiero iniciar sesión con mi correo y contraseña, para ver mi calendario y mis tareas.
- **HU-3.** Como **usuario**, quiero que la aplicación recuerde mi sesión al volver a abrirla, para no escribir mis datos a cada visita.
- **HU-4.** Como **usuario**, quiero cerrar sesión, para que nadie más use mi cuenta en un dispositivo compartido.
- **HU-5.** Como **visitante**, quiero que sin sesión no se vea nada del calendario, para que mis datos y los de otros estén protegidos.
- **HU-6.** Como **usuario**, quiero que mis tareas nunca sean visibles ni modificables por otra persona, para tener privacidad.
- **HU-7.** Como **usuario**, quiero mensajes claros en español cuando algo sale mal (correo repetido, contraseña corta, datos incorrectos), para saber cómo corregirlo.

## Requisitos funcionales

### Registro
- **RF-001 — Crear cuenta.** El visitante se registra con **correo** y **contraseña**. No se pide nombre, confirmación de contraseña ni otros datos.
- **RF-002 — Normalización del correo.** El correo se limpia de espacios y se guarda en minúsculas; debe tener formato de correo válido.
- **RF-003 — Correo único.** Si ya existe una cuenta con ese correo, el registro se rechaza con un error de conflicto (409) y un mensaje claro.
- **RF-004 — Contraseña mínima.** La contraseña debe tener **al menos 8 caracteres**. (Máximo 128; ver Q-5.)
- **RF-005 — Zona horaria.** Al registrarse se guarda la zona horaria detectada del navegador del usuario; si no se puede detectar o no es válida, se usa `America/Bogota`. La pantalla de registro la muestra (informativa).
- **RF-006 — Entrar al registrarse.** Tras un registro correcto, la persona queda con sesión iniciada y se la lleva a `/calendario`.

### Inicio y cierre de sesión
- **RF-007 — Iniciar sesión.** El usuario inicia sesión con correo (sin distinguir mayúsculas) y contraseña; si es correcto, entra a `/calendario`.
- **RF-008 — Error genérico.** Si el correo o la contraseña son incorrectos, el mensaje es siempre el mismo: «Correo o contraseña incorrectos». Nunca revela si el correo existe, ni en el texto ni en el tiempo de respuesta apreciable.
- **RF-009 — Límite de intentos.** Tras varios intentos fallidos desde el mismo correo y/o dirección, el inicio de sesión se bloquea temporalmente con un mensaje que indica cuánto esperar. (Cifras en Q-4.)
- **RF-010 — Cerrar sesión.** El usuario puede cerrar sesión desde el enlace «Cerrar sesión» de la barra lateral; tras hacerlo, se le lleva a `/login` y no puede volver a ver el calendario sin autenticarse de nuevo.
- **RF-011 — Sesión con vencimiento.** La sesión caduca tras un tiempo definido (Q-2). Al caducar, el siguiente acceso lleva a `/login` con un aviso claro.

### Zona protegida
- **RF-012 — Validación al abrir.** Al abrir la aplicación, se comprueba si la sesión guardada sigue siendo válida: si lo es, se muestra `/calendario`; si no, `/login`.
- **RF-013 — Rutas protegidas.** Todo recurso del sistema, salvo registro, inicio de sesión y estado del servicio, exige sesión válida. Sin sesión, con sesión inválida o vencida, responde 401.
- **RF-014 — Redirecciones.** Un visitante que intenta abrir `/calendario` (o cualquier ruta protegida) es llevado a `/login`. Un usuario con sesión válida que abre `/login` o `/registro` es llevado a `/calendario`.
- **RF-015 — Identidad visible.** La barra lateral del calendario muestra «Sesión iniciada como **correo**» y el enlace «Cerrar sesión» (pantallas de 002; aquí se entrega la información de sesión).
- **RF-016 — Aislamiento entre usuarios.** Toda consulta de datos usa la identidad de la sesión; ningún usuario ve ni modifica datos de otro. (Se prueba con dos usuarios.)

### Interfaz
- **RF-017 — Pantallas de acceso.** `/login` y `/registro` siguen el diseño de `UX/` (dos mitades, panel de marca y formulario), en español, con enlace cruzado entre ellas.
- **RF-018 — Validación en el formulario.** Los campos muestran su error junto al campo en español, antes y después de enviar (correo inválido, contraseña corta, correo repetido, credenciales incorrectas, demasiados intentos). Los errores son anunciables por lectores de pantalla.
- **RF-019 — Estado de envío.** Mientras se envía, el botón principal queda deshabilitado y muestra progreso, para evitar envíos dobles; si el servidor está «despertando» (puede tardar), se informa.
- **RF-020 — Tema.** Ambas pantallas tienen botón de modo claro/oscuro y respetan los tokens de marca.

## Requisitos no funcionales

- **RNF-001 — Seguridad de contraseñas.** Se almacenan solo con un hash robusto (Argon2 o bcrypt); jamás en texto, en registros ni en respuestas.
- **RNF-002 — Seguridad de la sesión.** La sesión usa un token firmado con vencimiento; el secreto de firma solo existe en el entorno del backend.
- **RNF-003 — Registros sin datos sensibles.** Los logs no contienen contraseñas, tokens ni correos completos de intentos fallidos más allá de lo estrictamente necesario.
- **RNF-004 — Protección OWASP.** Mitigación de fuerza bruta (RF-009), enumeración de usuarios (RF-008), inyección y XSS (entradas validadas, salida escapada) e IDOR (RF-016).
- **RNF-005 — Accesibilidad.** WCAG 2.1 AA: `label` real por campo, áreas táctiles ≥ 44 px, contraste ≥ 4.5:1, foco visible, orden de tabulación lógico, `aria-label` en el botón de tema.
- **RNF-006 — Privacidad.** Se guarda solo lo necesario (correo, hash, zona horaria). Cumplimiento de la normativa aplicable pendiente de confirmar (Q-7).
- **RNF-007 — Rendimiento.** El registro y el inicio de sesión responden en pocos segundos una vez despierto el servidor.

## Pantallas de UX relacionadas

- `UX/Iniciar sesión.png` (alias `01-login`) — `/login`.
- `UX/Crear cuenta.png` (alias `02-registro`) — `/registro`.
- Descripciones en `UX/README.md` §3. **Sin diseño:** estados de error, estado de carga, mostrar/ocultar contraseña, aviso de sesión vencida, modo oscuro y versión móvil (`UX/README.md` §4: U-3, U-4, U-8, U-11). Hasta que existan, se aplican los patrones mínimos de RF-018/RF-019 con los tokens de marca, sin inventar nuevos elementos visuales de marca.

## Criterios de aceptación

- **CA-1 (RF-001, RF-006).** *Dado* un visitante en `/registro`, *cuando* envía un correo válido y una contraseña de 8+ caracteres, *entonces* se crea la cuenta, queda con sesión iniciada y ve `/calendario`.
- **CA-2 (RF-002).** *Dado* `  Ana@Correo.COM `, *cuando* se registra, *entonces* se guarda `ana@correo.com`; *y cuando* inicia sesión con `ANA@correo.com`, *entonces* entra.
- **CA-3 (RF-003).** *Dado* un correo ya registrado (en cualquier combinación de mayúsculas), *cuando* se intenta registrar otra vez, *entonces* responde 409 con mensaje claro y no se crea otra cuenta.
- **CA-4 (RF-004).** *Dado* una contraseña de 7 caracteres, *cuando* se envía, *entonces* se rechaza con el mensaje «Usa al menos 8 caracteres» junto al campo.
- **CA-5 (RF-005).** *Dado* un navegador en `America/Bogota`, *cuando* se registra, *entonces* la zona guardada es `America/Bogota`; *y dado* una zona inválida o ausente, *entonces* se guarda `America/Bogota`.
- **CA-6 (RF-007).** *Dado* una cuenta existente, *cuando* inicia sesión con datos correctos, *entonces* entra a `/calendario`.
- **CA-7 (RF-008).** *Dado* un correo inexistente o una contraseña errónea, *cuando* se intenta iniciar sesión, *entonces* el mensaje es idéntico en ambos casos: «Correo o contraseña incorrectos».
- **CA-8 (RF-009).** *Dado* el número de intentos fallidos máximo, *cuando* se hace uno más, *entonces* se bloquea con 429 indicando el tiempo de espera, incluso con la contraseña correcta.
- **CA-9 (RF-010).** *Dado* un usuario con sesión, *cuando* pulsa «Cerrar sesión», *entonces* llega a `/login` y al navegar hacia atrás o abrir `/calendario` vuelve a `/login`.
- **CA-10 (RF-011).** *Dado* una sesión vencida, *cuando* se hace cualquier petición protegida, *entonces* responde 401 y la interfaz lleva a `/login` con aviso.
- **CA-11 (RF-012).** *Dado* una sesión válida guardada, *cuando* se reabre la aplicación, *entonces* se muestra `/calendario` sin pedir credenciales.
- **CA-12 (RF-013).** *Dado* una petición sin token, con token manipulado o vencido a un recurso protegido, *entonces* responde 401 con el formato de error de 000.
- **CA-13 (RF-014).** *Dado* un visitante, *cuando* abre `/calendario`, *entonces* termina en `/login`; *y dado* un usuario con sesión, *cuando* abre `/registro`, *entonces* termina en `/calendario`.
- **CA-14 (RF-016).** *Dado* dos usuarios A y B, *cuando* A intenta leer o modificar un dato de B (por identificador), *entonces* recibe «no encontrado» y B no se ve afectado.
- **CA-15 (RF-018, RNF-005).** *Dado* un correo mal escrito, *cuando* se envía, *entonces* el error aparece junto al campo, en español, y se anuncia por lectores de pantalla.
- **CA-16 (RF-019).** *Dado* un envío en curso, *cuando* se pulsa de nuevo el botón, *entonces* no se envía una segunda petición.
- **CA-17 (RNF-001, RNF-003).** *Dado* cualquier flujo, *cuando* se inspeccionan respuestas y logs, *entonces* no aparecen contraseñas ni hashes.

## Casos límite y errores

- Correo con espacios, mayúsculas, caracteres unicode o muy largo (> 254): se normaliza o se rechaza con mensaje claro.
- Contraseña de solo espacios, muy larga (> 128) o con caracteres especiales/emoji: se acepta o rechaza por reglas explícitas (Q-5), nunca se trunca en silencio.
- Registro simultáneo del mismo correo (dos envíos a la vez): solo uno tiene éxito; el otro recibe 409 (la unicidad la garantiza la base).
- Servidor dormido o base pausada: mensaje «Despertando el servidor, un momento…» y, si falla, error 503 claro (de 000).
- Sin conexión: el formulario conserva lo escrito y muestra «Sin conexión».
- Token manipulado o de otro usuario: 401.
- Usuario eliminado pero con token vigente: 401.
- Almacenamiento del navegador bloqueado (privado): la aplicación funciona con una sesión que dura hasta cerrar la pestaña, o avisa (Q-1).
- El usuario cambia de zona horaria de dispositivo después de registrarse: la zona guardada no cambia automáticamente (Q-6).

## Fuera de alcance

- Verificación de correo, recuperación o cambio de contraseña, cambio de correo, eliminación de cuenta.
- Inicio de sesión con Google u otros proveedores, autenticación en dos pasos.
- Cierre de sesión en **todos** los dispositivos / revocación de tokens (Q-3).
- Sesión «recordarme» configurable, gestión de dispositivos, roles de administrador.
- Edición de la zona horaria del perfil.
- Almacenamiento seguro nativo en Android (se concreta en 005; aquí se decide la política en Q-1).

## Clarificaciones (preguntas abiertas y decisiones)

| ID | Pregunta | Estado / propuesta |
|----|----------|--------------------|
| Q-1 | **Dónde se guarda la sesión en web y en Android** (C-6). Opciones: (A) token Bearer en el almacenamiento del navegador (web) y almacenamiento seguro del dispositivo (Android); (B) cookie `HttpOnly`. La constitución fija `Authorization: Bearer`, y el frontend y el backend estarán en orígenes distintos. | Abierta · propuesta A (ver `plan.md` §6) |
| Q-2 | **Duración de la sesión** y si existe renovación. | Abierta · propuesta: 7 días, sin renovación en v1 |
| Q-3 | **Cierre de sesión:** ¿basta con descartar el token en el dispositivo (sin invalidación en el servidor)? | Abierta · propuesta: sí (mismo alcance que Q-2) |
| Q-4 | **Límite de intentos:** cantidad, ventana y bloqueo. | Abierta · propuesta: 5 fallos / 15 min por (correo + IP); bloqueo 15 min |
| Q-5 | **Reglas de contraseña:** máximo de longitud (propuesta 128), ¿se exige variedad de caracteres? | Abierta · propuesta: solo 8–128, sin otras reglas (coherente con `AGENT.md`) |
| Q-6 | **Zona horaria editable:** ¿el usuario puede cambiarla luego? Hoy el diseño solo la muestra. | Abierta · propuesta: no en 001; se pide diseño si se quiere |
| Q-7 | **Normativa de datos personales** (C-7): ¿aplica la Ley 1581 de 2012 (Colombia)? Implicaría aviso de privacidad y consentimiento en el registro (**sin diseño**). | Abierta |
| Q-8 | **Diseño de errores, carga, modo oscuro y sesión vencida** (U-3, U-4, U-11). | Abierta · pedir al humano o aprobar patrón mínimo |
| Q-9 | **Registro y enumeración:** el 409 por correo repetido revela que el correo existe (inevitable sin verificación de correo). ¿Se acepta? | Abierta · propuesta: aceptar, mitigado con límite de intentos de registro |
| Q-10 | **Límite de registros** por IP para evitar abuso (cifras). | Abierta · propuesta: 10 cuentas/hora/IP |
| Q-11 | **Redirección tras login:** ¿siempre a `/calendario` o a la ruta que se intentaba abrir? | Abierta · propuesta: `/calendario` |
| Q-12 | **Almacenamiento bloqueado en el navegador** (ver casos límite): ¿degradar o avisar? | Abierta |

## Checklist de validación

- [ ] CA-1 a CA-17 verificados.
- [ ] Pantallas implementadas conforme a `Iniciar sesión.png` y `Crear cuenta.png`, en modo claro y oscuro.
- [ ] Prueba con dos usuarios (aislamiento) en verde.
- [ ] Ninguna contraseña, hash ni token en logs o respuestas indebidas.
- [ ] Contraseñas almacenadas solo como hash.
- [ ] Rutas protegidas devuelven 401 sin sesión.
- [ ] Accesibilidad básica revisada (teclado, lector de pantalla, contraste).
- [ ] Q-1 a Q-12 resueltas o diferidas por escrito.

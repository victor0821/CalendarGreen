# 000 — Cimientos

> **Estado:** APROBADO por el humano (2026-11-02) (Fase 1: Especificar).
> Describe **qué** debe existir y **por qué**, sin tecnología (la tecnología está en `plan.md`).

## Contexto y problema

CalendarGreen todavía no tiene una base sobre la cual construir: no hay servidor, ni base de datos con su esquema inicial, ni frontend, ni forma de saber si el sistema está vivo. Antes de construir autenticación (001) y calendario (002) se necesita una base mínima, segura y verificable, con **entornos separados de desarrollo y producción**, secretos fuera del repositorio y un esquema inicial que ya garantice el aislamiento entre usuarios.

Esta feature **no entrega funcionalidad al usuario final**; entrega confianza: que el sistema arranca, se conecta a su base de datos, falla de forma clara y puede probarse en local.

## Historias de usuario

Los roles aquí son de quien construye y opera el proyecto (el humano), no del usuario final.

- **HU-1.** Como persona que desarrolla, quiero arrancar el servidor y comprobar con una sola consulta que está vivo y conectado a su base de datos, para saber que el entorno funciona.
- **HU-2.** Como persona que desarrolla, quiero que desarrollo y producción estén separados, para no dañar datos reales al probar.
- **HU-3.** Como persona que desarrolla, quiero un esquema inicial de datos con aislamiento por usuario ya activo, para que las siguientes features nazcan seguras.
- **HU-4.** Como persona que desarrolla, quiero que los secretos nunca estén en el repositorio y que la configuración falte con un mensaje claro, para no filtrar claves ni perder tiempo diagnosticando.
- **HU-5.** Como persona que desarrolla, quiero una base de interfaz (claro/oscuro, tipografías y colores de marca), para que 001 y 002 construyan pantallas consistentes con `UX/`.
- **HU-6.** Como persona que desarrolla, quiero ejecutar pruebas y revisión de estilo en local con un comando, para validar cambios sin depender de CI.

## Requisitos funcionales

- **RF-001 — Verificación de estado.** El sistema ofrece una consulta pública de estado que informa si el servicio está activo y si la base de datos responde. No exige sesión y no revela datos sensibles ni versiones internas.
- **RF-002 — Error claro si la base no responde.** Si la base de datos no está disponible, la consulta de estado responde con un error de servicio no disponible (503) y un mensaje claro; el resto del sistema no expone trazas.
- **RF-003 — Configuración solo por entorno.** Toda la configuración sensible (claves de la base, de Gemini, del JWT) se toma de variables de entorno. Si falta una variable obligatoria, el sistema no arranca y dice **cuál** falta (sin imprimir valores).
- **RF-004 — Plantilla de configuración.** Existe un archivo de ejemplo de variables **sin valores** que lista todas las variables esperadas y cuáles son obligatorias.
- **RF-005 — Entornos separados.** Existen dos entornos de datos, `dev` y `prod`. La máquina local usa **siempre `dev`**; `prod` solo se configura en el servicio de despliegue. Las pruebas nunca se conectan a `prod`.
- **RF-006 — Esquema inicial.** Existe un esquema inicial con al menos las entidades *usuario* y *tarea*, con fechas con zona horaria, claves, índices y aislamiento por usuario (seguridad a nivel de fila activada, **sin** acceso directo para clientes públicos). La tarea pertenece a exactamente un usuario.
- **RF-007 — Migraciones versionadas y reversibles.** El esquema se define en migraciones SQL versionadas en el repositorio; cada una incluye cómo revertirla y es idempotente cuando sea posible.
- **RF-008 — Registro de migraciones.** Existe un registro donde el humano anota qué migración se aplicó y cuándo, en `dev` y en `prod`.
- **RF-009 — Formato de error consistente.** Todo error de la API tiene la forma `{ "error": { "code", "message" } }` con un código estable y un mensaje en español; nunca expone trazas ni detalles internos.
- **RF-010 — Acceso a datos desacoplado.** Todo acceso a datos pasa por una capa propia con una versión en memoria para pruebas; las rutas y el agente no dependen del proveedor de base de datos.
- **RF-011 — Base de interfaz.** Existe una aplicación web mínima que arranca, aplica los colores y tipografías de marca mediante variables y permite alternar entre modo claro y oscuro, recordando la preferencia del usuario en ese navegador.
- **RF-012 — Pruebas y estilo en local.** Con comandos documentados se ejecutan las pruebas y la revisión de estilo del backend y del frontend; ambas terminan en verde sobre la base entregada.
- **RF-013 — Comandos documentados.** El `README.md` de la raíz documenta cómo instalar, configurar `.env`, arrancar y probar el proyecto.
- **RF-014 — Sin secretos en el repositorio.** `.env` y cualquier credencial están excluidos del control de versiones; no hay valores reales en ningún archivo versionado.
- **RF-015 — Integración continua.** Cada PR y cada cambio a `main` ejecuta automáticamente las pruebas y la revisión de estilo del backend y del frontend (sin las de integración contra Supabase ni credenciales de la base); el resultado es visible en el PR.
- **RF-016 — Repositorio protegido.** El repositorio remoto tiene `main` protegida: los cambios entran por PR con la integración continua en verde.

## Requisitos no funcionales

- **RNF-001 — Gratuidad.** Ningún componente de esta feature requiere pago ni tarjeta; los límites de los planes gratuitos usados se anotan con fecha de verificación en el `plan.md`.
- **RNF-002 — Seguridad.** La clave de rol de servicio de la base solo existe en el entorno del backend; nunca en el frontend ni en logs.
- **RNF-003 — Observabilidad básica.** Los registros del servidor son estructurados, sin datos sensibles.
- **RNF-004 — Reproducibilidad.** Una persona nueva puede levantar el proyecto en local siguiendo el `README.md` sin pasos no documentados.
- **RNF-005 — Disponibilidad.** *Best effort*: el servidor gratuito puede dormir y la base gratuita puede pausarse tras una semana sin actividad; la verificación de estado debe indicar el fallo con claridad (RF-002).

## Pantallas de UX relacionadas

Ninguna pantalla funcional. Se usan solo los **tokens de marca** y las decisiones vigentes de `UX/README.md` §2 (colores, tipografías, modo oscuro).

## Criterios de aceptación

- **CA-1 (RF-001).** *Dado* el servidor en marcha y la base disponible, *cuando* se consulta el estado sin credenciales, *entonces* responde 200 indicando servicio y base «ok».
- **CA-2 (RF-002).** *Dado* que la base no responde, *cuando* se consulta el estado, *entonces* responde 503 con `{ "error": { "code", "message" } }` y sin trazas.
- **CA-3 (RF-003).** *Dado* que falta una variable obligatoria, *cuando* se arranca el servidor, *entonces* termina con un mensaje que nombra la variable faltante y no imprime ningún valor.
- **CA-4 (RF-004, RF-014).** *Dado* el repositorio, *cuando* se busca cualquier valor real de clave en archivos versionados, *entonces* no existe, y existe un archivo de ejemplo sin valores.
- **CA-5 (RF-005).** *Dado* el `.env` local, *cuando* se consulta el estado, *entonces* la conexión es a `dev`; ninguna prueba automática usa credenciales de `prod`.
- **CA-6 (RF-006, RF-007).** *Dado* la migración inicial aplicada en `dev`, *cuando* se inspeccionan las tablas, *entonces* *usuarios* y *tareas* existen con seguridad a nivel de fila activada y sin políticas para `anon` ni `authenticated`; *y cuando* se ejecuta el bloque de reversión en un entorno de prueba, *entonces* el esquema vuelve al estado anterior.
- **CA-7 (RF-006).** *Dado* el esquema inicial, *cuando* se intenta crear una tarea sin usuario, *entonces* la base la rechaza.
- **CA-8 (RF-008).** *Dado* una migración aplicada en `dev`, *cuando* el humano termina, *entonces* hay una fila en el registro con archivo y fecha.
- **CA-9 (RF-009).** *Dado* cualquier error de la API, *cuando* se inspecciona la respuesta, *entonces* tiene la forma `{ "error": { "code", "message" } }` en español.
- **CA-10 (RF-010).** *Dado* las pruebas del backend, *cuando* se ejecutan, *entonces* usan la versión en memoria de la capa de datos y no necesitan internet.
- **CA-11 (RF-011).** *Dado* el frontend en marcha, *cuando* se pulsa el botón de tema, *entonces* los colores cambian entre claro y oscuro; *y cuando* se recarga, *entonces* se conserva la elección.
- **CA-12 (RF-012).** *Dado* el proyecto recién configurado, *cuando* se ejecutan los comandos de prueba y estilo, *entonces* terminan sin errores.
- **CA-14 (RF-015, RF-016).** *Dado* un PR con un cambio que rompe una prueba, *cuando* corre la integración continua, *entonces* falla y el PR no se puede integrar a `main`; *y dado* un PR sano, *entonces* pasa en verde sin usar secretos de la base.
- **CA-13 (RF-013, RNF-004).** *Dado* una persona sin contexto, *cuando* sigue el `README.md`, *entonces* logra arrancar backend y frontend en local.

## Casos límite y errores

- Base de datos **pausada** por inactividad (plan gratuito): estado 503 con mensaje que indica que puede estar pausada.
- Base de datos **lenta**: la verificación de estado tiene un tiempo máximo de espera (valor en `plan.md`) y responde 503, no se queda colgada.
- Variable de entorno presente pero **vacía**: se trata como faltante.
- Migración repetida: no debe fallar ni duplicar objetos (idempotencia).
- Clave equivocada (`anon` en lugar de rol de servicio): la verificación debe fallar con error claro, no con datos parciales.
- Preferencia de tema no disponible (navegador privado/sin almacenamiento): la interfaz sigue funcionando y usa la preferencia del sistema.

## Fuera de alcance

- Autenticación y cuentas (001), tareas y calendario (002), agente y voz (003/004), Android y recordatorios (005).
- Despliegue del frontend (ver Clarificaciones).
- Monitoreo de errores con servicio externo (C-8).
- Diseño móvil.

## Clarificaciones (preguntas abiertas y decisiones)

| ID | Pregunta | Estado |
|----|----------|--------|
| Q-1 | **Hosting del frontend** (C-4): Cloudflare Pages o GitHub Pages. Con repositorio remoto ambos son posibles. | Abierta · propuesta: Cloudflare Pages (gratuito, soporta repositorio privado) |
| Q-2 | **Despliegue del backend en Render** (C-9): ya habrá repositorio remoto. Falta confirmar si Render instala con `uv` o necesita Dockerfile, y qué versión de Python admite. | Abierta |
| Q-9 | **Repositorio remoto** (C-3): proveedor (se asume GitHub), **visibilidad pública o privada** (Render y Cloudflare Pages admiten ambas en el plan gratuito), nombre, y renombrar la rama local `master` a `main`. Quien publica código público debe revisar antes el historial en busca de secretos. | Abierta · propuesta: privado |
| Q-10 | **Qué corre en CI:** las pruebas unitarias y el estilo, sin secretos de Supabase; las de integración (contra `dev`) quedan solo locales. ¿De acuerdo? | Abierta · propuesta: sí |
| Q-11 | **Entorno de producción:** variables de `prod` configuradas en Render, nunca en el repositorio; ¿el frontend de producción apunta a la URL de Render? | Abierta |
| Q-3 | **Python 3.14 en Render y en las dependencias** (C-9): hay que verificarlo en la fase de planificación. Si algún paquete no lo soporta, ¿se acepta bajar la versión? (Contradiría la constitución: requeriría enmienda.) | Abierta |
| Q-4 | **Monitoreo de errores** (C-8): ¿se difiere a una feature posterior? | Abierta (propuesta: diferir) |
| Q-5 | **Creación de proyectos Supabase `dev` y `prod`**: acción del humano; ¿ya existen? Hay que registrar región y los nombres exactos `calendargreen-dev` y `calendargreen-prod`. | Abierta |
| Q-6 | **Mantener despierto el sistema:** `AGENT.md` §11 menciona un «ping gratuito periódico». ¿Se incluye en 000 o se difiere hasta tener algo desplegado? | Abierta (propuesta: diferir) |
| Q-7 | **Prototipo existente** en `backend/app/agent/` (`main.py`, `config.py`, `tools.py`): ¿se conserva tal cual hasta la feature 003? `config.py` admite varios proveedores de modelo, pero la constitución fija Gemini. | Abierta (propuesta: no tocarlo en 000) |
| Q-8 | **`README.md` de la raíz** está vacío: se completará aquí (RF-013). | Decidida |

## Checklist de validación

- [ ] CA-1 a CA-14 verificados.
- [ ] Repositorio remoto creado, `main` protegida y CI en verde en el primer PR.
- [ ] `/health` responde en local y con `dev` conectado.
- [ ] Migración inicial aplicada en `dev`, probada y luego aplicada en `prod`, ambas anotadas en `supabase/MIGRATIONS.md`.
- [ ] Sin secretos en archivos versionados.
- [ ] Pruebas y estilo en verde en local (backend y frontend).
- [ ] `README.md` permite levantar el proyecto desde cero.
- [ ] Clarificaciones Q-1 a Q-11 resueltas o conscientemente diferidas.

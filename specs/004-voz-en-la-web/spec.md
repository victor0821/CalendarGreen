# 004 — Voz en la web

> **Estado:** APROBADO por el humano (2026-11), con sus clarificaciones Q-1 a Q-10 resueltas (Fase 1: Especificar).
> Describe **qué** y **por qué**, sin tecnología (la tecnología está en `plan.md`). Depende de 003 (panel del asistente, tarjeta de propuesta y agente).

## Contexto y problema

Con 003 la persona escribe una frase y un agente con herramientas la atiende: agenda, consulta, modifica o elimina tareas, siempre con la confirmación de la persona. Esta feature agrega lo que da nombre al producto: **dictar la tarea con la voz** en el navegador de escritorio. El audio se convierte en texto con el reconocimiento de voz del propio navegador; ese texto entra al **mismo flujo** de 003 (agente → propuesta → confirmar). No hay un segundo agente ni una segunda lógica: solo cambia cómo se obtiene el texto.

Reglas que se mantienen (constitución P2, P3, P4, P5): el usuario siempre confirma; nada se guarda sin confirmación; todo es gratuito; y la persona debe saber qué se envía a terceros.

## Historias de usuario

- **HU-1.** Como **usuario**, quiero tocar un micrófono y **decir** mi tarea, para agendar sin escribir.
- **HU-2.** Como **usuario**, quiero **ver lo que el sistema entendió** mientras hablo y poder **corregirlo** antes o después de que se interprete.
- **HU-3.** Como **usuario**, quiero que mi dictado llegue a la **mismas respuestas y acciones** que el texto (consultar, agendar, modificar o eliminar, con confirmación).
- **HU-4.** Como **usuario**, quiero saber **cuándo me está escuchando** y poder **detenerlo**.
- **HU-5.** Como **usuario**, quiero entender qué hacer si **no hay micrófono, negué el permiso o mi navegador no admite voz**, sin quedar bloqueado: siempre puedo **escribir**.
- **HU-6.** Como **usuario**, quiero saber que **el audio puede enviarse a un servicio de voz del navegador**, para decidir con conocimiento.
- **HU-7.** Como **usuario**, quiero que las tareas creadas con mi voz queden marcadas con el **ícono de micrófono** en el calendario.

## Requisitos funcionales

### Entrada de voz
- **RF-001 — Botón de micrófono.** En la barra de comando (003, RF-001) aparece, junto al botón de enviar, el botón circular verde de micrófono del diseño, con nombre accesible «Dictar una tarea». Al activarse, comienza la escucha.
- **RF-002 — Permiso.** La primera vez, el navegador pide permiso de micrófono. Si se concede, la escucha empieza; si se niega, se muestra una explicación clara de cómo habilitarlo y la persona puede seguir escribiendo.
- **RF-003 — Escuchando.** Mientras escucha, el botón cambia de aspecto y el panel muestra «**Escuchando…**» (anunciado a lectores de pantalla). La transcripción **parcial** aparece en vivo en el campo de texto.
- **RF-004 — Fin del dictado.** La escucha termina sola al detectar una pausa, al tocar de nuevo el botón (detener), al cerrar el panel o tras **30 segundos**. El dictado dura una sola frase (no es continuo).
- **RF-005 — Transcripción editable.** Al terminar, el texto final queda en el campo «**Lo que dijiste (puedes corregirlo)**» del panel de 003, editable.
- **RF-006 — Interpretación automática.** Al terminar el dictado con texto no vacío, se envía **automáticamente** al agente (003). Si la persona corrige el texto y lo reenvía (Enter o el botón de enviar), se interpreta de nuevo; cada envío cuenta para el tope diario de 003 (RF-020).
- **RF-007 — Estado «Te escuché».** Tras el dictado, el panel muestra «**Te escuché** · Toca el micrófono para dictar de nuevo.» y el botón queda disponible para volver a dictar.
- **RF-008 — Idioma.** El reconocimiento es en **español** (variante de Colombia, con alternativa genérica en español si el navegador no la ofrece).
- **RF-009 — Origen de la tarea.** Aplica a las tareas **agendadas** (modificar o eliminar no cambian el origen). Si una tarea agendada se confirma a partir de un texto que **vino del dictado** (aunque la persona lo haya corregido), se guarda con origen `voice` y se ve con el **ícono de micrófono**. Si el último texto enviado fue **escrito**, el origen es `text`.

### Compatibilidad y degradación
- **RF-010 — Sin soporte.** Si el navegador no ofrece reconocimiento de voz, el botón de micrófono **no se muestra** o aparece deshabilitado con una explicación («Tu navegador no admite dictado; escribe tu tarea»). La escritura funciona igual.
- **RF-011 — Aviso de privacidad.** Junto al micrófono o en el panel se informa que «**el audio puede enviarse al servicio de voz de tu navegador**» (`AGENT.md` §10). Complementa el aviso de 003 sobre el texto enviado a Google (Gemini).
- **RF-012 — Errores del reconocimiento.** Se distinguen y explican en español: **no se oyó nada**, **no hay micrófono o está ocupado**, **permiso denegado o bloqueado**, **sin conexión o servicio de voz no disponible**, **idioma no admitido** y **dictado interrumpido**. Cada mensaje dice qué hacer (reintentar, revisar permisos, escribir).
- **RF-013 — Cancelar.** Cerrar el panel o pulsar Esc **detiene** la escucha y descarta lo dictado; no se envía nada al agente.
- **RF-014 — Sin audio guardado.** La aplicación **no graba ni guarda audio**; solo recibe el texto que entrega el navegador.
- **RF-015 — Cuota o tope.** Si al enviar el dictado el asistente responde tope diario o cuota agotada, se aplica el flujo de 003 (RF-031): formulario manual con el aviso amarillo y **el texto dictado conservado**.
- **RF-016 — Un solo dictado a la vez.** No se puede empezar a escuchar mientras el agente interpreta ni mientras hay otra escucha en curso.

### Interfaz
- **RF-017 — Compatibilidad objetivo.** Funciona de extremo a extremo en **Chrome y Edge de escritorio** (compuerta de `AGENT.md` §13). Otros navegadores: según su soporte, con la degradación de RF-010.
- **RF-018 — Accesibilidad.** El botón es alcanzable con teclado y expresa su estado (`aria-pressed`); los cambios de estado («Escuchando…», «Te escuché», errores) se anuncian; hay siempre una alternativa escrita; el contraste y el tema claro/oscuro se respetan.
- **RF-020 — Todo lo del agente, por voz.** Todo lo que el agente de 003 hace por texto (consultar la agenda, agendar, modificar, eliminar) se puede pedir por voz, con **las mismas tarjetas y la misma confirmación**; la voz no agrega permisos ni salta confirmaciones.
- **RF-019 — Reemplazable.** El reconocimiento se usa a través de una **interfaz propia**, para que la app Android (005) lo sustituya por el reconocimiento nativo sin tocar el resto.

## Requisitos no funcionales

- **RNF-001 — Gratuidad.** Solo se usa el reconocimiento del navegador (sin costo ni tarjeta); ningún servicio de voz de pago.
- **RNF-002 — Privacidad.** No se almacena audio; el texto sigue las reglas de 003 (sin registros de contenido). El aviso de RF-011 es visible.
- **RNF-003 — Rendimiento.** La transcripción parcial aparece con retraso imperceptible; el inicio de la escucha tarda menos de 1 segundo tras el permiso.
- **RNF-004 — Robustez.** Ningún error del reconocimiento deja la interfaz bloqueada ni el micrófono abierto.
- **RNF-005 — Pruebas.** La lógica se prueba sin micrófono con un reconocedor simulado; la prueba con voz real se hace a mano en Chrome y Edge.
- **RNF-006 — Español.** Textos y mensajes en español.

## Pantallas de UX relacionadas

- `UX/Asistente de voz confirmar.png` (alias `05-asistente-voz`): el panel completo (estado «Te escuché», campo «Lo que dijiste (puedes corregirlo)», tarjeta de propuesta) y el botón de micrófono verde de la barra de comando.
- `UX/Calendario Mes.png`, `Calendario Semana.png`, `Calendario Día.png`: barra de comando con el micrófono.
- `UX/Nueva tarea manual límite de Gemini.png`: aviso amarillo (flujo de RF-015).
- **Sin diseño** (`UX/README.md`, U-15 y nuevos): estado **«escuchando»** (aspecto del botón y del panel), **permiso denegado**, **sin micrófono**, **sin soporte del navegador**, errores del reconocimiento, transcripción parcial (U-24), versión móvil (U-2). Mientras no existan, se aplican patrones mínimos con los tokens de marca, sin inventar elementos visuales nuevos.

## Criterios de aceptación

- **CA-1 (RF-001, RF-003).** *Dado* un navegador compatible, *cuando* se toca el micrófono, *entonces* el botón cambia de aspecto, el panel dice «Escuchando…» y se anuncia a lectores de pantalla.
- **CA-2 (RF-002).** *Dado* la primera vez, *cuando* el navegador pide permiso y se concede, *entonces* empieza la escucha; *y cuando* se niega, *entonces* aparece la explicación de cómo habilitarlo y el campo de texto sigue disponible.
- **CA-3 (RF-003).** *Dado* que la persona habla, *entonces* la transcripción parcial se ve en vivo y es reemplazada por el texto final.
- **CA-4 (RF-004).** *Dado* que la persona se calla, *entonces* la escucha termina sola; *y dado* que toca de nuevo el botón mientras escucha, *entonces* se detiene; *y pasados 30 segundos*, *entonces* se detiene.
- **CA-5 (RF-005, RF-006).** *Dado* el dictado «llamar a mi hermano mañana a las 3 de la tarde», *cuando* termina, *entonces* el texto queda editable en «Lo que dijiste (puedes corregirlo)» y se envía solo al agente, que muestra una tarjeta «Agendar» (003).
- **CA-6 (RF-006).** *Dado* una propuesta, *cuando* la persona corrige el texto y pulsa Enter, *entonces* se interpreta de nuevo y la propuesta se actualiza.
- **CA-7 (RF-007).** *Dado* que terminó el dictado, *entonces* el panel muestra «Te escuché · Toca el micrófono para dictar de nuevo.» y el botón permite dictar otra vez.
- **CA-8 (RF-009).** *Dado* una propuesta nacida de un dictado, *cuando* se confirma, *entonces* la tarea queda con origen `voice` y se ve con el ícono de micrófono en mes, semana y día; *y dado* una propuesta nacida de texto escrito, *entonces* el origen es `text`.
- **CA-9 (RF-009).** *Dado* un dictado que la persona luego **borra y reescribe a mano** antes de enviar, *entonces* el origen es `text`.
- **CA-10 (RF-010).** *Dado* un navegador sin reconocimiento de voz, *entonces* no hay micrófono operativo, se explica por qué y la escritura funciona.
- **CA-11 (RF-011).** *Dado* el panel o la barra, *entonces* se informa que el audio puede enviarse al servicio de voz del navegador.
- **CA-12 (RF-012).** *Dado* cada error del reconocimiento (sin voz, sin micrófono, permiso denegado, sin conexión, idioma no admitido, interrupción), *entonces* se muestra su mensaje específico en español y la interfaz queda utilizable.
- **CA-13 (RF-013).** *Dado* una escucha en curso, *cuando* se cierra el panel o se pulsa Esc, *entonces* se detiene, no se envía nada y el micrófono se libera.
- **CA-14 (RF-014).** *Dado* cualquier dictado, *cuando* se inspecciona el tráfico y el almacenamiento de la aplicación, *entonces* no se envía ni guarda audio, solo texto.
- **CA-15 (RF-015).** *Dado* que el asistente responde tope diario o cuota agotada al enviar un dictado, *entonces* se abre el formulario con el aviso amarillo y el texto dictado conservado.
- **CA-16 (RF-016).** *Dado* que el agente está interpretando, *cuando* se toca el micrófono, *entonces* no inicia una nueva escucha.
- **CA-17 (RF-017).** *Dado* Chrome y Edge de escritorio con micrófono real, *cuando* se dicta una frase, *entonces* el flujo completo (escuchar → texto → propuesta → confirmar → tarea en el calendario) funciona.
- **CA-18 (RF-018).** *Dado* el teclado y un lector de pantalla, *entonces* el micrófono se opera y sus estados se anuncian; y todo funciona en modo claro y oscuro.
- **CA-20 (RF-020).** *Dado* el dictado «¿qué tengo el lunes?», *entonces* el asistente responde con la agenda y no propone acciones; *y dado* «borra la reunión con Pedro», *entonces* aparece una tarjeta «Eliminar» y **no se borra nada** hasta pulsar «Confirmar».
- **CA-19 (RF-019).** *Dado* que se sustituye el reconocedor por uno simulado, *entonces* todo el flujo sigue funcionando (la interfaz no depende de una API concreta).

## Casos límite y errores

- **Varias frases seguidas** o una frase muy larga: el dictado termina por pausa o a los 30 s; si el texto pasa de 500 caracteres (límite de 003) se avisa y queda editable.
- **Ruido sin palabras** o **transcripción vacía**: «no se oyó nada», sin llamar al agente.
- **Mala transcripción** («recuérdame» → «recuerdame»; números mal oídos): por eso el texto es editable y la propuesta muestra cómo se entendió.
- **Permiso bloqueado de forma permanente:** la explicación indica dónde cambiarlo en el navegador.
- **Micrófono en uso por otra aplicación** o **sin dispositivo de entrada**: mensaje específico.
- **Sin conexión:** el reconocimiento de Chrome y Edge usa un servicio en línea; se informa y se ofrece escribir.
- **Pestaña en segundo plano** o **cambio de pestaña** durante la escucha: la escucha se detiene sin enviar.
- **Dos pestañas** de CalendarGreen: cada una gestiona su propio micrófono; el navegador decide cuál lo obtiene.
- **Página sin conexión segura:** el reconocimiento exige HTTPS (`localhost` cuenta como seguro); en un despliegue sin HTTPS el micrófono no estará disponible y se aplica RF-010.
- **Doble toque rápido** en el micrófono: una sola escucha.
- **Sesión vencida** durante el dictado: se lleva a `/login` como en 001.

## Fuera de alcance

- **Android y reconocimiento nativo** (005); este se conecta mediante la interfaz de RF-019.
- **Dictado continuo**, palabra de activación («oye CalendarGreen»), comandos de voz para navegar y **respuestas habladas** (síntesis de voz).
- **Otros idiomas**, reconocimiento sin conexión y grabación o descarga de audio.
- Consultas de agenda por voz (006).

## Clarificaciones (preguntas abiertas y decisiones)

| ID | Pregunta | Estado / propuesta |
|----|----------|--------------------|
| Q-1 | **Envío automático al terminar de hablar** (como sugiere el diseño, que muestra transcripción y propuesta a la vez) o esperar a que la persona confirme el texto. | **Decidida (2026-11, por el humano):** **automático**; corregir y reenviar es explícito (RF-006) |
| Q-2 | **Límite de 30 s** por dictado y detección de pausa del navegador. | **Decidida (2026-11, por el humano):** sí |
| Q-3 | **Idioma:** `es-CO` con alternativa `es`. | **Decidida (2026-11, por el humano):** sí |
| Q-4 | **Origen `voice` si el texto se corrigió** (RF-009). | **Decidida (2026-11, por el humano):** sí, `voice` mientras el texto venga del dictado |
| Q-5 | **Diseño de estados** (escuchando, permiso denegado, sin micrófono, sin soporte, errores, transcripción parcial): U-15, U-24. | **Decidida:** patrón mínimo con tokens hasta que exista el diseño (U-24) |
| Q-6 | **Navegadores:** compuerta Chrome y Edge de escritorio. ¿Safari y Firefox solo con degradación? Firefox no ofrece reconocimiento y Safari lo ofrece con limitaciones. | **Decidida (2026-11, por el humano):** degradación elegante |
| Q-7 | **Despliegue con HTTPS:** el micrófono lo exige; Cloudflare Pages lo da. | **Decidida:** se confirma al desplegar (feature 000, T-021); Cloudflare Pages ofrece HTTPS |
| Q-8 | **Aviso de privacidad del audio:** dónde y con qué texto (¿en el panel o antes del primer uso?). | **Decidida (2026-11, por el humano):** línea fija en el panel y explicación al denegar permiso |
| Q-9 | **Sonido o vibración** al empezar/terminar. | **Decidida (2026-11, por el humano):** no |
| Q-10 | **Botón «Detener»** explícito durante la escucha además de volver a tocar el micrófono. | **Decidida (2026-11, por el humano):** el mismo botón cambia a «detener» |

## Checklist de validación

- [ ] CA-1 a CA-20 verificados.
- [ ] **Compuerta:** dictado de extremo a extremo en **Chrome y Edge de escritorio** con micrófono real (anotar versiones y fecha).
- [ ] Prueba de los errores principales a mano (permiso denegado, sin micrófono, sin conexión, silencio).
- [ ] Ningún audio se envía ni se guarda por la aplicación.
- [ ] Reconocedor simulado: el flujo completo funciona.
- [ ] Pantallas conformes a `UX/`, en claro y oscuro; accesibilidad revisada.
- [ ] Q-1 a Q-10 resueltas o diferidas por escrito.

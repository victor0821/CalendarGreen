# UX — Diseños de CalendarGreen

> **Estado:** BORRADOR — redactado a partir de las imágenes de esta carpeta; pendiente de revisión humana. **Actualizado el 2026-11-08** (formulario de tarea rediseñado y primer diseño móvil).
> Esta carpeta es la **fuente de verdad visual y de flujo** (`AGENT.md` §3). Los datos de los mockups (correos, tareas, fechas) son ejemplos, no requisitos.
> Los diseños son de **escritorio (web)**, salvo `UX-Movil/Android Iniciar sesión.png`, el único diseño móvil por ahora. El resto de pantallas móviles sigue pendiente (U-2).

## 1. Índice de pantallas

| Archivo real | Alias (`AGENT.md` §3) | Pantalla | Ruta | Spec | Estado |
|--------------|-----------------------|----------|------|------|--------|
| `Iniciar sesión.png` | `01-login` | Iniciar sesión | `/login` | 001 | Diseñada |
| `Crear cuenta.png` | `02-registro` | Crear cuenta | `/registro` | 001 | Diseñada |
| `Calendario Mes.png` | `03-calendario-mes` | Calendario, vista mes | `/calendario` | 002 | Diseñada |
| `Calendario Semana.png` | `04-calendario-semana` | Calendario, vista semana | `/calendario` | 002 | Diseñada |
| `Asistente de voz confirmar.png` | `05-asistente-voz` | Asistente de voz: transcripción y propuesta | `/calendario` (panel lateral) | 003 / 004 | Diseñada |
| `Nueva tarea manual límite de Gemini.png` | `06-tarea-manual` | Nueva tarea manual (con aviso de límite de Gemini). **Rediseñada el 2026-11-08**: horas de inicio y final, tarea a repetir y notificar | `/tareas/nueva` | 002 (formulario) y 003 (aviso) | Diseñada (v2) |
| `Calendario Día.png` | `07-calendario-dia` | Calendario, vista día (con panel «Tareas del día») | `/calendario` | 002 | Diseñada |
| `UX-Movil/Android Iniciar sesión.png` | `08-android-login` | Iniciar sesión, versión móvil / Android | `/login` (pantallas angostas) | 001 (diseño) y 005 (Android) | Diseñada |
| — | — | Resto de pantallas móviles / Android (registro, calendario, formularios, asistente de voz) | — | 002, 005 | **Pendiente de diseñar** |

Los archivos conservan su nombre original. Las specs los citan por **nombre real** y, entre paréntesis, por alias. Renombrarlos a la forma numerada es decisión del humano (si se hace, se actualiza esta tabla).

## 2. Decisiones de diseño vigentes

(De `AGENT.md` §3; se repiten aquí para tenerlas junto a los diseños.)

- **Marca:** tema verde. Principal `#1B7F4C` (hover `#146B3F`), verde profundo `#0E3B26`, fondo claro `#F4F7F2`, tinte `#E1F1E7`. Logo: hoja dentro de un cuadrado verde redondeado + «CalendarGreen».
- **Modo oscuro (obligatorio):** fondo `#0D1712`, superficies `#15231B`, texto `#E6F2EA`, enlaces `#7FD3A1`. Con variables CSS (tokens), nunca colores fijos en componentes. Botón para alternar (luna) presente en todas las pantallas.
- **Tipografía:** Bricolage Grotesque (títulos) y DM Sans (texto).
- **Idioma:** español; horas en 12 h con «a. m.» y «p. m.»; semana que empieza en **lunes**.
- **Calendario:** día actual resaltado; tareas completadas tachadas y atenuadas; las creadas por voz llevan ícono de micrófono.
- **Asistente de voz:** transcripción editable → tarjeta «Propuesta» → «Confirmar y guardar», «Editar en el formulario», «Cancelar». Nada se guarda hasta confirmar; en el calendario la propuesta es un bloque punteado.
- **Límite de Gemini agotado:** aviso amarillo en el formulario manual que conserva lo dicho.
- **Accesibilidad:** controles reales (`button`, `a`, `input` con `label`), áreas táctiles ≥ 44 px, contraste ≥ 4.5:1, `aria-label` en botones solo con ícono.

## 3. Descripción por pantalla (lo que muestra cada imagen)

### 01 · Iniciar sesión (`Iniciar sesión.png`) — ruta `/login`
- **Diseño dividido en dos mitades.** Izquierda: panel verde profundo con logo, titular «Dilo en voz alta. CalendarGreen lo agenda.», texto de apoyo («Tu calendario propio: dices qué, cuándo y a qué hora, revisas la propuesta y confirmas con un toque.»), una tarjeta de ejemplo (cita «Recuérdame llamar al dentista el viernes a las 3 de la tarde» + mini-tarjeta «PROPUESTA · Llamar al dentista · viernes 6 de noviembre · 3:00 p. m.») y el pie «Gratis y privado: tus tareas solo las ves tú.»
- **Derecha:** botón circular de modo oscuro (arriba), título «Inicia sesión», subtítulo «Entra para ver tu calendario y tus tareas.», campos **Correo** (placeholder `tu@correo.com`) y **Contraseña** (placeholder «Tu contraseña»), botón primario «Entrar a mi calendario» y enlace «¿Aún no tienes cuenta? **Crear cuenta**».
- **No se muestran:** estado de error, estado de carga, mostrar/ocultar contraseña, «olvidé mi contraseña» (fuera de v1).

### 02 · Crear cuenta (`Crear cuenta.png`) — ruta `/registro`
- Misma estructura dividida. Panel izquierdo: titular «Tu calendario, tu espacio privado.» y tres puntos con marca de verificación: «Crea tareas hablando o escribiendo, en español.», «Siempre confirmas antes de que algo se guarde.», «Recordatorios en tu teléfono Android.»
- **Derecha:** título «Crea tu cuenta», subtítulo «Solo necesitas un correo y una contraseña. Entrarás directo a tu calendario.», **Correo**, **Contraseña** (placeholder «Mínimo 8 caracteres», ayuda «Usa al menos 8 caracteres.»), aviso informativo con ícono de reloj «Zona horaria detectada: **America/Bogota**» (solo informativo; no se ve cómo cambiarla), botón «Crear cuenta y entrar» y enlace «¿Ya tienes cuenta? **Inicia sesión**».
- **No se muestran:** errores (correo repetido, contraseña corta, correo inválido), confirmación de contraseña (no existe), estado de carga.

### 03 · Calendario, vista mes (`Calendario Mes.png`) — ruta `/calendario`
- **Barra lateral izquierda:** logo; botón primario «+ Nueva tarea»; ítem activo «Calendario»; sección «**HOY · SÁB 31 OCT**» con las tareas del día como casillas (hora en negrita + título; la completada aparece marcada); abajo, «Sesión iniciada como **tu@correo.com**», enlace «Cerrar sesión» y botón «Modo oscuro».
- **Cabecera:** título «Octubre 2026», flechas anterior/siguiente, botón «Hoy», y conmutador **Mes | Semana** a la derecha.
- **Cuadrícula:** encabezados LUN–DOM; seis filas posibles; los días de otros meses (28–30 de sep y 1 de nov) en tono atenuado; **hoy** (31) con círculo verde sobre el número y la celda resaltada. Cada tarea es una «píldora» con hora y título truncado («9:00 a. m. Reunión c…»). Máximo **dos** visibles por celda; el resto se resume como «**+1 más**» (28 oct). Completadas: tachadas y en gris. Con micrófono: tareas creadas por voz.
- **Barra inferior de comando:** campo «Escribe o di una tarea: «llamar al dentista el viernes a las 3 de la tarde»» con botón de enviar (flecha) y botón de micrófono verde. *Pertenece a 003/004.*

### 04 · Calendario, vista semana (`Calendario Semana.png`) — ruta `/calendario`
- Misma barra lateral y cabecera; título «26 oct – 1 nov 2026»; conmutador con **Semana** activo.
- **Cuadrícula horaria:** 7 columnas (LUN 26 … DOM 1) con el número del día; eje vertical de horas «6 a. m. … 7 p. m.»; **hoy** con la columna resaltada y el número en círculo verde; **línea de hora actual** (punto + línea oscura) sobre la columna de hoy; los bloques ocupan la altura de su duración (p. ej., «Almuerzo familiar 1:00 p. m.» ocupa dos franjas). Completadas tachadas; con micrófono las de voz.
- **No se ve:** qué pasa con horas fuera del rango visible (antes de las 6 a. m. / después de las 7 p. m.), cómo se ven tareas solapadas, desplazamiento vertical.

### 05 · Asistente de voz (`Asistente de voz confirmar.png`) — panel sobre `/calendario`
- **Barra lateral colapsada** a íconos (logo, +, calendario, luna, cerrar sesión). Calendario en vista semana con el rótulo «**Vista previa de la propuesta**» junto al título.
- **Panel derecho «Asistente de voz»** con botón de cerrar (×): estado «**Te escuché** · Toca el micrófono para dictar de nuevo.»; campo «Lo que dijiste (puedes corregirlo)» con la transcripción editable («Recuérdame llamar a mi hermano mañana a las 3 de la tarde»); tarjeta «**PROPUESTA**» con **Título** editable («Llamar a mi hermano»), fecha («domingo 1 de noviembre de 2026»), hora y duración («3:00 p. m. · **1 hora**») y la explicación «Entendí «mañana» como domingo 1 de noviembre, porque hoy es sábado 31 de octubre.»; botones «✓ Confirmar y guardar» (primario), «Editar en el formulario» y enlace «Cancelar»; pie «Nada se guarda hasta que confirmes.»
- En el calendario, la propuesta aparece como bloque **punteado** en el domingo 1, a las 3 p. m.
- **No se ve:** estado «escuchando» (grabando), estado de pregunta de aclaración del agente, error de micrófono/permiso, panel sin soporte de voz.

### 06 · Nueva tarea manual (`Nueva tarea manual límite de Gemini.png`) — ruta `/tareas/nueva`
- Barra lateral completa (igual que el calendario). Enlace «‹ Volver al calendario» y título «Nueva tarea».
- **Aviso amarillo** (ícono de advertencia): «**El asistente de voz llegó a su límite de hoy.** Puedes crear la tarea aquí ahora mismo o volver a intentarlo con la voz más tarde. Guardamos lo que dijiste para que no lo pierdas:» + la transcripción entre comillas.
- **Formulario** (tarjeta blanca), en este orden:
  1. **Título** (`Llamar a mi hermano`).
  2. Fila de tres campos: **Fecha** (selector de calendario, `01/11/2026`), **Hora de inicio** (lista desplegable, `12:00 a. m.`) y **Hora final** (lista desplegable, `12:30 a. m.`). *Sustituyen a «Hora» (selector de reloj) y «Duración».*
  3. **Tarea a repetir** (lista desplegable; en la imagen, «Personalizado»). Con «Personalizado» aparecen siete botones circulares **L M X J V S D**: los elegidos van rellenos de verde (L, M, X y V) y los demás con borde. Debajo, un resumen: «Se repetirá cada lunes, martes, miércoles y viernes, de 12:00 a. m. a 12:30 a. m..»
  4. **Notas (opcional)**.
  5. Casilla «**Notificar**» marcada, con la ayuda «La notificación se programa en el dispositivo y funciona sin conexión.» Al marcarla aparece una fila con una lista de números (`15`), una lista de unidades (`minutos`) y el texto «antes», y un resumen: «Te avisaremos 15 minutos antes de las 12:00 a. m..» *Sustituye a «Recordarme en mi teléfono Android a la hora de la tarea».*
  6. Botón «✓ Guardar tarea» y enlace «Cancelar».
- Sin el aviso amarillo, es el formulario de «Nueva tarea» normal (uso 002); el aviso es de 003/004.
- **No se ve:** errores de validación, versión de **edición** de una tarea existente (ni cómo se muestra la repetición al editar), botón de borrar (ni cómo se borra una serie), las **opciones** de «Tarea a repetir» (solo se ve «Personalizado»; no se ve si existe «No se repite»), el rango de las listas de números y de unidades, y el aspecto de los botones L–V en modo oscuro.
- **Detalle del diseño:** los resúmenes del mockup terminan en «a. m..» con dos puntos (el de la abreviatura y el de la frase). Se tratan como un descuido: en pantalla se escribe un solo punto (U-19).

### 07 · Calendario, vista día (`Calendario Día.png`) — ruta `/calendario`
- Misma barra lateral y barra de comando inferior. Cabecera: título «Sábado 31 de octubre 2026», flechas, «Hoy» y conmutador **Mes | Semana | Día** (Día activo).
- **Columna del día** (tintada por ser hoy) con eje de horas «6 a. m. … 7 p. m.», línea de hora actual y bloques con título y **rango horario** («Revisar informe 10:00 – 11:00 a. m.», tachado y atenuado por completado; «Llamar a mamá 6:00 – 6:30 p. m.»).
- **Panel derecho «Tareas del día»** con «2 tareas · 1 hecha»: tarjetas con casilla, título y rango; la completada, tachada. Debajo, nota punteada «Tu tiempo libre: antes de las 10:00 a. m., de 11:00 a. m. a 6:00 p. m. y después de las 6:30 p. m.»
- **No se ve:** día sin tareas, tareas solapadas, nota de tiempo libre cuando el día está lleno, comportamiento en pantallas angostas.

### 08 · Iniciar sesión, móvil / Android (`UX-Movil/Android Iniciar sesión.png`) — ruta `/login`
- Pantalla **vertical** de una sola columna (≈ 390 px de ancho), sin barra lateral. De arriba abajo:
  - **Cabecera verde profundo**: logo + «CalendarGreen» a la izquierda y el botón circular de modo oscuro (luna) a la derecha; titular «Dilo en voz alta. CalendarGreen lo agenda.»; texto «Dices qué, cuándo y a qué hora, revisas la propuesta y confirmas con un toque.» (más corto que en escritorio); y una tarjeta con micrófono y la cita «Recuérdame llamar al dentista el viernes a las 3 de la tarde». *No incluye la mini-tarjeta «PROPUESTA» del diseño de escritorio.*
  - **Formulario** sobre fondo claro: título «Inicia sesión», subtítulo, **Correo**, **Contraseña**, botón «Entrar a mi calendario» a todo el ancho y «¿Aún no tienes cuenta? **Crear cuenta**».
  - **Pie**: «Gratis y privado: tus tareas solo las ves tú.»
- **No se ve:** estados de error o de carga, teclado en pantalla, orientación horizontal, tabletas, y las demás pantallas móviles (registro, calendario, formulario de tarea, asistente de voz).

## 4. Huecos y discrepancias detectadas (sin resolver)

No se inventaron diseños. Cada punto debe resolverse (o diseñarse) antes de la spec indicada.

| # | Hueco o discrepancia | Afecta a |
|---|----------------------|----------|
| ~~U-1~~ | ~~Vista día sin diseño~~ **Resuelta:** `Calendario Día.png`. | — |
| U-2 | **Versión móvil / Android:** solo existe el inicio de sesión (`08`). Faltan registro, barra lateral/navegación, calendario (mes, semana, día), formulario de tarea con repetición y notificar, y asistente de voz. | 001 (registro), 002, 005 |
| U-3 | **Modo oscuro:** exigido, pero ninguna imagen lo muestra; solo hay colores indicados en `AGENT.md`. | 001, 002 |
| U-4 | **Estados de error, vacío y carga** (formularios, calendario sin tareas, servidor «despertando», sin conexión). | 001, 002 |
| U-5 | **Editar, borrar y arrastrar** tareas: no hay diseño de edición, de menú contextual, de confirmación de borrado ni de indicador de arrastre. | 002 |
| U-6 | **Duración por defecto:** el asistente muestra «1 hora»; el formulario manual muestra «30 minutos»; `AGENT.md` dice 30 min. (C-5 de la constitución.) | 002, 003 |
| ~~U-7~~ | ~~Opciones de duración~~ **Resuelta (2026-11-08):** el campo «Duración» se reemplazó por «Hora final» (lista de horas). | — |
| U-8 | **Zona horaria** en el registro: se muestra, pero no se ve si es editable. | 001 |
| U-9 | **Rango horario** de la vista semana (6 a. m.–7 p. m. visible) y comportamiento fuera de él. | 002 |
| U-10 | **Tareas solapadas** en la misma franja (semana) y significado de «+N más» al pulsar (mes). | 002 |
| U-11 | **Sesión vencida / cierre de sesión forzado:** sin diseño del aviso. | 001 |
| U-12 | **Origen `text`:** solo se ve ícono de micrófono (voz); no hay ícono distinto para tareas escritas al agente. | 002, 003 |
| U-13 | **Fecha del mockup:** «hoy» es sábado 31 de octubre de 2026 en todas las imágenes; es dato de ejemplo. | — |
| U-14 | **Barra de comando inferior** aparece en mes y semana, pero pertenece a 003/004; en 002 hay que decidir si se muestra deshabilitada, oculta o se reserva el espacio. | 002 |
| U-15 | **Estados del panel de voz** (escuchando, pregunta de aclaración, sin permiso de micrófono, navegador sin soporte). | 004 |
| U-16 | **Opciones de «Tarea a repetir»**: solo se ve «Personalizado». Se propone: «No se repite» (por defecto), «Cada semana», «De lunes a viernes», «Todos los días» y «Personalizado». | 002 |
| U-17 | **Editar y borrar una tarea que se repite**: sin diseño (¿solo esta, o esta y las siguientes?). | 002 |
| U-18 | **Rango y paso de las listas**: «Hora de inicio» y «Hora final» (¿cada 30 minutos? se decidió que sí), y números y unidades de «Notificar». | 002 |
| U-19 | **Dos puntos al final** de los resúmenes del mockup («a. m..»): se corrige a uno. | 002 |
| U-20 | **Registro móvil** sin diseño: hasta que exista, se muestra solo el formulario, sin el panel de marca. | 001 |
| U-21 | **Cómo se ve una tarea que se repite** en el calendario (¿ícono?). Se propone un ícono pequeño de repetición. | 002 |
| U-22 | **Estados del asistente de texto** (003): «pensando», pregunta del asistente, error del panel y «despertando el servidor». | 003 |
| U-23 | **Barra de comando** deshabilitada, en error o sin sesión: sin diseño. | 003 |
| U-25 | **Tarjetas del agente con herramientas** (003): «Cambiar» (antes → después), «Eliminar» (estilo de advertencia y cuántas afecta), «Confirmar todas», aviso de conflicto («Ya tienes…»), respuesta informativa de la agenda y estado «Revisando tu agenda…». Solo existe el diseño de la tarjeta «Propuesta» (agendar). | 003 |
| U-24 | **Estados de la voz** (004): botón y panel «escuchando», transcripción parcial, permiso denegado, sin micrófono, sin soporte del navegador y errores del reconocimiento (ampliación de U-15). | 004 |

## 5. Reglas para editar esta carpeta
1. Solo el humano agrega o cambia diseños; el agente no inventa pantallas.
2. Si cambia un diseño, se actualiza esta tabla y la spec correspondiente **antes** de tocar el código.
3. Cada pantalla nueva: archivo exportado + fila en el índice + descripción en la sección 3.

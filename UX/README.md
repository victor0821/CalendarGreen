# UX — Diseños de CalendarGreen

> **Estado:** BORRADOR — redactado a partir de las 6 imágenes de esta carpeta; pendiente de revisión humana.
> Esta carpeta es la **fuente de verdad visual y de flujo** (`AGENT.md` §3). Los datos de los mockups (correos, tareas, fechas) son ejemplos, no requisitos.
> Los diseños actuales son de **escritorio (web)**. Aún no existe diseño móvil/Android ni vista día.

## 1. Índice de pantallas

| Archivo real | Alias (`AGENT.md` §3) | Pantalla | Ruta | Spec | Estado |
|--------------|-----------------------|----------|------|------|--------|
| `Iniciar sesión.png` | `01-login` | Iniciar sesión | `/login` | 001 | Diseñada |
| `Crear cuenta.png` | `02-registro` | Crear cuenta | `/registro` | 001 | Diseñada |
| `Calendario Mes.png` | `03-calendario-mes` | Calendario, vista mes | `/calendario` | 002 | Diseñada |
| `Calendario Semana.png` | `04-calendario-semana` | Calendario, vista semana | `/calendario` | 002 | Diseñada |
| `Asistente de voz confirmar.png` | `05-asistente-voz` | Asistente de voz: transcripción y propuesta | `/calendario` (panel lateral) | 003 / 004 | Diseñada |
| `Nueva tarea manual límite de Gemini.png` | `06-tarea-manual` | Nueva tarea manual (con aviso de límite de Gemini) | `/tareas/nueva` | 002 (formulario) y 003 (aviso) | Diseñada |
| — | — | Calendario, vista día | `/calendario` | 002 | **Pendiente de diseñar** |
| — | — | Versión móvil / Android de todas las pantallas | — | 005 | **Pendiente de diseñar** |

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
- **Formulario** (tarjeta blanca): **Título**; **Fecha** (selector, `01/11/2026`); **Hora** (selector, `03:00 p. m.`); **Duración** (lista desplegable, «30 minutos»); **Notas (opcional)**; casilla «**Recordarme en mi teléfono Android a la hora de la tarea**» marcada, con la ayuda «La notificación se programa en el dispositivo y funciona sin conexión.»; botón «✓ Guardar tarea» y enlace «Cancelar».
- Sin el aviso amarillo, es el formulario de «Nueva tarea» normal (uso 002); el aviso es de 003/004.
- **No se ve:** errores de validación, versión de **edición** de una tarea existente, botón de borrar, opciones disponibles de la lista de duración.

## 4. Huecos y discrepancias detectadas (sin resolver)

No se inventaron diseños. Cada punto debe resolverse (o diseñarse) antes de la spec indicada.

| # | Hueco o discrepancia | Afecta a |
|---|----------------------|----------|
| U-1 | **Vista día** sin diseño. | 002 |
| U-2 | **Versión móvil / Android** sin diseño (barra lateral, calendario, panel de voz, formularios). | 005 (y adaptación en 002) |
| U-3 | **Modo oscuro:** exigido, pero ninguna imagen lo muestra; solo hay colores indicados en `AGENT.md`. | 001, 002 |
| U-4 | **Estados de error, vacío y carga** (formularios, calendario sin tareas, servidor «despertando», sin conexión). | 001, 002 |
| U-5 | **Editar, borrar y arrastrar** tareas: no hay diseño de edición, de menú contextual, de confirmación de borrado ni de indicador de arrastre. | 002 |
| U-6 | **Duración por defecto:** el asistente muestra «1 hora»; el formulario manual muestra «30 minutos»; `AGENT.md` dice 30 min. (C-5 de la constitución.) | 002, 003 |
| U-7 | **Opciones de duración** de la lista desplegable no mostradas. | 002 |
| U-8 | **Zona horaria** en el registro: se muestra, pero no se ve si es editable. | 001 |
| U-9 | **Rango horario** de la vista semana (6 a. m.–7 p. m. visible) y comportamiento fuera de él. | 002 |
| U-10 | **Tareas solapadas** en la misma franja (semana) y significado de «+N más» al pulsar (mes). | 002 |
| U-11 | **Sesión vencida / cierre de sesión forzado:** sin diseño del aviso. | 001 |
| U-12 | **Origen `text`:** solo se ve ícono de micrófono (voz); no hay ícono distinto para tareas escritas al agente. | 002, 003 |
| U-13 | **Fecha del mockup:** «hoy» es sábado 31 de octubre de 2026 en todas las imágenes; es dato de ejemplo. | — |
| U-14 | **Barra de comando inferior** aparece en mes y semana, pero pertenece a 003/004; en 002 hay que decidir si se muestra deshabilitada, oculta o se reserva el espacio. | 002 |
| U-15 | **Estados del panel de voz** (escuchando, pregunta de aclaración, sin permiso de micrófono, navegador sin soporte). | 004 |

## 5. Reglas para editar esta carpeta
1. Solo el humano agrega o cambia diseños; el agente no inventa pantallas.
2. Si cambia un diseño, se actualiza esta tabla y la spec correspondiente **antes** de tocar el código.
3. Cada pantalla nueva: archivo exportado + fila en el índice + descripción en la sección 3.

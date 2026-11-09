# 002 — Calendario y tareas

> **Estado:** APROBADO por el humano (2026-11-02) (Fase 1: Especificar).
> **Enmienda 2026-11-08 — APROBADA por el humano (2026-11-08):** el formulario manual cambia (horas de inicio y final, «Tarea a repetir», «Notificar»). Los requisitos modificados o nuevos están marcados con **[v2]**. Las propuestas Q-22 a Q-27 quedan aceptadas tal como están escritas. **Quedó fuera de esta aprobación el diseño móvil/Android** (el login móvil de la spec 001 sigue pendiente).
> Describe **qué** y **por qué**, sin tecnología (la tecnología está en `plan.md`). Depende de 001.

## Contexto y problema

Con cuentas y sesión resueltas (001), el usuario necesita lo central del producto: **ver y gestionar sus tareas en un calendario propio**. Esta feature entrega las vistas del calendario, la creación manual de tareas y su gestión (editar, mover, completar, borrar). Es también la base sobre la que el agente de voz/texto (003/004) propondrá tareas: sin calendario y formulario manual, el agente no tiene dónde guardar y la aplicación no es utilizable cuando se agota la cuota de Gemini.

## Historias de usuario

- **HU-1.** Como **usuario**, quiero ver mi mes completo con mis tareas, para tener una visión general.
- **HU-2.** Como **usuario**, quiero ver mi semana por horas, para planificar mi día con precisión.
- **HU-3.** Como **usuario**, quiero ver un solo día en detalle con su lista de tareas y mi tiempo libre, para concentrarme en lo de hoy.
- **HU-4.** Como **usuario**, quiero moverme entre meses/semanas y volver a «hoy» rápido, para consultar cualquier fecha.
- **HU-5.** **[v2]** Como **usuario**, quiero crear una tarea con título, fecha, hora de inicio y hora final, para agendar algo sin usar la voz.
- **HU-6.** Como **usuario**, quiero editar una tarea, para corregir sus datos.
- **HU-7.** Como **usuario**, quiero arrastrar una tarea a otro día u hora, para reprogramarla rápido.
- **HU-8.** Como **usuario**, quiero marcar una tarea como completada (y desmarcarla), para llevar el control de lo hecho.
- **HU-9.** Como **usuario**, quiero borrar una tarea, para quitar lo que ya no aplica.
- **HU-10.** Como **usuario**, quiero ver las tareas de hoy junto al calendario, para saber qué toca ahora.
- **HU-11.** Como **usuario**, quiero que nadie más vea mis tareas, para mi privacidad.
- **HU-12.** **[v2]** Como **usuario**, quiero que una tarea se repita cada semana, de lunes a viernes, todos los días o en los días que yo elija, para no crearla una y otra vez.
- **HU-13.** **[v2]** Como **usuario**, quiero que me avisen cierto tiempo antes de que empiece una tarea (minutos, horas, días o semanas), para llegar a tiempo.

## Requisitos funcionales

### Estructura de la pantalla
- **RF-001 — Marco de la aplicación.** Las pantallas del usuario autenticado comparten una barra lateral con: marca, botón «+ Nueva tarea», acceso a «Calendario», lista «Hoy», correo de la sesión, «Cerrar sesión» y botón de modo claro/oscuro, y un área principal.
- **RF-002 — Lista «Hoy».** La barra lateral muestra, bajo el rótulo «HOY · día de la semana y fecha corta» (p. ej., «SÁB 31 OCT»), las tareas de hoy ordenadas por hora, cada una con su casilla, hora en negrita y título. Marcar la casilla completa la tarea (y desmarcarla la reabre).
- **RF-003 — Espacio para el comando.** El área principal reserva el espacio de la barra de comando inferior para 003/004. En 002 **no se muestra** funcional (decisión en Q-9).

### Vistas
- **RF-004 — Vista mes.** Cuadrícula de lunes a domingo con las semanas del mes; los días de meses vecinos aparecen atenuados; el día actual tiene el número resaltado y la celda tintada. Cada tarea es una «píldora» con hora y título truncado; cada celda muestra como máximo **2** tareas y el resto como «+N más».
- **RF-005 — Vista semana.** Siete columnas (lunes a domingo) con el número del día y un eje de horas; cada tarea es un bloque cuya altura corresponde a su duración; el día actual está resaltado y muestra una **línea de la hora actual**. El rango horario visible y su desplazamiento se definen en Q-5.
- **RF-006 — Vista día.** Una columna del día elegido con el eje de horas y las tareas como bloques con su rango horario («10:00 – 11:00 a. m.»), más el panel lateral «Tareas del día» (RF-027). Si el día elegido es hoy, la columna está tintada y muestra la línea de la hora actual. Navegación día a día. Diseño: `Calendario Día.png`.
- **RF-027 — Panel «Tareas del día».** En la vista día, un panel a la derecha lista las tareas del día ordenadas por hora, cada una con casilla (completar/reabrir), título y rango horario; en la cabecera, «N tareas · M hecha(s)». Debajo, una nota «Tu tiempo libre: …» con los huecos del día entre tareas, en formato «antes de las 10:00 a. m., de 11:00 a. m. a 6:00 p. m. y después de las 6:30 p. m.». Con el día sin tareas, la nota indica que todo el día está libre (Q-19).
- **RF-007 — Navegación.** Cada vista tiene botones anterior/siguiente, un botón «Hoy» y un conmutador de vista (Mes | Semana | Día). El encabezado muestra el rango: «Octubre 2026» (mes), «26 oct – 1 nov 2026» (semana), fecha completa (día). Cambiar de vista conserva la fecha de referencia.
- **RF-008 — Carga por rango.** Cada vista pide y muestra solo las tareas de su rango visible, incluidas las que empiezan antes del rango pero se extienden dentro de él.
- **RF-009 — Estados vacíos y de carga.** Un calendario sin tareas se muestra normal (cuadrícula vacía) con indicación de que no hay tareas; mientras carga, hay un indicador; si falla, hay un mensaje y la opción de reintentar. (Sin diseño: U-4.)

### Presentación de las tareas
- **RF-010 — Apariencia.** Las tareas completadas se ven **tachadas y atenuadas**. Las creadas por voz llevan **ícono de micrófono**. Las horas se muestran en formato de 12 h con «a. m.» y «p. m.».
- **RF-011 — Tareas simultáneas.** Si varias tareas coinciden en tiempo en la vista semana/día, se muestran sin ocultarse unas a otras (reparto de ancho; ver Q-6).
- **RF-012 — Zona horaria.** Las tareas se muestran en la zona horaria del usuario; un cambio de día ocurre a la medianoche de esa zona.

### Gestión de tareas
- **RF-013 — Crear (formulario).** **[v2]** «Nueva tarea» (`/tareas/nueva`) abre un formulario con, en este orden: **Título** (obligatorio); **Fecha**, **Hora de inicio** y **Hora final** (RF-028); **Tarea a repetir** (RF-029); **Notas** (opcional); y **Notificar** (RF-034). «Guardar tarea» crea la tarea (o la serie, RF-031) y lleva al calendario mostrando su fecha; «Cancelar» y «Volver al calendario» regresan sin guardar. Diseño: `Nueva tarea manual límite de Gemini.png` (v2).
- **RF-014 — Valores iniciales.** **[v2]** El formulario abre con la fecha de hoy, la **próxima hora en punto** como hora de inicio y una hora final **30 minutos después** (Q-7); «Tarea a repetir» en «No se repite» y «Notificar» marcada con 15 minutos. Cuando se abre desde una celda o franja del calendario, usa esa fecha y hora de inicio.
- **RF-015 — Editar.** El usuario puede abrir una tarea existente, ver y cambiar sus campos y guardar. La pantalla de edición reutiliza el formulario de RF-013. *(Sin diseño: U-5.)*
- **RF-016 — Mover.** El usuario puede arrastrar una tarea a otro día (vista mes: conserva la hora) o a otro día y hora (vista semana/día: la hora se ajusta al intervalo más cercano). La tarea conserva su duración. Si falla el guardado, vuelve a su lugar y se avisa. **[v2]** Si la tarea es una repetición, solo se mueve esa repetición (RF-032). *(Sin diseño del arrastre: U-5.)*
- **RF-017 — Completar y reabrir.** El usuario puede marcar una tarea como completada o reabrirla (desde la lista «Hoy» y desde la tarea). Una tarea completada conserva su fecha y se muestra atenuada.
- **RF-018 — Borrar.** El usuario puede borrar una tarea, tras una confirmación explícita. El borrado es definitivo en v1. **[v2]** En una repetición, la confirmación ofrece «Solo esta» y «Esta y las siguientes» (RF-033). *(Sin diseño: U-5, U-17.)*
- **RF-019 — Origen.** Cada tarea registra su origen: `manual` (creada con el formulario), `voice` o `text` (propuestas del agente confirmadas, de 003/004).
- **RF-020 — Recordatorio.** **[v2]** La preferencia de «Notificar» (activada o no, y cuánto antes) se guarda con la tarea (RF-034). En 002 solo se **almacena**; la notificación real en Android es de 005, que usará esa antelación.

### Horas, repetición y notificación **[v2]**
- **RF-028 — Horas de inicio y final.** «Hora de inicio» y «Hora final» son **listas desplegables** con horas en formato de 12 h («12:00 a. m.», «12:30 a. m.» … «11:30 p. m.»), **cada 30 minutos**. «Hora final» solo ofrece horas **posteriores** a la de inicio, hasta las **12:00 a. m. (medianoche)** del mismo día. Al cambiar la hora de inicio, la final se desplaza conservando la duración elegida si cabe; si no, queda en la última hora posible. Si una tarea existente tiene una hora que no cae en la cuadrícula (p. ej., 3:10 p. m., creada por voz), esa hora se agrega a la lista para no perderla. La duración de la tarea es «hora final − hora de inicio»; ya no existe el campo «Duración».
- **RF-029 — Tarea a repetir.** Lista desplegable con: **«No se repite»** (por defecto), **«Cada semana»** (el mismo día de la semana que la Fecha), **«De lunes a viernes»**, **«Todos los días»** y **«Personalizado»**. Con «Personalizado» aparecen siete botones circulares **L M X J V S D** que el usuario enciende o apaga; al elegir «Personalizado» queda encendido el día de la semana de la Fecha, y debe quedar **al menos un día** encendido. Debajo se muestra un resumen en lenguaje natural: «Se repetirá cada lunes, martes, miércoles y viernes, de 12:00 a. m. a 12:30 a. m.» («Cada semana»: «Se repetirá cada domingo, de …»; «De lunes a viernes»: «Se repetirá de lunes a viernes, de …»; «Todos los días»: «Se repetirá todos los días, de …»).
- **RF-030 — Inicio de la repetición.** La **Fecha** es el primer día posible de la serie. Si su día de la semana no está entre los elegidos, la primera repetición es el siguiente día elegido (la Fecha no genera tarea). Todas las repeticiones conservan la **misma hora local**, incluso tras cambios de horario.
- **RF-031 — Copias reales con renovación.** Al guardar, el sistema crea una tarea por cada repetición de los **próximos 12 meses** desde la fecha de inicio. Cuando el usuario navega a un periodo que la serie aún no cubre, el sistema crea las repeticiones que faltan (12 meses más allá del periodo pedido, sin pasar del límite de fechas guardables, Q-8). En v1 no hay fecha de fin.
- **RF-032 — Repeticiones independientes.** Cada repetición es una tarea normal: se **completa, mueve, edita y borra sola** sin afectar a las demás. Las que pertenecen a una serie muestran un pequeño **ícono de repetición** y su descripción accesible incluye «se repite» (U-21).
- **RF-033 — Editar y borrar repeticiones.** Editar una repetición cambia **solo esa**; en la pantalla de edición «Tarea a repetir» se muestra de solo lectura con su resumen (para cambiar la regla, se borra «esta y las siguientes» y se crea una nueva). Borrar ofrece **«Solo esta»** y **«Esta y las siguientes»** (esta y todas las posteriores de la serie; las anteriores se conservan). *(Sin diseño: U-17.)*
- **RF-034 — Notificar.** Casilla «**Notificar**» (marcada por defecto) con la ayuda «La notificación se programa en el dispositivo y funciona sin conexión.». Al marcarla aparecen dos listas: **números** (1 a 60) y **unidades** («minutos», «horas», «días», «semanas»), seguidas de «antes», y un resumen «Te avisaremos 15 minutos antes de las 12:00 a. m.» (en singular si es 1: «1 hora antes»). Por defecto: 15 minutos. El aviso no puede ser de más de **4 semanas** antes. Al desmarcarla, las listas se ocultan y no se avisa. En una serie, el aviso aplica a cada repetición.

### Reglas de datos
- **RF-021 — Validaciones.** **[v2]** Título: 1 a 120 caracteres tras quitar espacios. Notas: hasta 1000 caracteres. **Hora final posterior a la de inicio** («La hora final debe ser después de la de inicio.»); la duración resultante es de 30 minutos a 24 horas (la API admite de 5 minutos a 24 horas, para tareas de voz). Fecha y horas obligatorias y válidas. «Personalizado» exige al menos un día («Elige al menos un día.»). «Notificar» exige un número y una unidad válidos y no superar 4 semanas. Los errores se muestran junto al campo, en español.
- **RF-022 — Tareas en el pasado.** El formulario manual **permite** fechas pasadas (Q-4).
- **RF-023 — Aislamiento.** Cada usuario solo ve y modifica **sus** tareas; pedir, editar o borrar una tarea ajena responde como «no encontrada».
- **RF-024 — Fechas.** Las fechas se guardan de forma absoluta (UTC) y se muestran en la zona del usuario.

### Interfaz
- **RF-025 — Tema.** Todas las pantallas funcionan en claro y oscuro con los tokens de marca.
- **RF-026 — Accesibilidad.** Controles reales, áreas táctiles ≥ 44 px, contraste ≥ 4.5:1, navegación por teclado en el calendario (flechas entre días, Enter para abrir) y alternativa por teclado al arrastre (editar fecha/hora en el formulario).

## Requisitos no funcionales

- **RNF-001 — Rendimiento.** Cada vista pide solo su rango; con cientos de tareas, el cambio de mes/semana se percibe fluido (objetivo: respuesta del servidor < 1 s tras despertar).
- **RNF-002 — Consistencia.** Tras crear, mover, completar o borrar, la vista y la lista «Hoy» se actualizan sin recargar y coinciden entre sí.
- **RNF-003 — Calendario propio.** No se usan librerías de calendario (constitución §3.1).
- **RNF-004 — Seguridad.** Todo recurso exige sesión (001); entradas validadas en el servidor además del cliente.
- **RNF-005 — Español.** Nombres de meses y días, horas y mensajes en español.
- **RNF-006 — Accesibilidad.** WCAG 2.1 AA como objetivo.

## Pantallas de UX relacionadas

- `UX/Calendario Mes.png` (alias `03-calendario-mes`) — vista mes.
- `UX/Calendario Día.png` (alias `07-calendario-dia`) — vista día con panel «Tareas del día».
- `UX/Calendario Semana.png` (alias `04-calendario-semana`) — vista semana.
- `UX/Nueva tarea manual límite de Gemini.png` (alias `06-tarea-manual`) — formulario manual **(v2, 2026-11-08)**; **sin** el aviso amarillo, que pertenece a 003/004.
- Diseño móvil: **solo** el inicio de sesión (`UX/UX-Movil/Android Iniciar sesión.png`, spec 001); el calendario y el formulario móviles siguen sin diseño (U-2).
- `UX/Asistente de voz confirmar.png` — **solo de referencia** para la barra lateral colapsada y el bloque punteado; el panel de voz es de 003/004.
- **Sin diseño:** móvil (U-2), modo oscuro (U-3), estados de error/vacío/carga (U-4), editar/borrar/arrastrar (U-5), rango horario (U-9), tareas solapadas y «+N más» (U-10), barra de comando en 002 (U-14), opciones de «Tarea a repetir» (U-16), editar/borrar repeticiones (U-17), rango de «Notificar» (U-18), ícono de repetición (U-21).

## Criterios de aceptación

- **CA-1 (RF-004, RF-007).** *Dado* un usuario en octubre de 2026, *cuando* abre la vista mes, *entonces* ve «Octubre 2026», semanas de lunes a domingo, los días de septiembre y noviembre atenuados, y hoy resaltado.
- **CA-2 (RF-004).** *Dado* un día con 3 tareas, *cuando* se ve el mes, *entonces* muestra 2 y «+1 más».
- **CA-3 (RF-005).** *Dado* una tarea de 1:00 p. m. con duración de 2 horas, *cuando* se ve la semana, *entonces* su bloque ocupa dos franjas horarias en la columna del día; y hoy muestra la línea de hora actual.
- **CA-4 (RF-007).** *Dado* cualquier vista, *cuando* se pulsa «siguiente», «anterior» y «Hoy», *entonces* el rango y el título cambian y «Hoy» regresa al periodo actual; *y cuando* se cambia de Mes a Semana, *entonces* se conserva la fecha de referencia.
- **CA-5 (RF-008).** *Dado* una tarea que cruza la medianoche (11:30 p. m. a 12:30 a. m.), *cuando* se ve el día siguiente, *entonces* aparece en él.
- **CA-6 (RF-013).** **[v2]** *Dado* el formulario con título «Llamar a mi hermano», fecha 1/11/2026, hora de inicio 3:00 p. m. y hora final 3:30 p. m., *cuando* se pulsa «Guardar tarea», *entonces* se crea con 30 minutos de duración, origen `manual`, sin repetición y con aviso 15 minutos antes, y al volver al calendario aparece ese día.
- **CA-7 (RF-021).** *Dado* un título vacío o de solo espacios, *cuando* se intenta guardar, *entonces* se muestra el error junto al campo y no se crea.
- **CA-8 (RF-015).** *Dado* una tarea existente, *cuando* se edita y guarda, *entonces* la vista refleja los cambios y la tarea conserva su origen.
- **CA-9 (RF-016).** *Dado* una tarea del lunes 3:00 p. m., *cuando* se arrastra al miércoles 4:00 p. m. en la semana, *entonces* queda ahí con la misma duración; *y cuando* el guardado falla, *entonces* vuelve a su lugar y se avisa.
- **CA-10 (RF-017, RF-002).** *Dado* una tarea de hoy, *cuando* se marca su casilla en «Hoy», *entonces* se ve tachada y atenuada en el calendario; *y cuando* se desmarca, *entonces* vuelve a la normalidad.
- **CA-11 (RF-018).** *Dado* una tarea, *cuando* se pide borrarla, *entonces* se pide confirmación; *y cuando* se confirma, *entonces* desaparece de todas las vistas y de «Hoy».
- **CA-12 (RF-023).** *Dado* dos usuarios A y B con tareas, *cuando* A consulta, edita o borra una tarea de B por su identificador, *entonces* recibe «no encontrada» y la tarea de B no cambia.
- **CA-13 (RF-012, RF-024).** *Dado* un usuario en `America/Bogota`, *cuando* guarda una tarea a las 11:30 p. m., *entonces* aparece ese día (no el siguiente), aunque en UTC sea el día siguiente.
- **CA-14 (RF-010).** *Dado* una tarea de origen `voice` completada, *cuando* se ve en el calendario, *entonces* muestra micrófono, tachada y atenuada.
- **CA-15 (compuerta de `AGENT.md` §13).** *Dado* un usuario, *cuando* crea, mueve y borra tareas en **mes, semana y día**, *entonces* cada operación se refleja correctamente en las tres vistas.
- **CA-16 (RF-009).** *Dado* que falla la carga, *cuando* se muestra el calendario, *entonces* aparece un mensaje con la opción de reintentar y nada se pierde.
- **CA-18 (RF-006, RF-027).** *Dado* un día con tareas de 10:00–11:00 a. m. (completada) y 6:00–6:30 p. m., *cuando* se abre la vista día, *entonces* aparecen ambos bloques con su rango, el panel muestra «2 tareas · 1 hecha», la primera con la casilla marcada y tachada, y la nota dice «Tu tiempo libre: antes de las 10:00 a. m., de 11:00 a. m. a 6:00 p. m. y después de las 6:30 p. m.»; *y cuando* se marca la casilla de la segunda, *entonces* el bloque y el panel se actualizan a «2 hechas».
- **CA-17 (RF-025, RF-026).** *Dado* el modo oscuro y la navegación solo con teclado, *cuando* se recorre el calendario y el formulario, *entonces* todo es accesible y legible.

- **CA-19 (RF-028).** **[v2]** *Dado* el formulario, *cuando* se abre «Hora de inicio», *entonces* ofrece 48 horas de «12:00 a. m.» a «11:30 p. m.» cada 30 minutos; *y cuando* se elige inicio 3:00 p. m., *entonces* «Hora final» ofrece de «3:30 p. m.» a «12:00 a. m.» y quedó en «3:30 p. m.».
- **CA-20 (RF-028, RF-021).** **[v2]** *Dado* inicio 3:00 p. m. y final 4:30 p. m., *cuando* se cambia el inicio a 5:00 p. m., *entonces* la final pasa a 6:30 p. m. (conserva 1,5 h); *y dado* inicio 11:30 p. m., *entonces* la única final posible es 12:00 a. m.
- **CA-21 (RF-029).** **[v2]** *Dado* «Tarea a repetir», *cuando* se elige «Personalizado», *entonces* aparecen L M X J V S D con el día de la Fecha encendido, y al apagar todos se muestra «Elige al menos un día.» y no se guarda; *y cuando* se encienden L, M, X y V con horas 12:00 a. m. a 12:30 a. m., *entonces* el resumen dice «Se repetirá cada lunes, martes, miércoles y viernes, de 12:00 a. m. a 12:30 a. m.».
- **CA-22 (RF-029, RF-030, RF-031).** **[v2]** *Dado* fecha domingo 1/11/2026 y «De lunes a viernes», *cuando* se guarda, *entonces* la primera tarea es el lunes 2/11, no se crea nada el domingo, y existen tareas hasta 12 meses después; todas a la misma hora local.
- **CA-23 (RF-031).** **[v2]** *Dado* una serie «Todos los días» creada hoy, *cuando* el usuario navega a un mes posterior al último cubierto, *entonces* las tareas de ese mes aparecen (se crearon al pedirlas) sin crear duplicados si se vuelve a pedir.
- **CA-24 (RF-032).** **[v2]** *Dado* una serie semanal, *cuando* se completa, mueve o edita una repetición, *entonces* las demás no cambian; y todas muestran el ícono de repetición.
- **CA-25 (RF-033).** **[v2]** *Dado* una repetición del miércoles, *cuando* se borra con «Esta y las siguientes», *entonces* desaparecen ella y las posteriores y se conservan las anteriores; *y con* «Solo esta», solo desaparece esa.
- **CA-26 (RF-034).** **[v2]** *Dado* el formulario, *cuando* se desmarca «Notificar», *entonces* se ocultan las listas y la tarea se guarda sin aviso; *y cuando* se marca de nuevo y se elige 2 «horas», *entonces* el resumen dice «Te avisaremos 2 horas antes de las 3:00 p. m.»; *y con* 1 «horas», *entonces* «1 hora antes».
- **CA-27 (RF-034, RF-021).** **[v2]** *Dado* 5 «semanas», *cuando* se guarda, *entonces* se muestra «El aviso no puede ser más de 4 semanas antes.» y no se crea.

## Casos límite y errores

- Tareas con **igual hora de inicio** o solapadas parcialmente (semana/día): se reparten el ancho sin taparse.
- Tarea que **cruza la medianoche** o de **24 horas**: aparece en ambos días / ocupa la columna completa.
- Días con **cambio de horario** (no aplica a `America/Bogota`; sí a otras zonas): la hora local se conserva al mostrar.
- **Mes de 5 o 6 filas:** la cuadrícula se adapta; **febrero bisiesto**.
- Muchas tareas (más de 2) en una celda del mes: «+N más» (Q-5/U-10 define el clic).
- **Arrastre** a una hora ocupada, a otro mes distinto del visible o fuera del rango horario visible.
- **Doble envío** del formulario: solo se crea una tarea.
- **Edición concurrente** (misma tarea en dos pestañas): gana el último guardado, sin pérdidas silenciosas de otras tareas.
- Título con **emojis, comillas, HTML o texto muy largo**: se muestra como texto plano, truncado en las vistas.
- **Sin conexión** o servidor dormido: aviso y reintento; el formulario conserva lo escrito.
- **Sesión vencida** durante una acción: se lleva a `/login` conservando (si es posible) el borrador del formulario (Q-10).
- Fecha **muy lejana** (años): se permite hasta un rango máximo (Q-8).
- **[v2]** «Todos los días» crea unas 366 tareas en el primer lote: el guardado debe seguir siendo rápido y no permitir un doble envío.
- **[v2]** Una serie cuya Fecha no coincide con los días elegidos empieza en el siguiente día elegido (RF-030).
- **[v2]** Borrar la única repetición restante, o todas, deja la serie sin tareas y la elimina.
- **[v2]** Al pedir un periodo lejano, la renovación puede tardar: la vista muestra «Cargando…» y no se duplican tareas si dos pestañas lo piden a la vez.
- **[v2]** Una tarea que termina exactamente a las 12:00 a. m. (medianoche) no aparece en el día siguiente.
- **[v2]** La zona horaria de una serie es la del usuario al crearla; si el usuario viaja, las horas locales de la serie no cambian.

## Fuera de alcance

- Agente de texto/voz, barra de comando funcional, panel de voz y su vista previa punteada (003/004).
- Notificaciones y recordatorios reales en Android, copia local y modo sin conexión (005).
- **[v2]** Fecha de fin de la repetición, repetición mensual o anual, y editar «esta y las siguientes» (solo se puede borrar, RF-033). La **tarea recurrente deja de ser la feature 007**: queda dentro de esta (RF-028…RF-034).
- Consultas de agenda por voz (006).
- Diseño y adaptación móvil/Android (U-2).
- Compartir calendarios, categorías, colores por tarea, adjuntos, subtareas, papelera o deshacer borrado.
- Importar/exportar calendarios.

## Clarificaciones (preguntas abiertas y decisiones)

| ID | Pregunta | Estado / propuesta |
|----|----------|--------------------|
| Q-1 | **Duración por defecto** (C-5): 30 min (formulario y `AGENT.md`) vs «1 hora» (mockup del asistente). | Abierta · propuesta: **30 minutos** en todo; corregir el mockup del asistente |
| ~~Q-2~~ | ~~Opciones de la lista de duración~~ **Reemplazada (2026-11-08):** «Duración» desaparece y se usa «Hora final», con horas cada 30 minutos (RF-028). | — |
| ~~Q-3~~ | ~~Diseño de la vista día~~ **Resuelta (2026-11-02):** el humano entregó `Calendario Día.png`; RF-006 y RF-027 quedan desbloqueados. | — |
| Q-19 | **Panel «Tareas del día»:** cómo se calcula el «tiempo libre». | **Decidida (2026-11-02):** el día completo (00:00–24:00), como muestra el diseño; día vacío → «Todo el día libre.»; tareas solapadas se unen; las que cruzan medianoche se recortan al día. En pantallas angostas el panel pasa debajo de la columna. |
| Q-4 | **Tareas en el pasado** en el formulario manual: ¿se permiten? (El agente no las propone — `AGENT.md` §6.) | Abierta · propuesta: permitidas |
| Q-5 | **Rango horario de la semana/día** (U-9) y desplazamiento; **clic en «+N más»** (U-10): ¿abre el día, una lista flotante o la vista día? | Abierta · propuesta: rango 24 h con desplazamiento, inicio visible en 6 a. m.; «+N más» abre la vista día |
| Q-6 | **Reparto visual de tareas solapadas** (U-10). | Abierta · propuesta: columnas lado a lado |
| Q-7 | **Hora sugerida** al abrir «Nueva tarea». | Abierta · propuesta: próxima hora en punto |
| Q-8 | **Rango máximo navegable** y de fechas guardables. | Abierta · propuesta: ±5 años |
| Q-9 | **Barra de comando inferior en 002** (U-14): ¿oculta, deshabilitada o con texto «Próximamente»? | Abierta · propuesta: oculta (espacio reservado) |
| Q-10 | **Conservar el borrador del formulario** al caducar la sesión. | Abierta · propuesta: sí, en el almacenamiento del navegador |
| Q-11 | **Diseño de editar, borrar y arrastrar** (U-5): ¿qué abre al pulsar una tarea (formulario completo, ventana emergente)? ¿Cómo se pide la confirmación de borrado? | Abierta · pedir diseño; propuesta: clic abre el formulario de edición con botón «Borrar» |
| Q-12 | **Desmarcar completadas:** ¿se permite reabrir? | Abierta · propuesta: sí |
| Q-13 | **Arrastrar en pantallas táctiles** (HTML5 drag-and-drop no funciona en móviles): alternativa para Android. | Abierta · se resuelve en 005 (editar fecha/hora en el formulario sirve de alternativa) |
| Q-14 | **«Notificar» marcado por defecto** en web aunque en 002 no suena nada (es de 005). | **Decidida (2026-11-08):** se muestra marcada con 15 minutos, como el diseño, con la ayuda «La notificación se programa en el dispositivo…». |
| Q-15 | **Ícono para origen `text`** (U-12). | Abierta · propuesta: sin ícono |
| Q-16 | **Tareas «todo el día»** (sin hora): no existen en el diseño ni en el modelo. | Abierta · propuesta: fuera de v1 |
| Q-17 | **Mostrar fin de semana/primer día de la semana configurable:** el diseño fija lunes. | Decidida: lunes |
| Q-18 | **Estados vacío, carga y error** (U-4) y **modo oscuro** (U-3). | Abierta · patrón mínimo con tokens |
| Q-20 | **Cómo funciona la repetición** (copias reales o regla que se expande). | **Decidida (2026-11-08, por el humano):** copias reales con renovación automática (RF-031). |
| Q-21 | **Paso de las listas de horas.** | **Decidida (2026-11-08, por el humano):** cada 30 minutos (RF-028). |
| Q-22 | **Opciones de «Tarea a repetir»**: el diseño solo muestra «Personalizado» (U-16). | Abierta · propuesta: añadir «No se repite» como valor por defecto, más las cuatro del enunciado (RF-029). |
| Q-23 | **Editar y borrar repeticiones** (U-17). | Abierta · propuesta: editar solo esta; borrar «solo esta» o «esta y las siguientes» (RF-033). Pedir diseño. |
| Q-24 | **Rango de «Notificar»**: números 1–60 y tope de 4 semanas (U-18). | Abierta · propuesta (RF-034). |
| Q-25 | **Tareas que cruzan la medianoche desde el formulario** (p. ej., 11 p. m. a 1 a. m.): la hora final llega hasta las 12:00 a. m. | Abierta · propuesta: no se admiten desde el formulario (se crean dos tareas); la API sí admite hasta 24 h. |
| Q-26 | **Límite de repeticiones**: tope de tareas creadas por serie en un lote y por usuario. | Abierta · propuesta: hasta 400 por lote y 5000 por usuario. |
| Q-27 | **Ícono de repetición** en el calendario (U-21). | Abierta · propuesta: ícono pequeño de flechas circulares. |

## Checklist de validación

- [ ] CA-1 a CA-27 verificados (CA-19 a CA-27 son de la enmienda v2).
- [ ] Pantallas conforme a `UX/`, en claro y oscuro.
- [ ] Prueba con dos usuarios (aislamiento de tareas) en verde.
- [ ] Fechas verificadas en `America/Bogota` y al menos otra zona (p. ej., con cambio de horario).
- [ ] Sin librerías de calendario.
- [ ] Accesibilidad revisada (teclado y lector de pantalla).
- [ ] Q-1 a Q-27 resueltas o diferidas por escrito.
- [ ] **[v2]** Formulario conforme a `Nueva tarea manual límite de Gemini.png` (v2), en claro y oscuro.
- [ ] **[v2]** Migración de series y avisos aplicada primero en dev, luego en prod, y anotada en `supabase/MIGRATIONS.md`.

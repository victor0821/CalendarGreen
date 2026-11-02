# 002 — Calendario y tareas

> **Estado:** BORRADOR — pendiente de aprobación humana (Fase 1: Especificar).
> Describe **qué** y **por qué**, sin tecnología (la tecnología está en `plan.md`). Depende de 001.

## Contexto y problema

Con cuentas y sesión resueltas (001), el usuario necesita lo central del producto: **ver y gestionar sus tareas en un calendario propio**. Esta feature entrega las vistas del calendario, la creación manual de tareas y su gestión (editar, mover, completar, borrar). Es también la base sobre la que el agente de voz/texto (003/004) propondrá tareas: sin calendario y formulario manual, el agente no tiene dónde guardar y la aplicación no es utilizable cuando se agota la cuota de Gemini.

## Historias de usuario

- **HU-1.** Como **usuario**, quiero ver mi mes completo con mis tareas, para tener una visión general.
- **HU-2.** Como **usuario**, quiero ver mi semana por horas, para planificar mi día con precisión.
- **HU-3.** Como **usuario**, quiero ver un solo día en detalle, para concentrarme en lo de hoy. *(Bloqueada por diseño: U-1.)*
- **HU-4.** Como **usuario**, quiero moverme entre meses/semanas y volver a «hoy» rápido, para consultar cualquier fecha.
- **HU-5.** Como **usuario**, quiero crear una tarea con título, fecha, hora y duración, para agendar algo sin usar la voz.
- **HU-6.** Como **usuario**, quiero editar una tarea, para corregir sus datos.
- **HU-7.** Como **usuario**, quiero arrastrar una tarea a otro día u hora, para reprogramarla rápido.
- **HU-8.** Como **usuario**, quiero marcar una tarea como completada (y desmarcarla), para llevar el control de lo hecho.
- **HU-9.** Como **usuario**, quiero borrar una tarea, para quitar lo que ya no aplica.
- **HU-10.** Como **usuario**, quiero ver las tareas de hoy junto al calendario, para saber qué toca ahora.
- **HU-11.** Como **usuario**, quiero que nadie más vea mis tareas, para mi privacidad.

## Requisitos funcionales

### Estructura de la pantalla
- **RF-001 — Marco de la aplicación.** Las pantallas del usuario autenticado comparten una barra lateral con: marca, botón «+ Nueva tarea», acceso a «Calendario», lista «Hoy», correo de la sesión, «Cerrar sesión» y botón de modo claro/oscuro, y un área principal.
- **RF-002 — Lista «Hoy».** La barra lateral muestra, bajo el rótulo «HOY · día de la semana y fecha corta» (p. ej., «SÁB 31 OCT»), las tareas de hoy ordenadas por hora, cada una con su casilla, hora en negrita y título. Marcar la casilla completa la tarea (y desmarcarla la reabre).
- **RF-003 — Espacio para el comando.** El área principal reserva el espacio de la barra de comando inferior para 003/004. En 002 **no se muestra** funcional (decisión en Q-9).

### Vistas
- **RF-004 — Vista mes.** Cuadrícula de lunes a domingo con las semanas del mes; los días de meses vecinos aparecen atenuados; el día actual tiene el número resaltado y la celda tintada. Cada tarea es una «píldora» con hora y título truncado; cada celda muestra como máximo **2** tareas y el resto como «+N más».
- **RF-005 — Vista semana.** Siete columnas (lunes a domingo) con el número del día y un eje de horas; cada tarea es un bloque cuya altura corresponde a su duración; el día actual está resaltado y muestra una **línea de la hora actual**. El rango horario visible y su desplazamiento se definen en Q-5.
- **RF-006 — Vista día.** Una sola columna del día elegido con el mismo eje de horas. **No hay diseño (U-1): se implementa solo cuando el humano lo entregue.** Esta spec fija el comportamiento: igual a una columna de la semana, con navegación día a día.
- **RF-007 — Navegación.** Cada vista tiene botones anterior/siguiente, un botón «Hoy» y un conmutador de vista (Mes | Semana | Día). El encabezado muestra el rango: «Octubre 2026» (mes), «26 oct – 1 nov 2026» (semana), fecha completa (día). Cambiar de vista conserva la fecha de referencia.
- **RF-008 — Carga por rango.** Cada vista pide y muestra solo las tareas de su rango visible, incluidas las que empiezan antes del rango pero se extienden dentro de él.
- **RF-009 — Estados vacíos y de carga.** Un calendario sin tareas se muestra normal (cuadrícula vacía) con indicación de que no hay tareas; mientras carga, hay un indicador; si falla, hay un mensaje y la opción de reintentar. (Sin diseño: U-4.)

### Presentación de las tareas
- **RF-010 — Apariencia.** Las tareas completadas se ven **tachadas y atenuadas**. Las creadas por voz llevan **ícono de micrófono**. Las horas se muestran en formato de 12 h con «a. m.» y «p. m.».
- **RF-011 — Tareas simultáneas.** Si varias tareas coinciden en tiempo en la vista semana/día, se muestran sin ocultarse unas a otras (reparto de ancho; ver Q-6).
- **RF-012 — Zona horaria.** Las tareas se muestran en la zona horaria del usuario; un cambio de día ocurre a la medianoche de esa zona.

### Gestión de tareas
- **RF-013 — Crear (formulario).** «Nueva tarea» (`/tareas/nueva`) abre un formulario con: **Título** (obligatorio), **Fecha**, **Hora**, **Duración** (30 minutos por defecto, lista de opciones), **Notas** (opcional) y la casilla «Recordarme en mi teléfono Android a la hora de la tarea» (marcada por defecto). «Guardar tarea» crea la tarea y lleva al calendario mostrando su fecha; «Cancelar» y «Volver al calendario» regresan sin guardar.
- **RF-014 — Valores iniciales.** El formulario abre con la fecha de hoy y una hora sugerida (Q-7); cuando se abre desde una celda o franja del calendario, usa esa fecha/hora.
- **RF-015 — Editar.** El usuario puede abrir una tarea existente, ver y cambiar sus campos y guardar. La pantalla de edición reutiliza el formulario de RF-013. *(Sin diseño: U-5.)*
- **RF-016 — Mover.** El usuario puede arrastrar una tarea a otro día (vista mes: conserva la hora) o a otro día y hora (vista semana/día: la hora se ajusta al intervalo más cercano). La tarea conserva su duración. Si falla el guardado, vuelve a su lugar y se avisa. *(Sin diseño del arrastre: U-5.)*
- **RF-017 — Completar y reabrir.** El usuario puede marcar una tarea como completada o reabrirla (desde la lista «Hoy» y desde la tarea). Una tarea completada conserva su fecha y se muestra atenuada.
- **RF-018 — Borrar.** El usuario puede borrar una tarea, tras una confirmación explícita. El borrado es definitivo en v1. *(Sin diseño: U-5.)*
- **RF-019 — Origen.** Cada tarea registra su origen: `manual` (creada con el formulario), `voice` o `text` (propuestas del agente confirmadas, de 003/004).
- **RF-020 — Recordatorio.** La casilla de recordatorio se guarda con la tarea. En 002 solo se **almacena** la preferencia; la notificación real en Android es de 005.

### Reglas de datos
- **RF-021 — Validaciones.** Título: 1 a 120 caracteres tras quitar espacios. Notas: hasta 1000 caracteres. Duración: de 5 minutos a 24 horas. Fecha y hora obligatorias y válidas. Los errores se muestran junto al campo, en español.
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
- `UX/Calendario Semana.png` (alias `04-calendario-semana`) — vista semana.
- `UX/Nueva tarea manual límite de Gemini.png` (alias `06-tarea-manual`) — formulario manual; **sin** el aviso amarillo, que pertenece a 003/004.
- `UX/Asistente de voz confirmar.png` — **solo de referencia** para la barra lateral colapsada y el bloque punteado; el panel de voz es de 003/004.
- **Sin diseño:** vista día (U-1), móvil (U-2), modo oscuro (U-3), estados de error/vacío/carga (U-4), editar/borrar/arrastrar (U-5), opciones de duración (U-7), rango horario (U-9), tareas solapadas y «+N más» (U-10), barra de comando en 002 (U-14).

## Criterios de aceptación

- **CA-1 (RF-004, RF-007).** *Dado* un usuario en octubre de 2026, *cuando* abre la vista mes, *entonces* ve «Octubre 2026», semanas de lunes a domingo, los días de septiembre y noviembre atenuados, y hoy resaltado.
- **CA-2 (RF-004).** *Dado* un día con 3 tareas, *cuando* se ve el mes, *entonces* muestra 2 y «+1 más».
- **CA-3 (RF-005).** *Dado* una tarea de 1:00 p. m. con duración de 2 horas, *cuando* se ve la semana, *entonces* su bloque ocupa dos franjas horarias en la columna del día; y hoy muestra la línea de hora actual.
- **CA-4 (RF-007).** *Dado* cualquier vista, *cuando* se pulsa «siguiente», «anterior» y «Hoy», *entonces* el rango y el título cambian y «Hoy» regresa al periodo actual; *y cuando* se cambia de Mes a Semana, *entonces* se conserva la fecha de referencia.
- **CA-5 (RF-008).** *Dado* una tarea que cruza la medianoche (11:30 p. m. a 12:30 a. m.), *cuando* se ve el día siguiente, *entonces* aparece en él.
- **CA-6 (RF-013).** *Dado* el formulario con título «Llamar a mi hermano», fecha 1/11/2026 y hora 3:00 p. m., *cuando* se pulsa «Guardar tarea», *entonces* se crea con 30 minutos de duración, origen `manual`, y al volver al calendario aparece ese día.
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
- **CA-17 (RF-025, RF-026).** *Dado* el modo oscuro y la navegación solo con teclado, *cuando* se recorre el calendario y el formulario, *entonces* todo es accesible y legible.

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

## Fuera de alcance

- Agente de texto/voz, barra de comando funcional, panel de voz y su vista previa punteada (003/004).
- Notificaciones y recordatorios reales en Android, copia local y modo sin conexión (005).
- Tareas recurrentes (007), consultas de agenda por voz (006).
- Diseño y adaptación móvil/Android (U-2).
- Compartir calendarios, categorías, colores por tarea, adjuntos, subtareas, papelera o deshacer borrado.
- Importar/exportar calendarios.

## Clarificaciones (preguntas abiertas y decisiones)

| ID | Pregunta | Estado / propuesta |
|----|----------|--------------------|
| Q-1 | **Duración por defecto** (C-5): 30 min (formulario y `AGENT.md`) vs «1 hora» (mockup del asistente). | Abierta · propuesta: **30 minutos** en todo; corregir el mockup del asistente |
| Q-2 | **Opciones de la lista de duración** (U-7). | Abierta · propuesta: 15, 30, 45 min; 1 h; 1,5 h; 2 h; 3 h; todo el día no incluido |
| Q-3 | **Diseño de la vista día** (U-1): pendiente del humano; RF-006 queda bloqueado hasta entonces. | Abierta · bloquea RF-006 y parte de CA-15 |
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
| Q-14 | **Recordatorio por defecto** marcado en web aunque en 002 no suena nada (el recordatorio es de 005). ¿Se oculta la casilla en web sin Android? | Abierta · propuesta: mostrarla marcada (como el diseño) y avisar en la ayuda |
| Q-15 | **Ícono para origen `text`** (U-12). | Abierta · propuesta: sin ícono |
| Q-16 | **Tareas «todo el día»** (sin hora): no existen en el diseño ni en el modelo. | Abierta · propuesta: fuera de v1 |
| Q-17 | **Mostrar fin de semana/primer día de la semana configurable:** el diseño fija lunes. | Decidida: lunes |
| Q-18 | **Estados vacío, carga y error** (U-4) y **modo oscuro** (U-3). | Abierta · patrón mínimo con tokens |

## Checklist de validación

- [ ] CA-1 a CA-17 verificados (CA-15 y RF-006 con vista día, cuando exista el diseño).
- [ ] Pantallas conforme a `UX/`, en claro y oscuro.
- [ ] Prueba con dos usuarios (aislamiento de tareas) en verde.
- [ ] Fechas verificadas en `America/Bogota` y al menos otra zona (p. ej., con cambio de horario).
- [ ] Sin librerías de calendario.
- [ ] Accesibilidad revisada (teclado y lector de pantalla).
- [ ] Q-1 a Q-18 resueltas o diferidas por escrito.

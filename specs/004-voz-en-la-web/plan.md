# 004 — Voz en la web · Plan técnico

> **Estado:** APROBADO por el humano (2026-11) (Fase 3: Planificar). Depende de `spec.md` aprobada y de la feature 003.
> Respeta `specs/constitution.md`. Es una feature **casi solo de frontend**: el backend y el agente son los de 003.

## 1. Decisiones de arquitectura

| # | Decisión | Motivo | Cubre |
|---|----------|--------|-------|
| D-1 | Reconocimiento con la **Web Speech API** del navegador (`SpeechRecognition` / `webkitSpeechRecognition`); sin servicios de pago ni paquetes de terceros | Constitución §3.1 y P4 | RNF-001 |
| D-2 | **Interfaz propia `SpeechRecognizer`** (iniciar, detener, abortar, eventos de texto parcial, final y error); `WebSpeechRecognizer` es una implementación y `FakeRecognizer` otra | 005 la sustituirá por `@capacitor-community/speech-recognition`; pruebas sin micrófono | RF-019, RNF-005 |
| D-3 | **Máquina de estados** en el hook `useDictation`: `unsupported → idle → requesting → listening → processing → done`, más `error(tipo)` | Estados explícitos, sin banderas sueltas | RF-003, RF-004, RF-012, RF-016 |
| D-4 | `continuous = false` e `interimResults = true`; `lang = 'es-CO'` con alternativa `'es-419'`/`'es'`; `maxAlternatives = 1` | Una frase por dictado; transcripción en vivo | RF-004, RF-008 |
| D-5 | **Temporizador de 30 s** propio que detiene la escucha | Evita micrófonos abiertos | RF-004 |
| D-6 | El texto dictado entra al **mismo estado del asistente** de 003 (`AssistantProvider`) con una marca `origin` (`'voice'` o `'text'`) que sigue al texto; editar a mano lo deja en `voice` si el texto parte del dictado y pasa a `text` si se **reescribe desde cero** | Reutiliza 003; define el origen | RF-006, RF-009 |
| D-7 | Detalle de la regla de origen: el origen es `voice` si el texto enviado **comparte su base** con el dictado (se parte del texto dictado y se edita); si la persona **vacía el campo y escribe**, pasa a `text` | Coherente con Q-4 y CA-9 | RF-009 |
| D-8 | La detección de soporte ocurre **al montar** (`'SpeechRecognition' in window \|\| 'webkitSpeechRecognition' in window`) y cuando no hay contexto seguro (`window.isSecureContext`) | RF-010 incluye despliegues sin HTTPS | RF-010 |
| D-9 | **El audio nunca pasa por nuestro código:** solo se leen los resultados de texto; no se usa `getUserMedia` ni `MediaRecorder` | Privacidad | RF-014 |
| D-10 | La escucha se **aborta** al cerrar el panel, con Esc, al ocultarse la pestaña (`visibilitychange`) y al desmontar | RNF-004 | RF-013 |

## 2. Estructura de archivos afectada

```
app/src/
├── speech/
│   ├── SpeechRecognizer.ts       # interfaz + tipos de evento y de error
│   ├── WebSpeechRecognizer.ts    # implementación con la API del navegador
│   ├── errors.ts                 # traducción de errores → tipo propio + mensaje en español
│   └── useDictation.ts           # hook con la máquina de estados (D-3)
├── assistant/
│   ├── MicButton.tsx             # botón de micrófono (estados, aria-pressed)
│   ├── CommandBar.tsx            # (de 003) + MicButton
│   ├── AssistantPanel.tsx        # (de 003) + «Escuchando…» / «Te escuché» / errores / privacidad
│   └── AssistantProvider.tsx     # (de 003) + origen del texto y conexión con useDictation
app/tests/
├── speech.test.ts, useDictation.test.tsx, dictation-flow.test.tsx
└── fakeRecognizer.ts             # reconocedor simulado
app/e2e/
└── voice.spec.ts                 # reconocedor simulado inyectado en el navegador
```
No hay cambios en el backend ni migraciones: `POST /tasks` ya acepta `source: "voice"` (002).

## 3. Interfaz del reconocedor (D-2)

```ts
type RecognizerError =
  | 'no-speech' | 'audio-capture' | 'not-allowed' | 'service-not-allowed'
  | 'network' | 'language-not-supported' | 'aborted' | 'unknown'

interface SpeechRecognizer {
  readonly supported: boolean
  start(handlers: {
    onStart(): void
    onInterim(text: string): void
    onFinal(text: string): void
    onError(error: RecognizerError): void
    onEnd(): void
  }): void
  stop(): void    // termina y entrega lo oído
  abort(): void   // descarta
}
```
`WebSpeechRecognizer` traduce los eventos del navegador (`onresult`, `onerror`, `onend`, `onstart`). Los textos parciales y finales se unen y se normalizan (espacios).

## 4. Máquina de estados (`useDictation`)

```
unsupported            (sin API o sin contexto seguro)  → solo texto
idle ──start()──▶ requesting ──onStart──▶ listening ──onFinal/onEnd(con texto)──▶ done ──(auto-envío)──▶ processing(agente)
  ▲                    │ onError(not-allowed)                  │ stop() · 30 s · pausa
  │                    ▼                                       ▼
  └─────────────── error(tipo) ◀──────────────────────── onError(otros)
```
- `done` entrega `{ text, origin: 'voice' }` al asistente; este lo envía (RF-006) y muestra «Te escuché…» (RF-007).
- `processing` (agente trabajando) **bloquea** `start()` (RF-016).
- `onEnd` sin texto → `error('no-speech')`.
- Cualquier transición a `error` libera el micrófono (`abort()`).

## 5. Mensajes de error (español, RF-012)

| Tipo | Mensaje (propuesta) | Qué ofrece |
|------|---------------------|------------|
| `no-speech` | «No se oyó nada. Acércate al micrófono e inténtalo de nuevo.» | Reintentar · escribir |
| `audio-capture` | «No encontramos un micrófono disponible o está en uso por otra aplicación.» | Revisar · escribir |
| `not-allowed` / `service-not-allowed` | «El navegador no tiene permiso para usar el micrófono. Actívalo desde el candado de la barra de direcciones.» | Cómo habilitarlo · escribir |
| `network` | «No hay conexión con el servicio de voz del navegador. Revisa tu internet o escribe tu tarea.» | Reintentar · escribir |
| `language-not-supported` | «Tu navegador no ofrece dictado en español.» | Escribir |
| `aborted` | (silencioso: lo provoca la persona) | — |
| `unknown` | «El dictado se interrumpió. Inténtalo de nuevo o escribe tu tarea.» | Reintentar · escribir |

## 6. Compatibilidad

| Navegador (escritorio) | Soporte | Trato |
|------------------------|---------|-------|
| Chrome | Sí (`webkitSpeechRecognition`, servicio de Google; requiere conexión) | **Compuerta** |
| Edge | Sí (servicio de Microsoft; requiere conexión) | **Compuerta** |
| Safari | Parcial | Si está, se usa; si no, RF-010 |
| Firefox | No ofrece la API por defecto | RF-010 |
| Navegadores móviles / Android (WebView) | Fuera de alcance | 005 con plugin nativo |

Se confirma el estado real en el spike T-002 (versiones actuales) y se anota aquí.

## 7. Interfaz

- **`MicButton`**: botón circular verde (de `UX/`), `aria-label` «Dictar una tarea», `aria-pressed` mientras escucha, estado «detener» (Q-10), deshabilitado en `processing` y `unsupported` con explicación accesible (`aria-describedby`).
- **Panel** (de 003): líneas de estado «Escuchando…» (región `aria-live`), transcripción parcial en el campo, «Te escuché · Toca el micrófono para dictar de nuevo.», mensajes de error con acciones, y la línea de privacidad del audio (RF-011).
- **Tema y tokens:** el estado «escuchando» (anillo o pulso del botón) y los de error usan tokens en `tokens.css` (claro y oscuro). Sin diseño oficial (U-24): patrón mínimo y discreto, a la espera de la imagen.
- **Origen:** `AssistantProvider` guarda `origin` junto al texto; `CreateCard` (003) lo usa para `source` al confirmar una tarea agendada (`'voice'` o `'text'`). El ícono de micrófono en el calendario ya existe (002).

## 8. Estrategia de pruebas

Cada prueba cita su `RF-xxx` o `CA-x`.

| Prueba | Cubre |
|--------|-------|
| `speech.test`: traducción de errores del navegador a los tipos propios y a mensajes; unión de parciales y final; normalización de espacios | RF-012, RF-008 |
| `useDictation.test` con `FakeRecognizer`: todas las transiciones; parar con 30 s (temporizador simulado); `no-speech`; `aborted` silencioso; bloqueo en `processing`; doble toque; limpieza al desmontar | RF-003, RF-004, RF-013, RF-016, CA-1, CA-4, CA-13, CA-16 |
| `dictation-flow.test` (interfaz + asistente con API simulada): dictado → texto editable → envío automático → propuesta; corregir y reenviar; origen `voice` al confirmar; origen `text` al reescribir; «Te escuché»; errores con mensajes; sin soporte; sin contexto seguro; cuota → formulario con el texto | RF-005…RF-010, RF-012, RF-015, CA-5…CA-12, CA-15 |
| Sin audio: el código no invoca `getUserMedia` ni `MediaRecorder` (prueba por inspección del módulo y de las llamadas) | RF-014, CA-14 |
| Intercambiabilidad: el flujo funciona con otro `SpeechRecognizer` | RF-019, CA-19 |
| Accesibilidad: `aria-pressed`, anuncios, foco, teclado | RF-018, CA-18 |
| E2E (Playwright): se inyecta un `SpeechRecognition` simulado antes de cargar la página (`addInitScript`) y la ruta del agente se simula; con backend real se confirma y se verifica `source: voice` en la base | CA-1, CA-5, CA-8 |
| **Manual (humano), compuerta:** Chrome y Edge con micrófono real: 5 frases, permiso denegado, sin conexión, silencio, cambio de pestaña | RF-017, CA-17 |

> Playwright usa Chromium sin el servicio de voz de Google: la voz real **no** se prueba de forma automática. Por eso la verificación con micrófono real es manual y obligatoria antes de cerrar la feature.

## 9. Dependencias

Ninguna nueva. (No se añade ningún paquete de reconocimiento de voz.)

## 10. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| La API **no es estándar** y varía por navegador (prefijos, errores, `lang`) | Interfaz propia (D-2); pruebas con simulador; compuerta solo en Chrome y Edge |
| El audio viaja a **Google o Microsoft** (según el navegador) | Aviso visible (RF-011); sin audio propio (D-9); decidir con C-7 si hace falta consentimiento |
| **Requiere internet** y contexto seguro | Mensajes claros; escritura siempre disponible; despliegue con HTTPS |
| **Transcripción imprecisa** (números, nombres) | Texto editable y tarjetas con el detalle exacto y la explicación (003); nada cambia sin confirmar |
| El permiso de micrófono **bloqueado** deja al usuario sin saber qué hacer | Explicación específica con la ruta para habilitarlo |
| Micrófono **abierto** por un error | `abort()` en todos los caminos de salida, 30 s máximo, `visibilitychange` (D-10) |
| La voz real **no se puede automatizar** | Verificación manual obligatoria y documentada en el checklist |
| Gasto de **cuota diaria** por dictados repetidos | Cada envío cuenta (003); la corrección es explícita; el tope de 20 protege |
| Falta de **diseño** para los estados nuevos | Patrón mínimo con tokens; pedir imagen (U-24) |

## 11. Trazabilidad RF → componente

| RF | Componente |
|----|-----------|
| RF-001, RF-018 | `MicButton`, `CommandBar` |
| RF-002, RF-012 | `WebSpeechRecognizer`, `speech/errors.ts`, `AssistantPanel` |
| RF-003, RF-004, RF-013, RF-016 | `useDictation`, `AssistantPanel` |
| RF-005, RF-006, RF-007 | `AssistantProvider`, `AssistantPanel` |
| RF-008 | `WebSpeechRecognizer` (`lang`) |
| RF-009 | `AssistantProvider` (origen), `CreateCard` (`source`) |
| RF-020 | `AssistantProvider` (mismo flujo y tarjetas de 003; la voz no agrega permisos) |
| RF-010, RF-011 | `useDictation` (soporte), `MicButton`, `AssistantPanel` |
| RF-014 | arquitectura (D-9) |
| RF-015 | flujo de 003 con el texto dictado |
| RF-017 | verificación manual |
| RF-019 | `SpeechRecognizer` |

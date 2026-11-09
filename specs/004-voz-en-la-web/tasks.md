# 004 — Voz en la web · Tareas

> **Estado:** APROBADO por el humano (2026-11) (Fase 4: Tareas). T-001 hecha; el resto sin marcar.
> Leyenda: **A** = agente, **H** = humano. Prerrequisito: **003 cerrada** (panel del asistente, tarjetas de acción y agente con herramientas).
> Commits (cuando el humano los pida): `feat(004): T-00x descripción`. El diseño móvil/Android queda fuera.

## Fase A — Decisiones y verificación previa

- [x] **T-001 · H · Aprobar la spec y resolver Q-1…Q-10** (todos)
  Decidir como mínimo: envío automático (Q-1), origen al corregir (Q-4), diseño de estados (Q-5), alcance de navegadores (Q-6) y HTTPS en el despliegue (Q-7).
  **Hecho cuando:** la spec pasa a «APROBADO» sin preguntas bloqueantes.

- [ ] **T-002 · H+A · Spike: soporte real de la Web Speech API** (RF-010, RF-017)
  Página de prueba mínima (en el directorio temporal, no en el proyecto) que detecta la API y muestra los eventos y errores. El **humano** la abre en **Chrome y Edge de escritorio** con micrófono y reporta: versiones, si pide permiso, si reconoce español (`es-CO` y `es`), qué errores salen sin conexión y con el permiso denegado, y si se corta sola por silencio. El agente anota el resultado en `plan.md` §6.
  **Hecho cuando:** la tabla de compatibilidad de `plan.md` está confirmada con datos reales.

## Fase B — Núcleo de voz (sin interfaz)

- [ ] **T-003 · A · Interfaz `SpeechRecognizer`, errores y reconocedor simulado** (RF-012, RF-019, D-2)
  `speech/SpeechRecognizer.ts`, `speech/errors.ts` (tipos y mensajes de `plan.md` §5) y `tests/fakeRecognizer.ts` (controlable desde la prueba: parcial, final, error, fin).
  **Hecho cuando:** `speech.test` pasa. *Depende de T-001.*

- [ ] **T-004 · A · Implementación con la Web Speech API** (RF-002, RF-008, RF-014, D-1, D-4, D-9)
  `WebSpeechRecognizer`: prefijos, `lang` con alternativa, `interimResults`, `continuous = false`, traducción de eventos y errores; **sin** `getUserMedia` ni `MediaRecorder`.
  **Hecho cuando:** pruebas con un doble de la API del navegador pasan y la prueba de «sin audio» confirma que no se llama a esas funciones. *Depende de T-002, T-003.*

- [ ] **T-005 · A · Hook `useDictation` y máquina de estados** (RF-003, RF-004, RF-013, RF-016, D-3, D-5, D-10)
  Estados, temporizador de 30 s, aborto al cerrar/Esc/`visibilitychange`/desmontar, detección de soporte y de contexto seguro, bloqueo mientras el agente trabaja.
  **Hecho cuando:** `useDictation.test` pasa (todas las transiciones, CA-1, CA-4, CA-13, CA-16). *Depende de T-003.*

## Fase C — Interfaz e integración con 003

- [ ] **T-006 · A · `MicButton` y barra de comando** (RF-001, RF-010, RF-018)
  Botón verde del diseño, `aria-label`, `aria-pressed`, estado «detener», deshabilitado/oculto sin soporte con explicación accesible; integrado en `CommandBar`.
  **Hecho cuando:** pruebas de interfaz pasan y la captura coincide con `UX/` (claro y oscuro). *Depende de T-005 y de 003 (T-018).*

- [ ] **T-007 · A · Panel: escuchando, «Te escuché», errores y privacidad** (RF-003, RF-005, RF-007, RF-011, RF-012)
  Estados del panel, transcripción parcial en vivo, «Lo que dijiste (puedes corregirlo)», mensajes y acciones de error, línea de privacidad del audio; patrones mínimos con tokens (U-24).
  **Hecho cuando:** CA-1, CA-3, CA-7, CA-11 y CA-12 pasan. *Depende de T-006.*

- [ ] **T-008 · A · Envío automático, corrección y origen** (RF-006, RF-009, RF-015, D-6, D-7)
  `AssistantProvider` guarda el origen del texto; el dictado terminado se envía solo; corregir y reenviar; `CreateCard` confirma con `source: 'voice' | 'text'`; cuota o tope → formulario con el texto dictado.
  **Hecho cuando:** CA-5, CA-6, CA-8, CA-9 y CA-15 pasan en pruebas de interfaz. *Depende de T-007.*

- [ ] **T-009 · A · Pruebas de flujo, intercambiabilidad y accesibilidad** (RF-018, RF-019, CA-18, CA-19)
  `dictation-flow.test` (flujo completo con el reconocedor simulado), prueba con un segundo reconocedor, teclado y anuncios.
  **Hecho cuando:** todo el frontend en verde. *Depende de T-008.*

- [ ] **T-010 · A · E2E con reconocedor simulado** (CA-1, CA-5, CA-8)
  Playwright inyecta un `SpeechRecognition` simulado (`addInitScript`) y simula la ruta del agente; con el backend real se confirma la propuesta y se comprueba en la base que la tarea quedó con `source = voice`; capturas contra el diseño.
  **Hecho cuando:** E2E en verde. *Depende de T-009.*

## Fase D — Validación con voz real

- [ ] **T-011 · H · Verificación manual en Chrome y Edge** (RF-017, CA-17) — **compuerta**
  Con micrófono real, en cada navegador: 5 frases propias de principio a fin (dictar → tarjeta «Agendar» → confirmar → tarea en el calendario con ícono de micrófono); además una consulta («¿qué tengo el lunes?») y un borrado dictado que **solo ocurre tras confirmar**; además, permiso denegado, sin micrófono, sin conexión y silencio. Anotar versiones, fecha y resultado en `spec.md` §Checklist.
  **Hecho cuando:** el flujo funciona en ambos navegadores. *Depende de T-010.*

- [ ] **T-012 · A · Revisión de accesibilidad y modo oscuro** (RF-018)
  Teclado, anuncios, foco, contraste de los estados nuevos en ambos temas.
  **Hecho cuando:** lista de revisión completada. *Depende de T-009.*

- [ ] **T-013 · H · Validación final de la feature** (todos)
  Recorrer el checklist de `spec.md`; aprobar. Actualizar «Feature activa» en `AGENT.md` a 005.
  **Hecho cuando:** checklist completo y aprobación. *Depende de T-011, T-012.*

## Orden sugerido

`T-001` → `T-002` ∥ `T-003` → `T-004` · `T-003` → `T-005` → `T-006` → `T-007` → `T-008` → `T-009` → `T-010` → `T-011` → `T-013` · `T-012` en paralelo con `T-011`.

## Trazabilidad RF → tareas

| RF | Tareas |
|----|--------|
| RF-001 | T-006 |
| RF-002 | T-004 |
| RF-003 | T-005, T-007 |
| RF-004 | T-005 |
| RF-005 | T-007 |
| RF-006 | T-008 |
| RF-007 | T-007 |
| RF-008 | T-004 |
| RF-009 | T-008 |
| RF-010 | T-002, T-005, T-006 |
| RF-011 | T-007 |
| RF-012 | T-003, T-007 |
| RF-013 | T-005 |
| RF-014 | T-004 |
| RF-015 | T-008 |
| RF-016 | T-005 |
| RF-017 | T-002, T-011 |
| RF-018 | T-006, T-009, T-012 |
| RF-019 | T-003, T-009 |

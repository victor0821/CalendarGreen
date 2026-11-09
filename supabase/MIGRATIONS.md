# Registro de migraciones de Supabase

Las migraciones se aplican **a mano** en el SQL Editor del panel de Supabase (no se usa la CLI), primero en `calendargreen-dev` y, solo después de probarla, en `calendargreen-prod`. Este registro es la única forma de saber qué está aplicado: **anótala justo después de aplicar**.

Reglas (resumen de `AGENT.md` §9 y `specs/constitution.md` §3.4): una migración aplicada no se edita (un cambio nuevo es una migración nueva); toda tabla nueva lleva RLS sin políticas; antes de un cambio destructivo en prod, exporta un dump.

| Archivo | Descripción | Aplicada en dev | Aplicada en prod | Notas |
|---------|-------------|-----------------|------------------|-------|
| `20261102000000_initial_schema.sql` | Tablas `users` y `tasks`, índice, RLS sin políticas | 2026-11-02 (verificada) | pendiente | Feature 000. En dev las tablas y restricciones existen y pasan 9 pruebas de integración. **Pendiente de comprobar a mano:** RLS activo y sin políticas (ver consulta abajo) y el bloque `-- DOWN`. Falta aplicarla en prod (T-015). |
| `20261108000000_task_series_and_reminders.sql` | Tabla `task_series` y columnas `series_id`, `reminder_amount`, `reminder_unit` en `tasks` (enmienda v2 de la feature 002) | 2026-11 (aplicada por el humano; verificada) | pendiente | Escrita el 2026-11-08. Verificada: 18 pruebas de integración y 5 E2E pasan contra dev. Falta aplicarla en prod (junto con el despliegue). Nota: `tasks.reminder_enabled` sigue con `DEFAULT true`, pero la restricción nueva exige antelación si está activo: la API siempre envía ambos; una inserción directa debe indicar `reminder_enabled` o la antelación. |

## Comprobación manual de RLS (ejecutar en el SQL Editor de cada proyecto)

```sql
-- rowsecurity debe ser true en users y tasks
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
-- no debe devolver filas (sin políticas para anon ni authenticated)
select tablename, policyname from pg_policies where schemaname = 'public';
```

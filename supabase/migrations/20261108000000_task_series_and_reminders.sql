-- 20261108000000_task_series_and_reminders.sql
-- Feature 002, enmienda v2 (2026-11-08): tareas que se repiten y antelación del aviso.
--
-- Crea la tabla `task_series` (plantilla de una repetición) y agrega a `tasks`:
--   * series_id        -> a qué serie pertenece (NULL si no se repite),
--   * reminder_amount  -> cuánto antes avisar (número),
--   * reminder_unit    -> unidad del aviso (minutes | hours | days | weeks).
-- `tasks.reminder_enabled` se conserva y pasa a significar «Notificar».
--
-- Cómo aplicarla (la aplica el HUMANO, no el agente):
--   1. Supabase > calendargreen-dev > SQL Editor: pegar todo este archivo y ejecutar.
--   2. Probar. Después repetir en calendargreen-prod (con un dump previo si ya hay datos).
--   3. Anotar el archivo y la fecha en supabase/MIGRATIONS.md.
--
-- Es idempotente: se puede ejecutar de nuevo sin error ni duplicados.
-- Para revertir, ver el bloque `-- DOWN` al final.

-- ---------------------------------------------------------------------------
-- task_series: plantilla de una repetición (las tareas reales viven en `tasks`)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_series (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    repeat_kind      text        NOT NULL,
    repeat_days      smallint[]  NOT NULL,
    starts_on        date        NOT NULL,
    start_minute     smallint    NOT NULL,
    duration_minutes integer     NOT NULL,
    timezone         text        NOT NULL,
    generated_until  timestamptz NOT NULL,
    ends_before      timestamptz,
    title            text        NOT NULL,
    notes            text,
    source           text        NOT NULL DEFAULT 'manual',
    reminder_amount  smallint,
    reminder_unit    text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT task_series_kind_values     CHECK (repeat_kind IN ('weekly', 'weekdays', 'daily', 'custom')),
    CONSTRAINT task_series_days_valid      CHECK (
        cardinality(repeat_days) BETWEEN 1 AND 7
        AND repeat_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
    ),
    CONSTRAINT task_series_start_minute    CHECK (start_minute BETWEEN 0 AND 1439),
    CONSTRAINT task_series_duration_range  CHECK (duration_minutes BETWEEN 5 AND 1440),
    CONSTRAINT task_series_title_length    CHECK (char_length(title) BETWEEN 1 AND 120),
    CONSTRAINT task_series_notes_length    CHECK (notes IS NULL OR char_length(notes) <= 1000),
    CONSTRAINT task_series_source_values   CHECK (source IN ('manual', 'voice', 'text')),
    CONSTRAINT task_series_reminder_unit   CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    CONSTRAINT task_series_reminder_amount CHECK (reminder_amount IS NULL OR reminder_amount BETWEEN 1 AND 60),
    CONSTRAINT task_series_reminder_pair   CHECK ((reminder_amount IS NULL) = (reminder_unit IS NULL))
);

CREATE INDEX IF NOT EXISTS task_series_user_id_idx
    ON public.task_series (user_id);

-- Solo el backend accede (clave service_role): RLS activado y SIN políticas.
ALTER TABLE public.task_series ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- tasks: serie a la que pertenece y antelación del aviso
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS series_id       uuid REFERENCES public.task_series (id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS reminder_amount smallint,
    ADD COLUMN IF NOT EXISTS reminder_unit   text;

-- Relleno de lo existente: antes «Recordarme» avisaba a la hora de la tarea; ahora la antelación
-- es obligatoria si se avisa. Se usa el valor por defecto del diseño (15 minutos).
UPDATE public.tasks
   SET reminder_amount = 15, reminder_unit = 'minutes'
 WHERE reminder_enabled AND reminder_amount IS NULL;

-- Restricciones (se crean solo si no existen, para que repetir la migración no falle).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_reminder_unit_values') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_reminder_unit_values
            CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_reminder_amount_range') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_reminder_amount_range
            CHECK (reminder_amount IS NULL OR reminder_amount BETWEEN 1 AND 60);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_reminder_pair') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_reminder_pair
            CHECK ((reminder_amount IS NULL) = (reminder_unit IS NULL));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_reminder_requires_amount') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_reminder_requires_amount
            CHECK (reminder_enabled = false OR reminder_amount IS NOT NULL);
    END IF;
    -- Una serie no puede tener dos tareas a la misma hora; hace idempotente la renovación.
    -- (Los NULL de series_id no chocan entre sí: las tareas sueltas no se ven afectadas.)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_series_start_unique') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_series_start_unique UNIQUE (series_id, start_at);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS tasks_series_id_idx
    ON public.tasks (series_id);

-- ---------------------------------------------------------------------------
-- DOWN (revertir): ejecutar SOLO en un entorno de pruebas; borra las series y sus repeticiones.
-- ---------------------------------------------------------------------------
-- DELETE FROM public.tasks WHERE series_id IS NOT NULL;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_series_start_unique;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_reminder_requires_amount;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_reminder_pair;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_reminder_amount_range;
-- ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_reminder_unit_values;
-- DROP INDEX IF EXISTS public.tasks_series_id_idx;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS series_id,
--                          DROP COLUMN IF EXISTS reminder_amount,
--                          DROP COLUMN IF EXISTS reminder_unit;
-- DROP TABLE IF EXISTS public.task_series;

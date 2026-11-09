-- 20261102000000_initial_schema.sql
-- Feature 000 (Cimientos): esquema inicial de CalendarGreen.
--
-- Crea las tablas `users` y `tasks` con:
--   * fechas en timestamptz (UTC),
--   * claves, restricciones e índice,
--   * Row Level Security ACTIVADO y SIN políticas para `anon` ni `authenticated`
--     (solo el backend accede, con la clave service_role, que omite RLS).
--
-- Cómo aplicarla (la aplica el HUMANO, no el agente):
--   1. Supabase > calendargreen-dev > SQL Editor: pegar todo este archivo y ejecutar.
--   2. Probar. Después repetir en calendargreen-prod.
--   3. Anotar el archivo y la fecha en supabase/MIGRATIONS.md.
--
-- Es idempotente: se puede ejecutar de nuevo sin error ni duplicados.
-- Para revertir, ver el bloque `-- DOWN` al final.
--
-- Nota: la tabla se llama `users` (plural) porque `user` es palabra reservada en PostgreSQL.
-- Los límites (título 120, notas 1000, duración 5-1440) deben coincidir con specs 001 y 002.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text        NOT NULL UNIQUE,
    password_hash text        NOT NULL,
    timezone      text        NOT NULL DEFAULT 'America/Bogota',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    title            text        NOT NULL,
    start_at         timestamptz NOT NULL,
    duration_minutes integer     NOT NULL DEFAULT 30,
    notes            text,
    completed_at     timestamptz,
    source           text        NOT NULL DEFAULT 'manual',
    reminder_enabled boolean     NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tasks_title_length    CHECK (char_length(title) BETWEEN 1 AND 120),
    CONSTRAINT tasks_notes_length    CHECK (notes IS NULL OR char_length(notes) <= 1000),
    CONSTRAINT tasks_duration_range  CHECK (duration_minutes BETWEEN 5 AND 1440),
    CONSTRAINT tasks_source_values   CHECK (source IN ('manual', 'voice', 'text'))
);

CREATE INDEX IF NOT EXISTS tasks_user_id_start_at_idx
    ON public.tasks (user_id, start_at);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- DOWN (revertir): ejecutar SOLO en un entorno de pruebas; borra todos los datos.
-- ---------------------------------------------------------------------------
-- DROP TABLE IF EXISTS public.tasks;
-- DROP TABLE IF EXISTS public.users;

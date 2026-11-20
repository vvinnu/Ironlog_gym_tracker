
-- ============================================================
-- IRONLOG - MASTER DATABASE SCHEMA v2
-- Full development reset / fresh installation
--
-- WARNING:
-- Drops existing IronLog application tables and data.
-- Does NOT delete Supabase Auth users.
--
-- Run only when ready to apply the new database.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. RESET APPLICATION TABLES
-- ============================================================

DROP TABLE IF EXISTS public.workout_rotation_steps CASCADE;
DROP TABLE IF EXISTS public.workout_rotations CASCADE;
DROP TABLE IF EXISTS public.workout_sets CASCADE;
DROP TABLE IF EXISTS public.workout_exercises CASCADE;
DROP TABLE IF EXISTS public.workouts CASCADE;
DROP TABLE IF EXISTS public.workout_plan_exercises CASCADE;
DROP TABLE IF EXISTS public.workout_plans CASCADE;
DROP TABLE IF EXISTS public.bodyweight_logs CASCADE;
DROP TABLE IF EXISTS public.exercises CASCADE;

DROP FUNCTION IF EXISTS public.ironlog_save_workout(uuid, jsonb, boolean);
DROP FUNCTION IF EXISTS public.ironlog_save_exercise(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.ironlog_check_exercise_access();
DROP FUNCTION IF EXISTS public.ironlog_guard_completed_workout();
DROP FUNCTION IF EXISTS public.ironlog_guard_workout_child();
DROP FUNCTION IF EXISTS public.ironlog_touch_updated_at();
DROP FUNCTION IF EXISTS public.ironlog_snapshot_exercise_name();

-- ============================================================
-- 2. EXERCISE LIBRARY
-- ============================================================

CREATE TABLE public.exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- NULL = shared/global exercise
    -- UUID = private user-created exercise
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

    name text NOT NULL
        CHECK (length(btrim(name)) BETWEEN 1 AND 120),

    primary_muscle text,
    secondary_muscles text[] NOT NULL DEFAULT '{}',
    equipment text,
    notes text NOT NULL DEFAULT '',

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT exercises_primary_muscle_nonblank
        CHECK (
            primary_muscle IS NULL
            OR length(btrim(primary_muscle)) > 0
        ),

    CONSTRAINT exercises_equipment_nonblank
        CHECK (
            equipment IS NULL
            OR length(btrim(equipment)) > 0
        )
);

CREATE UNIQUE INDEX exercises_global_name_unique
ON public.exercises (lower(btrim(name)))
WHERE user_id IS NULL;

CREATE UNIQUE INDEX exercises_personal_name_unique
ON public.exercises (user_id, lower(btrim(name)))
WHERE user_id IS NOT NULL;

CREATE INDEX exercises_owner_idx
ON public.exercises(user_id);

-- ============================================================
-- 3. WORKOUT PLANS / TEMPLATES
-- ============================================================

CREATE TABLE public.workout_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    name text NOT NULL
        CHECK (length(btrim(name)) BETWEEN 1 AND 120),

    notes text NOT NULL DEFAULT '',

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE (id, user_id)
);

CREATE INDEX workout_plans_owner_idx
ON public.workout_plans(user_id);

-- ============================================================
-- 4. EXERCISES INSIDE WORKOUT PLANS
-- ============================================================

CREATE TABLE public.workout_plan_exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    plan_id uuid NOT NULL,

    exercise_id uuid NOT NULL
        REFERENCES public.exercises(id) ON DELETE RESTRICT,

    position integer NOT NULL CHECK (position >= 0),

    target_sets integer CHECK (target_sets > 0),
    target_reps text,

    notes text NOT NULL DEFAULT '',

    FOREIGN KEY (plan_id, user_id)
        REFERENCES public.workout_plans(id, user_id)
        ON DELETE CASCADE,

    UNIQUE (plan_id, position),
    UNIQUE (plan_id, exercise_id)
);

CREATE INDEX workout_plan_exercises_owner_idx
ON public.workout_plan_exercises(user_id);

-- ============================================================
-- 5. WORKOUT ROTATIONS
-- Example: Push -> Pull -> Legs -> Rest
-- ============================================================

CREATE TABLE public.workout_rotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    name text NOT NULL
        CHECK (length(btrim(name)) BETWEEN 1 AND 120),

    is_active boolean NOT NULL DEFAULT false,

    next_position integer NOT NULL DEFAULT 0
        CHECK (next_position >= 0),

    created_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX workout_rotations_one_active
ON public.workout_rotations(user_id)
WHERE is_active;

-- ============================================================
-- 6. ROTATION STEPS
-- ============================================================

CREATE TABLE public.workout_rotation_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    rotation_id uuid NOT NULL,

    position integer NOT NULL CHECK (position >= 0),

    kind text NOT NULL
        CHECK (kind IN ('workout', 'rest')),

    plan_id uuid,

    FOREIGN KEY (rotation_id, user_id)
        REFERENCES public.workout_rotations(id, user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (plan_id, user_id)
        REFERENCES public.workout_plans(id, user_id)
        ON DELETE RESTRICT,

    CHECK (
        (kind = 'rest' AND plan_id IS NULL)
        OR
        (kind = 'workout' AND plan_id IS NOT NULL)
    ),

    UNIQUE (rotation_id, position)
);

-- ============================================================
-- 7. WORKOUT SESSIONS
--
-- draft     = unfinished workout
-- completed = finalized workout
-- ============================================================

CREATE TABLE public.workouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    plan_id uuid,

    workout_date date NOT NULL DEFAULT current_date,

    name text NOT NULL DEFAULT 'Workout'
        CHECK (length(btrim(name)) BETWEEN 1 AND 120),

    notes text NOT NULL DEFAULT '',

    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'completed')),

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    completed_at timestamptz,

    UNIQUE (id, user_id),

    FOREIGN KEY (plan_id, user_id)
        REFERENCES public.workout_plans(id, user_id)
        ON DELETE SET NULL (plan_id),

    CONSTRAINT workouts_completion_consistency CHECK (
        (status = 'draft' AND completed_at IS NULL)
        OR
        (status = 'completed' AND completed_at IS NOT NULL)
    )
);

CREATE INDEX workouts_user_date_idx
ON public.workouts(user_id, workout_date DESC);

CREATE INDEX workouts_user_status_idx
ON public.workouts(user_id, status, created_at DESC);

-- ============================================================
-- 8. EXERCISES ADDED TO AN ACTUAL WORKOUT
--
-- Each row represents one exercise card in the logger.
-- Cards can exist even before any sets are entered.
-- ============================================================

CREATE TABLE public.workout_exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    workout_id uuid NOT NULL,

    exercise_id uuid NOT NULL
        REFERENCES public.exercises(id) ON DELETE RESTRICT,

    -- Historical name snapshot
    exercise_name text NOT NULL,

    position integer NOT NULL CHECK (position >= 0),

    notes text NOT NULL DEFAULT '',

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    FOREIGN KEY (workout_id, user_id)
        REFERENCES public.workouts(id, user_id)
        ON DELETE CASCADE,

    UNIQUE (id, user_id),
    UNIQUE (workout_id, position),
    UNIQUE (workout_id, exercise_id)
);

CREATE INDEX workout_exercises_workout_idx
ON public.workout_exercises(workout_id, position);

CREATE INDEX workout_exercises_user_exercise_idx
ON public.workout_exercises(user_id, exercise_id, created_at DESC);

-- ============================================================
-- 9. WORKOUT SETS
--
-- All measurements are independently optional.
-- At least one measurement must contain a value.
--
-- Blank UI rows are not inserted.
-- ============================================================

CREATE TABLE public.workout_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    workout_exercise_id uuid NOT NULL,

    set_number integer NOT NULL CHECK (set_number > 0),

    weight_kg numeric(8,2)
        CHECK (weight_kg >= 0),

    reps integer
        CHECK (reps > 0),

    duration_seconds integer
        CHECK (duration_seconds > 0),

    distance_km numeric(9,3)
        CHECK (distance_km >= 0),

    notes text NOT NULL DEFAULT '',

    created_at timestamptz NOT NULL DEFAULT now(),

    FOREIGN KEY (workout_exercise_id, user_id)
        REFERENCES public.workout_exercises(id, user_id)
        ON DELETE CASCADE,

    UNIQUE (workout_exercise_id, set_number),

    CONSTRAINT workout_sets_has_value CHECK (
        weight_kg IS NOT NULL
        OR reps IS NOT NULL
        OR duration_seconds IS NOT NULL
        OR distance_km IS NOT NULL
    )
);

CREATE INDEX workout_sets_workout_exercise_idx
ON public.workout_sets(workout_exercise_id);

-- ============================================================
-- 10. BODYWEIGHT LOGS
--
-- Supports morning and bedtime weight check-ins.
-- All weights are stored in kilograms.
-- Users may enter and display weights in kg or lbs.
-- ============================================================

CREATE TABLE public.bodyweight_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 01. Store weight in kilograms regardless of input unit.
    weight_kg numeric(8,4) NOT NULL
        CHECK (weight_kg > 0),

    -- 02. Actual date the user measured their weight.
    measurement_date date NOT NULL DEFAULT current_date,

    -- 03. Morning or bedtime measurement.
    check_in_type text NOT NULL
        CHECK (check_in_type IN ('morning', 'bedtime')),

    -- 04. Timestamp when the entry was created.
    logged_at timestamptz NOT NULL DEFAULT now(),

    -- 05. Prevent duplicate check-ins for the same date.
    CONSTRAINT bodyweight_unique_daily_checkin
        UNIQUE (user_id, measurement_date, check_in_type)
);

-- 06. Optimize retrieval of body-weight history.
CREATE INDEX bodyweight_user_date_idx
ON public.bodyweight_logs(
    user_id,
    measurement_date DESC
);

-- ============================================================
-- 11. AUTOMATIC UPDATED_AT
-- ============================================================

CREATE FUNCTION public.ironlog_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_touch_updated_at();

CREATE TRIGGER workouts_updated_at
BEFORE UPDATE ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_touch_updated_at();

CREATE TRIGGER workout_exercises_updated_at
BEFORE UPDATE ON public.workout_exercises
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_touch_updated_at();

-- ============================================================
-- 12. EXERCISE ACCESS VALIDATION
--
-- Users may reference:
-- 1. Global exercises
-- 2. Their own custom exercises
-- ============================================================

CREATE FUNCTION public.ironlog_check_exercise_access()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.exercises e
        WHERE e.id = NEW.exercise_id
          AND (
              e.user_id IS NULL
              OR e.user_id = NEW.user_id
          )
    ) THEN
        RAISE EXCEPTION
            'Exercise is not available to this user';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER plan_exercise_access
BEFORE INSERT OR UPDATE
ON public.workout_plan_exercises
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_check_exercise_access();

CREATE TRIGGER workout_exercise_access
BEFORE INSERT OR UPDATE
ON public.workout_exercises
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_check_exercise_access();

-- ============================================================
-- 13. EXERCISE NAME SNAPSHOT
--
-- Preserve the name used when the exercise was added.
-- ============================================================

CREATE FUNCTION public.ironlog_snapshot_exercise_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT'
       OR NEW.exercise_id IS DISTINCT FROM OLD.exercise_id
    THEN
        SELECT name
        INTO NEW.exercise_name
        FROM public.exercises
        WHERE id = NEW.exercise_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER workout_exercise_snapshot
BEFORE INSERT OR UPDATE
ON public.workout_exercises
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_snapshot_exercise_name();

-- ============================================================
-- 14. PROTECT COMPLETED WORKOUTS
-- ============================================================

CREATE FUNCTION public.ironlog_guard_completed_workout()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'completed' THEN
            RAISE EXCEPTION
                'Completed workouts cannot be deleted';
        END IF;

        RETURN OLD;
    END IF;

    IF OLD.status = 'completed' THEN
        RAISE EXCEPTION
            'Completed workouts cannot be modified';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION
            'Workout ownership cannot be changed';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER guard_completed_workouts
BEFORE UPDATE OR DELETE
ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_guard_completed_workout();

-- ============================================================
-- 15. PREVENT CHANGING COMPLETED WORKOUT EXERCISES
-- ============================================================

CREATE FUNCTION public.ironlog_guard_workout_child()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_workout_id uuid;
    v_status text;
BEGIN
    IF TG_TABLE_NAME = 'workout_exercises' THEN
        IF TG_OP = 'DELETE' THEN
            v_workout_id := OLD.workout_id;
        ELSE
            v_workout_id := NEW.workout_id;
        END IF;
    ELSE
        IF TG_OP = 'DELETE' THEN
            SELECT workout_id INTO v_workout_id
            FROM public.workout_exercises
            WHERE id = OLD.workout_exercise_id;
        ELSE
            SELECT workout_id INTO v_workout_id
            FROM public.workout_exercises
            WHERE id = NEW.workout_exercise_id;
        END IF;
    END IF;

    SELECT status INTO v_status
    FROM public.workouts
    WHERE id = v_workout_id;

    IF v_status = 'completed' THEN
        RAISE EXCEPTION
            'Completed workout data cannot be modified';
    END IF;

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

CREATE TRIGGER guard_workout_exercises
BEFORE INSERT OR UPDATE OR DELETE
ON public.workout_exercises
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_guard_workout_child();

CREATE TRIGGER guard_workout_sets
BEFORE INSERT OR UPDATE OR DELETE
ON public.workout_sets
FOR EACH ROW
EXECUTE FUNCTION public.ironlog_guard_workout_child();

-- ============================================================
-- 16. ROW LEVEL SECURITY
-- ============================================================

-- Exercise library: shared read, private write
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY exercises_read
ON public.exercises
FOR SELECT TO authenticated
USING (
    user_id IS NULL
    OR user_id = (SELECT auth.uid())
);

CREATE POLICY exercises_insert
ON public.exercises
FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
);

CREATE POLICY exercises_update
ON public.exercises
FOR UPDATE TO authenticated
USING (
    user_id = (SELECT auth.uid())
)
WITH CHECK (
    user_id = (SELECT auth.uid())
);

CREATE POLICY exercises_delete
ON public.exercises
FOR DELETE TO authenticated
USING (
    user_id = (SELECT auth.uid())
);

-- Workout plans
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_owner
ON public.workout_plans
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Workout plan exercises
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_exercises_owner
ON public.workout_plan_exercises
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Rotations
ALTER TABLE public.workout_rotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY rotations_owner
ON public.workout_rotations
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Rotation steps
ALTER TABLE public.workout_rotation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY rotation_steps_owner
ON public.workout_rotation_steps
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Workouts
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY workouts_owner
ON public.workouts
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Workout exercises
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_exercises_owner
ON public.workout_exercises
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Workout sets
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_sets_owner
ON public.workout_sets
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Bodyweight
ALTER TABLE public.bodyweight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY bodyweight_owner
ON public.bodyweight_logs
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- 17. ATOMIC WORKOUT DRAFT / COMPLETION SAVE
--
-- Client calls public.ironlog_save_session with:
--   p_workout_id: existing draft UUID, or NULL for a new draft
--   p_name, p_workout_date, p_notes: session metadata
--   p_exercises: JSON array of exercises and their sets
--   p_complete: FALSE to save draft, TRUE to complete workout
-- ============================================================

CREATE OR REPLACE FUNCTION public.ironlog_save_session(
    p_workout_id uuid,
    p_name text,
    p_workout_date date,
    p_notes text,
    p_exercises jsonb,
    p_complete boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_workout_id uuid;
    v_exercise jsonb;
    v_set jsonb;
    v_exercise_id uuid;
    v_card_id uuid;
    v_position integer := 0;
    v_set_number integer;
    v_weight numeric;
    v_reps integer;
    v_duration integer;
    v_distance numeric;
    v_total_sets integer := 0;
    v_seen_exercises uuid[] := ARRAY[]::uuid[];
    v_seen_sets integer[];
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'You must be signed in to save a workout';
    END IF;

    IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 120 THEN
        RAISE EXCEPTION
            'Workout name must be between 1 and 120 characters';
    END IF;

    IF p_workout_date IS NULL THEN
        RAISE EXCEPTION 'Workout date is required';
    END IF;

    IF p_exercises IS NULL
       OR jsonb_typeof(p_exercises) <> 'array' THEN
        RAISE EXCEPTION 'Exercises must be a JSON array';
    END IF;

    IF p_complete IS NULL THEN
        RAISE EXCEPTION 'Completion flag is required';
    END IF;

    -- Lock existing drafts against concurrent changes.
    IF p_workout_id IS NULL THEN
        INSERT INTO public.workouts
            (user_id, name, workout_date, notes, status)
        VALUES
            (
                v_user_id,
                btrim(p_name),
                p_workout_date,
                coalesce(p_notes, ''),
                'draft'
            )
        RETURNING id INTO v_workout_id;
    ELSE
        SELECT id INTO v_workout_id
        FROM public.workouts
        WHERE id = p_workout_id
          AND user_id = v_user_id
          AND status = 'draft'
        FOR UPDATE;

        IF v_workout_id IS NULL THEN
            RAISE EXCEPTION
                'Draft workout not found or already completed';
        END IF;

        UPDATE public.workouts
        SET name = btrim(p_name),
            workout_date = p_workout_date,
            notes = coalesce(p_notes, '')
        WHERE id = v_workout_id;

        -- Replace draft exercise cards and sets atomically.
        DELETE FROM public.workout_exercises
        WHERE workout_id = v_workout_id
          AND user_id = v_user_id;
    END IF;

    FOR v_exercise IN
        SELECT value
        FROM jsonb_array_elements(p_exercises)
    LOOP
        IF jsonb_typeof(v_exercise) <> 'object'
           OR coalesce(v_exercise->>'exercise_id', '') = ''
           OR jsonb_typeof(v_exercise->'sets') <> 'array'
        THEN
            RAISE EXCEPTION
                'Each exercise needs exercise_id and a sets array';
        END IF;

        v_exercise_id :=
            (v_exercise->>'exercise_id')::uuid;

        IF v_exercise_id = ANY(v_seen_exercises) THEN
            RAISE EXCEPTION 'Duplicate exercise in workout';
        END IF;

        v_seen_exercises :=
            array_append(v_seen_exercises, v_exercise_id);

        INSERT INTO public.workout_exercises
            (
                user_id,
                workout_id,
                exercise_id,
                exercise_name,
                position
            )
        VALUES
            (
                v_user_id,
                v_workout_id,
                v_exercise_id,
                '',
                v_position
            )
        RETURNING id INTO v_card_id;

        v_position := v_position + 1;
        v_seen_sets := ARRAY[]::integer[];

        FOR v_set IN
            SELECT value
            FROM jsonb_array_elements(v_exercise->'sets')
        LOOP
            IF jsonb_typeof(v_set) <> 'object' THEN
                RAISE EXCEPTION
                    'Each set must be a JSON object';
            END IF;

            v_set_number :=
                (v_set->>'set_number')::integer;

            IF v_set_number IS NULL
               OR v_set_number <= 0
               OR v_set_number = ANY(v_seen_sets)
            THEN
                RAISE EXCEPTION
                    'Set numbers must be unique positive integers';
            END IF;

            v_seen_sets :=
                array_append(v_seen_sets, v_set_number);

            v_weight :=
                nullif(v_set->>'weight_kg', '')::numeric;

            v_reps :=
                nullif(v_set->>'reps', '')::integer;

            v_duration :=
                nullif(v_set->>'duration_seconds', '')::integer;

            v_distance :=
                nullif(v_set->>'distance_km', '')::numeric;

            INSERT INTO public.workout_sets
                (
                    user_id,
                    workout_exercise_id,
                    set_number,
                    weight_kg,
                    reps,
                    duration_seconds,
                    distance_km
                )
            VALUES
                (
                    v_user_id,
                    v_card_id,
                    v_set_number,
                    v_weight,
                    v_reps,
                    v_duration,
                    v_distance
                );

            v_total_sets := v_total_sets + 1;
        END LOOP;
    END LOOP;

    IF p_complete THEN
        IF v_total_sets = 0 THEN
            RAISE EXCEPTION
                'Record at least one set before completing a workout';
        END IF;

        UPDATE public.workouts
        SET status = 'completed',
            completed_at = now()
        WHERE id = v_workout_id
          AND user_id = v_user_id;
    END IF;

    RETURN v_workout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ironlog_save_session(
    uuid, text, date, text, jsonb, boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ironlog_save_session(
    uuid, text, date, text, jsonb, boolean
) TO authenticated;

COMMIT;

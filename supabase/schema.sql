-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Every personal record is protected by Row Level Security (RLS).

create extension if not exists pgcrypto;

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null default current_date,
  name text not null default 'Workout',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null check (set_number > 0),
  weight_kg numeric(7,2) not null check (weight_kg >= 0),
  reps integer not null check (reps > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.bodyweight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(6,2) not null check (weight_kg > 0),
  logged_at timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts(user_id, workout_date desc);
create index if not exists workout_sets_workout_idx on public.workout_sets(workout_id);
create index if not exists bodyweight_user_date_idx on public.bodyweight_logs(user_id, logged_at);

alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.bodyweight_logs enable row level security;

drop policy if exists "Users manage their workouts" on public.workouts;
create policy "Users manage their workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their sets" on public.workout_sets;
create policy "Users manage their sets" on public.workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their bodyweight" on public.bodyweight_logs;
create policy "Users manage their bodyweight" on public.bodyweight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

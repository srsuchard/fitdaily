-- 0002_fitness_domain.sql
-- FitDaily domain tables: generated workouts + completion history (streaks).
--
-- Reuses the trust model established in 0001_init_rls.sql:
--   * Client authenticates as `authenticated`; every row is owner-scoped via RLS.
--   * Entitlement ('free' | 'premium') lives on public.profiles and is written
--     ONLY by the RevenueCat webhook (service_role). The client cannot forge it.
--   * Premium-only behavior (AI-generated workouts) is enforced by a BEFORE
--     INSERT trigger, NOT by the client.
--
-- Apply with: supabase db push

-- ---------------------------------------------------------------------------
-- daily_workouts: one generated/assigned plan per user per day.
-- The full structured plan is stored as JSONB (matches the WorkoutPlan type).
-- ---------------------------------------------------------------------------
create table if not exists public.daily_workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  workout_date  date not null default current_date,
  title         varchar not null,
  focus         varchar,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  -- True for LLM-generated plans (premium); false for free templates.
  ai_generated  boolean not null default false,
  -- The structured WorkoutPlan payload (blocks/exercises).
  plan          jsonb not null,
  created_at    timestamptz not null default now(),
  unique (user_id, workout_date)
);

create index if not exists daily_workouts_user_date_idx
  on public.daily_workouts (user_id, workout_date desc);

alter table public.daily_workouts enable row level security;
alter table public.daily_workouts force row level security;

create policy "daily_workouts_select_own"
  on public.daily_workouts for select
  to authenticated
  using (user_id = auth.uid());

create policy "daily_workouts_insert_own"
  on public.daily_workouts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "daily_workouts_update_own"
  on public.daily_workouts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "daily_workouts_delete_own"
  on public.daily_workouts for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Premium gate: only premium users may store AI-generated workouts.
-- Free users can still save the 3 free templates (ai_generated = false).
-- Enforced server-side so a tampered client cannot bypass the paywall.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_premium_ai_workout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_premium boolean;
begin
  if not new.ai_generated then
    return new;  -- free templates are always allowed
  end if;

  select (entitlement = 'premium'
          and (entitlement_expires_at is null or entitlement_expires_at > now()))
    into is_premium
    from public.profiles
    where id = new.user_id;

  if not coalesce(is_premium, false) then
    raise exception 'AI-generated workouts require premium_access.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists daily_workouts_premium_ai on public.daily_workouts;
create trigger daily_workouts_premium_ai
  before insert on public.daily_workouts
  for each row execute function public.enforce_premium_ai_workout();

-- ---------------------------------------------------------------------------
-- workout_completions: one row per completed day. Drives streak metrics.
-- ---------------------------------------------------------------------------
create table if not exists public.workout_completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  completed_on  date not null default current_date,
  plan_title    varchar not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  created_at    timestamptz not null default now(),
  -- One completion per day keeps streak math unambiguous.
  unique (user_id, completed_on)
);

create index if not exists workout_completions_user_date_idx
  on public.workout_completions (user_id, completed_on desc);

alter table public.workout_completions enable row level security;
alter table public.workout_completions force row level security;

create policy "workout_completions_select_own"
  on public.workout_completions for select
  to authenticated
  using (user_id = auth.uid());

create policy "workout_completions_insert_own"
  on public.workout_completions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "workout_completions_update_own"
  on public.workout_completions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "workout_completions_delete_own"
  on public.workout_completions for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- current_streak(): consecutive days ending today (or yesterday if today
-- isn't done yet). Exposed as an RPC the client can call.
-- ---------------------------------------------------------------------------
create or replace function public.current_streak()
returns integer
language plpgsql
security invoker  -- runs as the caller, so RLS scopes rows to them
set search_path = public
as $$
declare
  streak integer := 0;
  probe  date := current_date;
begin
  -- If today isn't completed, start counting from yesterday.
  if not exists (
    select 1 from public.workout_completions
    where user_id = auth.uid() and completed_on = probe
  ) then
    probe := probe - 1;
  end if;

  while exists (
    select 1 from public.workout_completions
    where user_id = auth.uid() and completed_on = probe
  ) loop
    streak := streak + 1;
    probe := probe - 1;
  end loop;

  return streak;
end;
$$;

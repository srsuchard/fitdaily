-- supabase/seed.sql
-- Test data loaded automatically by `supabase db reset` (after migrations).
--
-- NOTE: `supabase db reset` runs against a LOCAL Supabase stack, which needs
-- Docker + `supabase start`. It is NOT meant to run against the cloud project.
-- Seeding inserts real auth.users rows; the handle_new_user trigger (0001) then
-- creates the matching public.profiles rows, so we only set extra fields here.

create extension if not exists pgcrypto;

-- Two demo users. Passwords are 'password123'.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'free@fitdaily.test', crypt('password123', gen_salt('bf')), now(),
   now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'premium@fitdaily.test', crypt('password123', gen_salt('bf')), now(),
   now(), now(), '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

-- Promote the second user to premium (server-side seed bypasses RLS).
update public.profiles
  set entitlement = 'premium'
  where id = '22222222-2222-2222-2222-222222222222';

-- A free-tier template workout (ai_generated = false passes the premium gate).
insert into public.daily_workouts (user_id, workout_date, title, focus, estimated_minutes, ai_generated, plan)
values
  ('11111111-1111-1111-1111-111111111111', current_date, 'Quick Full-Body', 'Full-body', 15, false,
   '{"title":"Quick Full-Body","focus":"Full-body","estimatedMinutes":15,"aiGenerated":false,"blocks":[{"title":"Circuit","exercises":[{"name":"Squat","sets":3,"reps":15},{"name":"Push-up","sets":3,"reps":10}]}]}'::jsonb),
  -- Premium user can store an AI-generated workout (gate allows it).
  ('22222222-2222-2222-2222-222222222222', current_date, 'AI Full-Body', 'Full-body', 30, true,
   '{"title":"AI Full-Body","focus":"Full-body","estimatedMinutes":30,"aiGenerated":true,"blocks":[{"title":"Main set","exercises":[{"name":"Goblet squat","sets":4,"reps":12}]}]}'::jsonb)
on conflict (user_id, workout_date) do nothing;

-- A 3-day completion streak for the premium user.
insert into public.workout_completions (user_id, completed_on, plan_title, duration_minutes)
values
  ('22222222-2222-2222-2222-222222222222', current_date,        'AI Full-Body', 28),
  ('22222222-2222-2222-2222-222222222222', current_date - 1,    'AI Full-Body', 31),
  ('22222222-2222-2222-2222-222222222222', current_date - 2,    'AI Full-Body', 25)
on conflict (user_id, completed_on) do nothing;

-- 0004_profile_preferences.sql
-- Add a JSONB preferences bag to profiles so per-user settings sync across
-- devices: last difficulty feedback, reminder preference, etc.
--
-- The existing profiles_update_own_non_entitlement policy (0001) already lets a
-- user update their own row as long as entitlement fields are unchanged, so no
-- new policy is needed — writing `preferences` is permitted.

alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

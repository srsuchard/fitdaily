-- 0003_drop_user_app_data.sql
-- Remove the leftover subscription-tracker domain from 0001_init_rls.sql.
--
-- 0001 shipped a generic `user_app_data` table (service_name / cost /
-- renewal_date) plus a free-tier-limit trigger. FitDaily's actual domain lives
-- in 0002 (daily_workouts, workout_completions), so this table and its
-- trigger/function are dead weight. The profiles + entitlement + RLS plumbing
-- from 0001 is still in use and is intentionally left untouched.
--
-- Idempotent: safe to run even if the objects were never created.
-- Apply with: supabase db push

-- Drop the trigger first (it references the table + function).
drop trigger if exists user_app_data_free_tier_limit on public.user_app_data;

-- Drop the table. Its RLS policies and indexes are dropped automatically.
drop table if exists public.user_app_data;

-- Finally drop the now-orphaned trigger function.
drop function if exists public.enforce_free_tier_limit();

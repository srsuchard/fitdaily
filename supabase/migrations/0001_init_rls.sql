-- 0001_init_rls.sql
-- Schema + Row-Level Security for the micro-SaaS subscription app.
--
-- Trust model:
--   * The mobile client authenticates as the `authenticated` role (a real auth.users row).
--   * Entitlement state is written ONLY by the RevenueCat webhook, which calls Supabase
--     with the service_role key. service_role bypasses RLS, so the client can never forge it.
--   * The free-tier limit (3 entries) is enforced by a BEFORE INSERT trigger, not the client.
--
-- Apply with: supabase db push   (or paste into the SQL editor)

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         varchar not null unique,
  -- Server-owned. Mirrors the RevenueCat "premium_access" entitlement.
  -- 'free' | 'premium'. The client can READ this but never WRITE it.
  entitlement   varchar not null default 'free'
                  check (entitlement in ('free', 'premium')),
  -- When the current entitlement period ends (null for free / lifetime).
  entitlement_expires_at timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- Force RLS even for the table owner; only service_role (BYPASSRLS) gets through.
alter table public.profiles force row level security;

-- A user can read their own profile row.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- A user can update their own profile, BUT cannot change server-owned fields.
-- The WITH CHECK re-reads the proposed row; we compare entitlement fields against
-- their current values to block tampering.
create policy "profiles_update_own_non_entitlement"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and entitlement = (select p.entitlement
                         from public.profiles p where p.id = auth.uid())
    and entitlement_expires_at is not distinct from
        (select p.entitlement_expires_at
           from public.profiles p where p.id = auth.uid())
  );

-- No INSERT/DELETE policy for `authenticated` => those are denied.
-- Profile rows are created by the trigger below (service-definer), and deletion
-- cascades from auth.users.

-- ---------------------------------------------------------------------------
-- Auto-create a profile when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- user_app_data  (the actual app records — e.g. tracked subscriptions)
-- ---------------------------------------------------------------------------
create table if not exists public.user_app_data (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  service_name  varchar not null,
  cost          numeric not null check (cost >= 0),
  renewal_date  date not null,
  created_at    timestamptz not null default now()
);

create index if not exists user_app_data_user_id_idx
  on public.user_app_data (user_id);

alter table public.user_app_data enable row level security;
alter table public.user_app_data force row level security;

-- Full CRUD, but every row is scoped to its owner on both read and write.
create policy "user_app_data_select_own"
  on public.user_app_data for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_app_data_insert_own"
  on public.user_app_data for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_app_data_update_own"
  on public.user_app_data for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_app_data_delete_own"
  on public.user_app_data for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Free-tier limit: enforce max 3 entries unless the user is premium.
-- Enforced server-side so a tampered client cannot exceed it.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_free_tier_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_premium boolean;
  entry_count integer;
begin
  select (entitlement = 'premium'
          and (entitlement_expires_at is null or entitlement_expires_at > now()))
    into is_premium
    from public.profiles
    where id = new.user_id;

  if coalesce(is_premium, false) then
    return new;  -- premium: no cap
  end if;

  select count(*) into entry_count
    from public.user_app_data
    where user_id = new.user_id;

  if entry_count >= 3 then
    raise exception 'Free tier limit reached (3 entries). Upgrade to premium_access.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists user_app_data_free_tier_limit on public.user_app_data;
create trigger user_app_data_free_tier_limit
  before insert on public.user_app_data
  for each row execute function public.enforce_free_tier_limit();

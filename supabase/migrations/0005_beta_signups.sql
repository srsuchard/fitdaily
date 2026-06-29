-- 0005_beta_signups.sql
-- Public beta-tester waitlist captured by the marketing landing page (/marketing).
--
-- Trust model (differs from the app's owner-scoped tables in 0002):
--   * The landing page is unauthenticated, so inserts come from the `anon` role
--     using the public anon/publishable key.
--   * `anon` may INSERT only. There is deliberately NO select/update/delete policy,
--     so the public key CANNOT read, change, or harvest the waitlist — emails are
--     readable only via the dashboard or service_role.
--   * Column values are length-checked so a tampered client cannot dump large blobs.
--
-- Apply with: supabase db push
-- Read the list later: dashboard SQL editor →  select * from public.beta_signups order by created_at desc;

create table if not exists public.beta_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text,
  user_agent  text,
  referrer    text,
  created_at  timestamptz not null default now(),
  -- One row per email; the client treats a duplicate as "already on the list".
  unique (email),
  constraint beta_signups_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint beta_signups_email_len    check (char_length(email) <= 320),
  constraint beta_signups_source_len   check (source is null or char_length(source) <= 64),
  constraint beta_signups_ua_len       check (user_agent is null or char_length(user_agent) <= 512),
  constraint beta_signups_ref_len      check (referrer is null or char_length(referrer) <= 1024)
);

create index if not exists beta_signups_created_idx
  on public.beta_signups (created_at desc);

alter table public.beta_signups enable row level security;
alter table public.beta_signups force row level security;

-- Anyone (the public landing page) may add themselves to the waitlist...
create policy "beta_signups_insert_anon"
  on public.beta_signups for insert
  to anon, authenticated
  with check (true);

-- ...but no SELECT/UPDATE/DELETE policy exists, so the waitlist is write-only
-- for the public key. Only service_role / the dashboard can read it.

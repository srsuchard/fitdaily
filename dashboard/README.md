# FitDaily · Live Metrics Dashboard

A tiny local web dashboard that shows **live FitDaily metrics** pulled from your
Supabase backend (with RevenueCat data folded in via `profiles.entitlement`).

It auto-refreshes every 15 seconds and shows:

- **Beta waitlist** — total signups, today / 7d / 30d, a 30-day bar chart, top sources
- **Users & subscriptions** — total users, active premium, free, premium expiring ≤ 7 days
- **Engagement** — active users (7d), completions today/week, workouts generated (AI share), total completions
- **RevenueCat (optional)** — live revenue $ / MRR / trials if you add API keys

## Why it needs a server (and not just the browser)

Your Supabase Row-Level Security makes `beta_signups` write-only for the public
`anon` key and scopes every other table to its owner. So a browser using the
anon key **cannot** read aggregate numbers. The dashboard runs a small Node
server that uses the **service_role key** (which bypasses RLS) to compute the
aggregates. That key stays on the server — the browser only ever receives the
finished numbers.

## Setup

1. Copy the env template and add your service_role key:

   ```bash
   cp dashboard/.env.example dashboard/.env
   ```

   Get the key from **Supabase → Project Settings → API → `service_role`** and
   paste it as `SUPABASE_SERVICE_ROLE_KEY`. (The Supabase URL is auto-read from
   the project root `.env`.)

2. Start it:

   ```bash
   npm run dashboard
   ```

3. Open **http://localhost:4310**

## Optional: live RevenueCat revenue

Subscription counts already work without RevenueCat (they come from the
`entitlement` column your webhook keeps in sync). To also show revenue / MRR,
add to `dashboard/.env`:

```
REVENUECAT_SECRET_KEY=sk_...     # RevenueCat → API keys → Secret API key (v2)
REVENUECAT_PROJECT_ID=...
```

## Notes

- No extra dependencies — uses `@supabase/supabase-js` (already in the app) and
  Node's built-in http server.
- `dashboard/.env` is gitignored. Never commit the service_role key.

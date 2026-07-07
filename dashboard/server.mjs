// FitDaily live metrics dashboard — server.
//
// A tiny zero-extra-dependency Node server that reads AGGREGATE metrics from
// Supabase using the service_role key and serves them to a live-refreshing web
// page. The service_role key bypasses RLS, so it MUST stay server-side — it is
// never sent to the browser. The browser only ever sees the computed numbers.
//
// Run:  npm run dashboard   (then open http://localhost:4310)
// Env:  dashboard/.env  (see dashboard/.env.example)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- Minimal .env loader (no dotenv dependency) --------------------------------
// Loads the project root .env first (for the Supabase URL) then dashboard/.env
// (which holds the secret service_role key and overrides anything above).
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnvFile(join(__dirname, '.env')); // takes precedence (loaded first, undefined-guarded)
loadEnvFile(join(ROOT, '.env')); // fallback for shared values like the Supabase URL

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const PORT = Number(process.env.DASHBOARD_PORT || 4310);

// Optional live RevenueCat overview metrics (revenue $, active subs, trials).
const RC_SECRET = process.env.REVENUECAT_SECRET_KEY; // v2 secret API key (sk_...)
const RC_PROJECT_ID = process.env.REVENUECAT_PROJECT_ID;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '\n[dashboard] Missing config. You need:\n' +
      '  SUPABASE_URL                (auto-read from project .env if present)\n' +
      '  SUPABASE_SERVICE_ROLE_KEY   (Supabase → Project Settings → API → service_role)\n\n' +
      'Add them to dashboard/.env — see dashboard/.env.example.\n'
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- helpers -------------------------------------------------------------------
const iso = (d) => d.toISOString();
const startOfTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
const daysAgo = (n) => {
  const d = startOfTodayUTC();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};
const ymd = (d) => d.toISOString().slice(0, 10);

/** exact row count with an optional filter builder, without pulling rows. */
async function count(table, apply = (q) => q) {
  const { count: c, error } = await apply(
    sb.from(table).select('*', { count: 'exact', head: true })
  );
  if (error) throw new Error(`${table}: ${error.message}`);
  return c ?? 0;
}

async function safe(promise, fallback) {
  try {
    return await promise;
  } catch (e) {
    return { __error: String(e?.message || e), value: fallback };
  }
}

// --- metric computations -------------------------------------------------------
async function betaSignups() {
  const [total, today, last7, last30] = await Promise.all([
    count('beta_signups'),
    count('beta_signups', (q) => q.gte('created_at', iso(startOfTodayUTC()))),
    count('beta_signups', (q) => q.gte('created_at', iso(daysAgo(7)))),
    count('beta_signups', (q) => q.gte('created_at', iso(daysAgo(30)))),
  ]);

  // 30-day daily time series + source breakdown (one row fetch).
  const { data, error } = await sb
    .from('beta_signups')
    .select('created_at, source')
    .gte('created_at', iso(daysAgo(29)))
    .order('created_at', { ascending: true });
  if (error) throw new Error(`beta_signups series: ${error.message}`);

  const buckets = new Map();
  for (let i = 29; i >= 0; i--) buckets.set(ymd(daysAgo(i)), 0);
  const sources = new Map();
  for (const row of data || []) {
    const key = ymd(new Date(row.created_at));
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
    const s = row.source || 'unknown';
    sources.set(s, (sources.get(s) || 0) + 1);
  }
  const series = [...buckets.entries()].map(([date, n]) => ({ date, n }));
  const topSources = [...sources.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([source, n]) => ({ source, n }));

  return { total, today, last7, last30, series, topSources };
}

async function users() {
  const nowIso = iso(new Date());
  const in7 = iso(daysAgo(-7)); // 7 days in the future

  const [total, premium, newToday, new7, expiringSoon] = await Promise.all([
    count('profiles'),
    count('profiles', (q) =>
      q
        .eq('entitlement', 'premium')
        .or(`entitlement_expires_at.is.null,entitlement_expires_at.gt.${nowIso}`)
    ),
    count('profiles', (q) => q.gte('created_at', iso(startOfTodayUTC()))),
    count('profiles', (q) => q.gte('created_at', iso(daysAgo(7)))),
    count('profiles', (q) =>
      q
        .eq('entitlement', 'premium')
        .gt('entitlement_expires_at', nowIso)
        .lt('entitlement_expires_at', in7)
    ),
  ]);

  // Cumulative "total users over time": new-per-day for the last 30 days, seeded
  // by the count of users created before the window so the line reflects the
  // running total (not just the last month's growth).
  const { data, error } = await sb
    .from('profiles')
    .select('created_at')
    .gte('created_at', iso(daysAgo(29)))
    .order('created_at', { ascending: true });
  if (error) throw new Error(`profiles series: ${error.message}`);

  const perDay = new Map();
  for (let i = 29; i >= 0; i--) perDay.set(ymd(daysAgo(i)), 0);
  for (const row of data || []) {
    const key = ymd(new Date(row.created_at));
    if (perDay.has(key)) perDay.set(key, perDay.get(key) + 1);
  }
  const inWindow = (data || []).length;
  let running = total - inWindow; // users that existed before the 30-day window
  const growth = [...perDay.entries()].map(([date, added]) => {
    running += added;
    return { date, total: running, added };
  });

  return {
    total,
    premium,
    free: total - premium,
    newToday,
    new7,
    expiringSoon,
    growth,
  };
}

async function engagement() {
  const [
    workoutsTotal,
    aiWorkouts,
    completionsTotal,
    completionsToday,
    completions7,
  ] = await Promise.all([
    count('daily_workouts'),
    count('daily_workouts', (q) => q.eq('ai_generated', true)),
    count('workout_completions'),
    count('workout_completions', (q) =>
      q.gte('completed_on', ymd(startOfTodayUTC()))
    ),
    count('workout_completions', (q) => q.gte('completed_on', ymd(daysAgo(7)))),
  ]);

  // Active users = distinct users with a completion in the last 7 days.
  const { data, error } = await sb
    .from('workout_completions')
    .select('user_id')
    .gte('completed_on', ymd(daysAgo(7)));
  if (error) throw new Error(`active users: ${error.message}`);
  const activeUsers7 = new Set((data || []).map((r) => r.user_id)).size;

  return {
    workoutsTotal,
    aiWorkouts,
    completionsTotal,
    completionsToday,
    completions7,
    activeUsers7,
  };
}

async function revenuecat() {
  if (!RC_SECRET || !RC_PROJECT_ID) return { configured: false };
  const res = await fetch(
    `https://api.revenuecat.com/v2/projects/${RC_PROJECT_ID}/metrics/overview`,
    { headers: { Authorization: `Bearer ${RC_SECRET}` } }
  );
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw.slice(0, 200);
    try {
      const j = JSON.parse(raw);
      if (j.message) msg = j.message; // RevenueCat's own explanation is clearest
    } catch {
      /* keep raw text */
    }
    throw new Error(`RevenueCat ${res.status}: ${msg}`);
  }
  const body = await res.json();
  const metrics = (body.metrics || []).map((m) => ({
    id: m.id,
    name: m.name || m.id,
    value: m.value,
    unit: m.unit || '', // currency symbol like "$" / "€", or "%", or ""
    period: m.period || '', // ISO-8601 duration, e.g. "P0D" (current) / "P28D"
  }));
  return { configured: true, currency: body.currency || '', metrics };
}

async function computeMetrics() {
  const [beta, usr, eng, rc] = await Promise.all([
    safe(betaSignups(), {}),
    safe(users(), {}),
    safe(engagement(), {}),
    safe(revenuecat(), { configured: false }),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    beta,
    users: usr,
    engagement: eng,
    revenuecat: rc,
  };
}

// --- http server ---------------------------------------------------------------
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/api/metrics') {
      const data = await computeMetrics();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(data));
      return;
    }
    // static: only serve index.html from ./public
    const html = await readFile(join(__dirname, 'public', 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
});

server.listen(PORT, () => {
  console.log(`\n  FitDaily live metrics → http://localhost:${PORT}`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(
    `  RevenueCat live API: ${RC_SECRET && RC_PROJECT_ID ? 'on' : 'off (using Supabase entitlements)'}\n`
  );
});

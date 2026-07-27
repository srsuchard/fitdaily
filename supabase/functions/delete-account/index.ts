// Supabase Edge Function: delete-account
//
// Permanently deletes the calling user's account. The client POSTs its auth
// JWT; this function verifies the user, then deletes the auth.users row with
// the SERVICE ROLE key. Every app table (profiles, daily_workouts,
// workout_completions, user_app_data) is `on delete cascade` from
// auth.users -> profiles, so removing the auth user removes ALL their data.
//
// Deleting an auth user REQUIRES the service role (auth.admin) — it can never
// be done with the anon key from the client, which is exactly why this lives
// server-side.
//
// Deploy:
//   supabase functions deploy delete-account
// Secrets: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are all
// injected automatically by the platform — nothing to set.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

  // 1. Verify the caller with their own JWT (anon client scoped to their token).
  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await asUser.auth.getUser();
  if (userErr || !user) return json({ error: 'Invalid token' }, 401);

  // 2. Delete the user with the service role — cascades to all their rows.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return json({ error: 'Failed to delete account', detail: delErr.message }, 500);
  }

  return json({ deleted: true });
});

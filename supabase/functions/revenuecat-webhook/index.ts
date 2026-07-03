// Supabase Edge Function: revenuecat-webhook
//
// Receives RevenueCat webhook events and syncs the server-owned
// `profiles.entitlement` column (the source of truth the generate-workout
// function gates AI workouts on). The client only ever READS entitlement; it is
// written ONLY here, with the service role — so a tampered client can't forge it.
//
// Mapping: the app configures RevenueCat with the Supabase user id as the
// RevenueCat App User ID (see initPurchases(session.user.id)). So an event's
// `app_user_id` equals `profiles.id`.
//
// Security: RevenueCat is configured to send a fixed `Authorization` header
// (a shared secret). We reject anything that doesn't match REVENUECAT_WEBHOOK_SECRET.
//
// Deploy (must skip the platform JWT gate — RevenueCat sends its own header):
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secrets:
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<the same value set in RevenueCat>
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;

const ENTITLEMENT_ID = 'premium_access';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface RCEvent {
  type: string;
  app_user_id?: string;
  entitlement_ids?: string[] | null;
  entitlement_id?: string | null;
  expiration_at_ms?: number | null;
  transferred_from?: string[];
  transferred_to?: string[];
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Set a single user's entitlement. Ignores non-UUID (anonymous) ids. */
async function setEntitlement(userId: string | undefined, premium: boolean, expMs: number | null) {
  if (!userId || !UUID_RE.test(userId)) return; // anonymous / unmapped id
  await admin
    .from('profiles')
    .update({
      entitlement: premium ? 'premium' : 'free',
      entitlement_expires_at: premium && expMs ? new Date(expMs).toISOString() : null,
    })
    .eq('id', userId);
}

function eventMentionsPremium(e: RCEvent): boolean {
  return (e.entitlement_ids ?? []).includes(ENTITLEMENT_ID) || e.entitlement_id === ENTITLEMENT_ID;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Shared-secret auth (the value configured on the RevenueCat webhook).
  const auth = req.headers.get('Authorization');
  if (!WEBHOOK_SECRET || auth !== WEBHOOK_SECRET) return json({ error: 'Unauthorized' }, 401);

  let e: RCEvent;
  try {
    e = (await req.json())?.event;
    if (!e?.type) throw new Error('missing event');
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const expMs = e.expiration_at_ms ?? null;
  const notExpired = expMs == null || expMs > Date.now();
  const premium = eventMentionsPremium(e);

  switch (e.type) {
    // Access granted / continued. Note: CANCELLATION and BILLING_ISSUE do NOT
    // revoke immediately — the user keeps access until expiration_at_ms.
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
    case 'PRODUCT_CHANGE':
    case 'SUBSCRIPTION_EXTENDED':
    case 'CANCELLATION':
    case 'BILLING_ISSUE':
      await setEntitlement(e.app_user_id, premium && notExpired, expMs);
      break;

    // Subscription ended — revoke.
    case 'EXPIRATION':
      await setEntitlement(e.app_user_id, false, null);
      break;

    // Entitlement moved between app user ids (e.g. anonymous -> signed-in).
    case 'TRANSFER':
      for (const id of e.transferred_to ?? []) await setEntitlement(id, notExpired, expMs);
      for (const id of e.transferred_from ?? []) await setEntitlement(id, false, null);
      break;

    // TEST events and anything else: acknowledge without changing state.
    default:
      return json({ ok: true, ignored: e.type });
  }

  return json({ ok: true });
});

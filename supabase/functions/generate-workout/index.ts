// Supabase Edge Function: generate-workout
//
// The ONLY place the LLM API key lives. The mobile client POSTs the user's
// onboarding profile + their auth JWT; this function verifies the user is
// premium, calls the model, validates the JSON, and returns a WorkoutPlan.
//
// Deploy:
//   supabase functions deploy generate-workout
// Secrets (set once):
//   supabase secrets set OPENAI_API_KEY=sk-...
//   # SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically.
//
// Then set EXPO_PUBLIC_WORKOUT_FN_URL in the app's .env to this function URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const MODEL = 'gpt-4o-mini';

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose weight',
  build_muscle: 'Build muscle',
  stay_active: 'Stay active',
  improve_endurance: 'Improve endurance',
};
const EQUIPMENT_LABELS: Record<string, string> = {
  bodyweight: 'Bodyweight only',
  dumbbells: 'Dumbbells',
  resistance_bands: 'Resistance bands',
  full_gym: 'Full gym',
};

interface OnboardingProfile {
  goal: string;
  minutesPerDay: number;
  equipment: string[];
  experience: string;
}

function buildPrompt(p: OnboardingProfile): string {
  const equipment = (p.equipment ?? []).map((e) => EQUIPMENT_LABELS[e] ?? e).join(', ');
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return [
    `You are a certified personal trainer creating ONE workout for ${day}.`,
    `Client goal: ${GOAL_LABELS[p.goal] ?? p.goal}.`,
    `Experience level: ${p.experience}.`,
    `Available time: ${p.minutesPerDay} minutes.`,
    `Available equipment: ${equipment || 'bodyweight only'}.`,
    'Design a single, varied, safe session with a warm-up and cooldown that fits the time budget.',
    'Respond with ONLY a JSON object: {title, focus, estimatedMinutes, blocks:[{title, exercises:[{name, sets?, reps?, durationSeconds?, restSeconds?, notes?}]}]}.',
  ].join('\n');
}

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

  // Client scoped to the caller's JWT so RLS applies to any reads.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Invalid token' }, 401);

  // Defense in depth: gate generation on premium entitlement.
  const { data: profile } = await supabase
    .from('profiles')
    .select('entitlement, entitlement_expires_at')
    .eq('id', user.id)
    .single();

  const isPremium =
    profile?.entitlement === 'premium' &&
    (!profile.entitlement_expires_at || new Date(profile.entitlement_expires_at) > new Date());

  if (!isPremium) return json({ error: 'premium_access required' }, 403);

  let profileInput: OnboardingProfile;
  try {
    const body = await req.json();
    profileInput = body.profile;
    if (!profileInput?.goal) throw new Error('missing profile');
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  // Call the model with JSON mode for reliable structured output.
  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You output only valid JSON workout plans.' },
        { role: 'user', content: buildPrompt(profileInput) },
      ],
    }),
  });

  if (!aiRes.ok) {
    return json({ error: 'LLM request failed', detail: await aiRes.text() }, 502);
  }

  const completion = await aiRes.json();
  let plan: Record<string, unknown>;
  try {
    plan = JSON.parse(completion.choices[0].message.content);
  } catch {
    return json({ error: 'LLM returned invalid JSON' }, 502);
  }

  // Minimal shape validation before returning to the client.
  if (!plan.title || !Array.isArray(plan.blocks)) {
    return json({ error: 'LLM returned malformed plan' }, 502);
  }

  return json({ ...plan, aiGenerated: true });
});

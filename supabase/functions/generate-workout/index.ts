// Supabase Edge Function: generate-workout
//
// The ONLY place the LLM API key lives. The mobile client POSTs the user's
// onboarding profile + their auth JWT; this function verifies the user is
// premium, calls Claude, validates the JSON, and returns a WorkoutPlan.
//
// Deploy:
//   supabase functions deploy generate-workout
// Secrets (set once):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   # SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically.
//
// Then set EXPO_PUBLIC_WORKOUT_FN_URL in the app's .env to this function URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const MODEL = 'claude-opus-4-8';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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

const FEEDBACK_PROMPT: Record<string, string> = {
  too_easy: 'Their last session felt TOO EASY — increase the challenge today.',
  just_right: 'Their last session felt about right — keep a similar challenge.',
  too_hard: 'Their last session felt TOO HARD — dial the intensity back today.',
};

// JSON Schema for structured outputs — mirrors the client's WorkoutPlan type
// (minus aiGenerated, which we set server-side). Only `name` is required per
// exercise; sets/reps/durationSeconds/restSeconds/notes are optional.
const WORKOUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    focus: { type: 'string' },
    estimatedMinutes: { type: 'integer' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'integer' },
                durationSeconds: { type: 'integer' },
                restSeconds: { type: 'integer' },
                notes: { type: 'string' },
              },
              required: ['name'],
              additionalProperties: false,
            },
          },
        },
        required: ['title', 'exercises'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'focus', 'estimatedMinutes', 'blocks'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT =
  'You are a certified personal trainer who designs safe, varied, time-budgeted ' +
  'single-session workouts. Always include a warm-up and a cooldown that fit the ' +
  "time budget, and respect the client's available equipment and experience level.";

function buildPrompt(p: OnboardingProfile, feedback?: string | null): string {
  const equipment = (p.equipment ?? []).map((e) => EQUIPMENT_LABELS[e] ?? e).join(', ');
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return [
    `Design ONE workout for ${day}.`,
    `Client goal: ${GOAL_LABELS[p.goal] ?? p.goal}.`,
    `Experience level: ${p.experience}.`,
    `Available time: ${p.minutesPerDay} minutes.`,
    `Available equipment: ${equipment || 'bodyweight only'}.`,
    feedback && FEEDBACK_PROMPT[feedback] ? FEEDBACK_PROMPT[feedback] : '',
  ]
    .filter(Boolean)
    .join('\n');
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
  let feedback: string | null = null;
  try {
    const body = await req.json();
    profileInput = body.profile;
    feedback = body.feedback ?? null;
    if (!profileInput?.goal) throw new Error('missing profile');
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  // Call Claude with structured outputs for reliable, schema-valid JSON.
  let message;
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: WORKOUT_SCHEMA } },
      messages: [{ role: 'user', content: buildPrompt(profileInput, feedback) }],
    });
  } catch (e) {
    return json({ error: 'LLM request failed', detail: (e as Error).message }, 502);
  }

  if (message.stop_reason === 'refusal') {
    return json({ error: 'LLM declined the request' }, 502);
  }

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return json({ error: 'LLM returned no content' }, 502);
  }

  let plan: Record<string, unknown>;
  try {
    plan = JSON.parse(textBlock.text);
  } catch {
    return json({ error: 'LLM returned invalid JSON' }, 502);
  }

  // Minimal shape validation before returning to the client.
  if (!plan.title || !Array.isArray(plan.blocks)) {
    return json({ error: 'LLM returned malformed plan' }, 502);
  }

  return json({ ...plan, aiGenerated: true });
});

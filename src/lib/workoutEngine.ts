// Adaptive daily workout generator (the "hero" feature).
//
// Architecture note: the LLM is NEVER called directly from the client — that
// would leak the API key. Instead we POST the user's profile to a Supabase
// Edge Function (supabase/functions/generate-workout) which holds the OpenAI
// key as a server secret, calls the model, validates the JSON, and returns a
// WorkoutPlan. When no function URL is configured we fall back to a fully
// local, deterministic mock so the app works offline / in demo mode.

import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  type DifficultyFeedback,
  type OnboardingProfile,
  type WorkoutPlan,
} from '@/types';
import { env } from './env';

/** Extra signals that make generation adaptive day-to-day. */
export interface GenerationContext {
  /** How the last session felt — nudges intensity up or down. */
  feedback?: DifficultyFeedback | null;
}

const FEEDBACK_PROMPT: Record<DifficultyFeedback, string> = {
  too_easy: "Their last session felt TOO EASY — increase the challenge today.",
  just_right: "Their last session felt about right — keep a similar challenge.",
  too_hard: "Their last session felt TOO HARD — dial the intensity back today.",
};

/**
 * The exact prompt fed to the model server-side. Exported so the Edge Function
 * and any tests can share one source of truth.
 */
export function buildWorkoutPrompt(
  profile: OnboardingProfile,
  ctx: GenerationContext = {},
  date = new Date(),
): string {
  const equipment = profile.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ');
  const day = date.toLocaleDateString('en-US', { weekday: 'long' });

  return [
    `You are a certified personal trainer creating ONE workout for ${day}.`,
    `Client goal: ${GOAL_LABELS[profile.goal]}.`,
    `Experience level: ${profile.experience}.`,
    `Available time: ${profile.minutesPerDay} minutes.`,
    `Available equipment: ${equipment || 'bodyweight only'}.`,
    ctx.feedback ? FEEDBACK_PROMPT[ctx.feedback] : '',
    '',
    'Design a single, varied, safe session that fits the time budget. Include a',
    'warm-up and a cooldown. Prefer compound movements appropriate to the goal.',
    '',
    'Respond with ONLY a JSON object matching this TypeScript type, no prose:',
    '{',
    '  "title": string,',
    '  "focus": string,',
    '  "estimatedMinutes": number,',
    '  "blocks": Array<{',
    '    "title": string,',
    '    "exercises": Array<{',
    '      "name": string, "sets"?: number, "reps"?: number,',
    '      "durationSeconds"?: number, "restSeconds"?: number, "notes"?: string',
    '    }>',
    '  }>',
    '}',
  ].join('\n');
}

/** Calls the Edge Function (premium path) or falls back to the local mock. */
export async function generateDailyWorkout(
  profile: OnboardingProfile,
  accessToken?: string | null,
  ctx: GenerationContext = {},
): Promise<WorkoutPlan> {
  if (env.workoutFnUrl && accessToken) {
    try {
      const res = await fetch(env.workoutFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ profile, feedback: ctx.feedback ?? null }),
      });
      if (!res.ok) throw new Error(`workout fn ${res.status}`);
      const plan = (await res.json()) as WorkoutPlan;
      return { ...plan, aiGenerated: true };
    } catch (e) {
      console.warn('[workoutEngine] remote generation failed, using mock:', (e as Error).message);
    }
  }
  return mockWorkout(profile, ctx);
}

// --- Local mock ------------------------------------------------------------

const MAIN_MOVES: Record<OnboardingProfile['goal'], string[]> = {
  build_muscle: ['Goblet squat', 'Push-up', 'Bent-over row', 'Overhead press', 'Romanian deadlift'],
  lose_weight: ['Jump squat', 'Mountain climber', 'Burpee', 'High knees', 'Reverse lunge'],
  stay_active: ['Bodyweight squat', 'Incline push-up', 'Glute bridge', 'Bird dog', 'Dead bug'],
  improve_endurance: ['Jog in place', 'Skater hops', 'Squat pulse', 'Plank shoulder tap', 'Butt kicks'],
};

/** Deterministic-ish workout so demo mode produces sensible, varied output. */
export function mockWorkout(
  profile: OnboardingProfile,
  ctx: GenerationContext = {},
  date = new Date(),
): WorkoutPlan {
  const minutes = profile.minutesPerDay;
  const seed = date.getDate(); // varies day to day
  const pool = MAIN_MOVES[profile.goal];
  let rounds = minutes >= 40 ? 4 : minutes >= 25 ? 3 : 2;
  let repsBase =
    profile.experience === 'advanced' ? 15 : profile.experience === 'intermediate' ? 12 : 10;

  // Adapt intensity to the last session's difficulty feedback.
  if (ctx.feedback === 'too_easy') {
    repsBase += 3;
  } else if (ctx.feedback === 'too_hard') {
    repsBase = Math.max(6, repsBase - 3);
    rounds = Math.max(2, rounds - 1);
  }

  const rotate = <T>(arr: T[], by: number) => arr.map((_, i) => arr[(i + by) % arr.length]);
  const main = rotate(pool, seed).slice(0, minutes >= 30 ? 4 : 3);

  return {
    title: `${GOAL_LABELS[profile.goal]} — ${minutes} min`,
    focus: profile.goal === 'improve_endurance' ? 'Conditioning' : 'Full-body',
    estimatedMinutes: minutes,
    aiGenerated: false,
    blocks: [
      {
        title: 'Warm-up',
        exercises: [
          { name: 'Arm circles', durationSeconds: 30 },
          { name: 'Bodyweight squats', reps: 12 },
          { name: 'Hip openers', durationSeconds: 30 },
        ],
      },
      {
        title: `Main set · ${rounds} rounds`,
        exercises: main.map((name) => ({
          name,
          sets: rounds,
          reps: repsBase,
          restSeconds: 45,
        })),
      },
      {
        title: 'Cooldown',
        exercises: [
          { name: 'Forward fold stretch', durationSeconds: 30 },
          { name: 'Child’s pose', durationSeconds: 45 },
        ],
      },
    ],
  };
}

/** Three fixed templates available to free-tier users (no AI generation). */
export const FREE_TEMPLATES: WorkoutPlan[] = [
  {
    title: 'Quick Full-Body (15 min)',
    focus: 'Full-body',
    estimatedMinutes: 15,
    aiGenerated: false,
    blocks: [
      { title: 'Warm-up', exercises: [{ name: 'Jumping jacks', durationSeconds: 45 }] },
      {
        title: 'Circuit · 3 rounds',
        exercises: [
          { name: 'Bodyweight squat', reps: 15 },
          { name: 'Push-up', reps: 10 },
          { name: 'Plank', durationSeconds: 30 },
        ],
      },
      { title: 'Cooldown', exercises: [{ name: 'Standing stretch', durationSeconds: 60 }] },
    ],
  },
  {
    title: 'Core & Mobility (20 min)',
    focus: 'Core',
    estimatedMinutes: 20,
    aiGenerated: false,
    blocks: [
      { title: 'Warm-up', exercises: [{ name: 'Cat-cow', durationSeconds: 45 }] },
      {
        title: 'Circuit · 3 rounds',
        exercises: [
          { name: 'Dead bug', reps: 12 },
          { name: 'Glute bridge', reps: 15 },
          { name: 'Bird dog', reps: 10 },
        ],
      },
      { title: 'Cooldown', exercises: [{ name: 'Cobra stretch', durationSeconds: 45 }] },
    ],
  },
  {
    title: 'Cardio Burner (25 min)',
    focus: 'Conditioning',
    estimatedMinutes: 25,
    aiGenerated: false,
    blocks: [
      { title: 'Warm-up', exercises: [{ name: 'High knees', durationSeconds: 45 }] },
      {
        title: 'Intervals · 4 rounds',
        exercises: [
          { name: 'Burpees', durationSeconds: 30, restSeconds: 30 },
          { name: 'Mountain climbers', durationSeconds: 30, restSeconds: 30 },
          { name: 'Squat jumps', durationSeconds: 30, restSeconds: 30 },
        ],
      },
      { title: 'Cooldown', exercises: [{ name: 'Walk it out', durationSeconds: 90 }] },
    ],
  },
];

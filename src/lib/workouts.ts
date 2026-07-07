// Remote (Supabase) persistence for the day's assigned / generated workout plan.
//
// Mirrors completions.ts: the client upserts ONE row per day into
// public.daily_workouts (RLS scopes every row to the owner). The
// (user_id, workout_date) unique constraint means regenerating later in the day
// updates the same row instead of creating duplicates. The server-side
// enforce_premium_ai_workout trigger still guarantees only premium users can
// store ai_generated = true plans, so this client write can't bypass the paywall.

import { supabase } from './supabase';
import { todayISO } from './progressStore';
import type { Json } from '@/types/supabase';
import type { WorkoutPlan } from '@/types';

/**
 * Persist the plan shown for `date` (default: today). No-op in demo mode
 * (no Supabase client). Callers treat failures as non-critical, like completions.
 */
export async function saveDailyWorkout(
  userId: string,
  plan: WorkoutPlan,
  date = todayISO(),
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('daily_workouts').upsert(
    {
      user_id: userId,
      workout_date: date,
      title: plan.title,
      focus: plan.focus,
      estimated_minutes: plan.estimatedMinutes,
      ai_generated: plan.aiGenerated,
      // Full structured payload — matches the WorkoutPlan type (jsonb column).
      plan: plan as unknown as Json,
    },
    { onConflict: 'user_id,workout_date' },
  );
  if (error) throw error;
}

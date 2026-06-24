// Remote (Supabase) persistence for workout completions.
//
// The local-first store in progressStore.ts is still used in demo mode; when a
// real user is signed in, ProgressProvider routes reads/writes through here so
// streaks + history persist server-side (RLS scopes every row to the owner).

import { supabase } from './supabase';
import type { WorkoutCompletion } from '@/types';

/** All of the signed-in user's completions, oldest → newest. RLS scopes rows. */
export async function fetchRemoteCompletions(): Promise<WorkoutCompletion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workout_completions')
    .select('completed_on, plan_title, duration_minutes')
    .order('completed_on', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    date: r.completed_on as string,
    planTitle: r.plan_title as string,
    durationMinutes: (r.duration_minutes as number | null) ?? 0,
  }));
}

/**
 * Upsert one completion. The (user_id, completed_on) unique constraint means a
 * second completion on the same day updates the existing row rather than erroring.
 */
export async function saveRemoteCompletion(userId: string, c: WorkoutCompletion): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('workout_completions').upsert(
    {
      user_id: userId,
      completed_on: c.date,
      plan_title: c.planTitle,
      duration_minutes: c.durationMinutes,
    },
    { onConflict: 'user_id,completed_on' },
  );
  if (error) throw error;
}

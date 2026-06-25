// Local-first progress tracking: workout completions + streak math.
//
// Persisted to AsyncStorage so it survives reloads and works offline. When
// Supabase is configured this is also where you'd mirror writes to the
// `workout_completions` table (see TODO in addCompletion).

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutCompletion } from '@/types';

const KEY = 'fitdaily.completions.v1';

export function todayISO(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoISO(n: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return todayISO(d);
}

export async function getCompletions(): Promise<WorkoutCompletion[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WorkoutCompletion[]) : [];
  } catch {
    return [];
  }
}

export async function addCompletion(c: WorkoutCompletion): Promise<WorkoutCompletion[]> {
  const all = await getCompletions();
  // One completion per day keeps streak math simple.
  const next = [...all.filter((x) => x.date !== c.date), c].sort((a, b) =>
    a.date < b.date ? -1 : 1,
  );
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  // TODO(supabase): when configured, also upsert into public.workout_completions.
  return next;
}

export function isCompletedOn(completions: WorkoutCompletion[], date = todayISO()): boolean {
  return completions.some((c) => c.date === date);
}

/**
 * Consecutive days ending today (or yesterday if today not yet done).
 *
 * `freezes` (streak protection) lets the count bridge that many missed days
 * without resetting — premium passes 1, free passes 0 (default unchanged).
 */
export function currentStreak(
  completions: WorkoutCompletion[],
  freezes = 0,
  from = new Date(),
): number {
  const done = new Set(completions.map((c) => c.date));
  let streak = 0;
  let remaining = freezes;
  // Allow the streak to count even if today isn't done yet (started yesterday).
  let offset = done.has(todayISO(from)) ? 0 : 1;
  for (;;) {
    if (done.has(daysAgoISO(offset, from))) {
      streak += 1;
      offset += 1;
    } else if (remaining > 0 && streak > 0) {
      // Bridge a single missed day with a freeze and keep going.
      remaining -= 1;
      offset += 1;
    } else {
      break;
    }
  }
  return streak;
}

/** Whether a freeze is currently bridging a gap (for "protected" UI). */
export function isStreakProtected(
  completions: WorkoutCompletion[],
  freezes = 0,
  from = new Date(),
): boolean {
  if (freezes <= 0) return false;
  return currentStreak(completions, freezes, from) > currentStreak(completions, 0, from);
}

/** Boolean completion flags for the last `n` days, oldest → newest. */
export function lastNDays(
  completions: WorkoutCompletion[],
  n: number,
  from = new Date(),
): { date: string; done: boolean }[] {
  const done = new Set(completions.map((c) => c.date));
  const out: { date: string; done: boolean }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = daysAgoISO(i, from);
    out.push({ date, done: done.has(date) });
  }
  return out;
}

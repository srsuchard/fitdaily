import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchRemoteCompletions, saveRemoteCompletion } from '@/lib/completions';
import {
  addCompletion,
  currentStreak,
  getCompletions,
  isCompletedOn,
  isStreakProtected,
  lastNDays,
  todayISO,
} from '@/lib/progressStore';
import { useAuth } from '@/providers/AuthProvider';
import type { WorkoutCompletion } from '@/types';

/** Premium streak protection: number of missed days a streak can survive. */
const PREMIUM_FREEZES = 1;

interface ProgressContextValue {
  completions: WorkoutCompletion[];
  streak: number;
  /** True when a freeze is currently keeping the streak alive across a gap. */
  streakProtected: boolean;
  completedToday: boolean;
  last7: { date: string; done: boolean }[];
  last30: { date: string; done: boolean }[];
  totalWorkouts: number;
  recordCompletion: (planTitle: string, durationMinutes: number) => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { session, demoMode, isPremium } = useAuth();
  const userId = session?.user.id ?? null;
  const freezes = isPremium ? PREMIUM_FREEZES : 0;
  // Use Supabase only for a real signed-in user; demo mode stays local.
  const remote = !demoMode && userId !== null;

  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = remote ? await fetchRemoteCompletions() : await getCompletions();
        if (active) setCompletions(data);
      } catch {
        // Network/RLS hiccup — fall back to whatever is stored locally.
        if (active) setCompletions(await getCompletions());
      }
    })();
    return () => {
      active = false;
    };
  }, [remote, userId]);

  const recordCompletion = useCallback(
    async (planTitle: string, durationMinutes: number) => {
      const entry: WorkoutCompletion = { date: todayISO(), planTitle, durationMinutes };
      if (remote && userId) {
        await saveRemoteCompletion(userId, entry);
        setCompletions(await fetchRemoteCompletions());
      } else {
        setCompletions(await addCompletion(entry));
      }
    },
    [remote, userId],
  );

  const value = useMemo<ProgressContextValue>(
    () => ({
      completions,
      streak: currentStreak(completions, freezes),
      streakProtected: isStreakProtected(completions, freezes),
      completedToday: isCompletedOn(completions),
      last7: lastNDays(completions, 7),
      last30: lastNDays(completions, 30),
      totalWorkouts: completions.length,
      recordCompletion,
    }),
    [completions, freezes, recordCompletion],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}

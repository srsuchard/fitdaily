import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  addCompletion,
  currentStreak,
  getCompletions,
  isCompletedOn,
  lastNDays,
  todayISO,
} from '@/lib/progressStore';
import type { WorkoutCompletion } from '@/types';

interface ProgressContextValue {
  completions: WorkoutCompletion[];
  streak: number;
  completedToday: boolean;
  last7: { date: string; done: boolean }[];
  last30: { date: string; done: boolean }[];
  totalWorkouts: number;
  recordCompletion: (planTitle: string, durationMinutes: number) => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);

  useEffect(() => {
    getCompletions().then(setCompletions);
  }, []);

  const recordCompletion = useCallback(async (planTitle: string, durationMinutes: number) => {
    const next = await addCompletion({ date: todayISO(), planTitle, durationMinutes });
    setCompletions(next);
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      completions,
      streak: currentStreak(completions),
      completedToday: isCompletedOn(completions),
      last7: lastNDays(completions, 7),
      last30: lastNDays(completions, 30),
      totalWorkouts: completions.length,
      recordCompletion,
    }),
    [completions, recordCompletion],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}

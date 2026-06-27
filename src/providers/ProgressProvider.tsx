import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchRemoteCompletions, saveRemoteCompletion } from '@/lib/completions';
import {
  diffCompletion,
  evaluateAchievements,
  levelInfo,
  statsFromCompletions,
  type CompletionResult,
  type EvaluatedAchievement,
  type GamificationStats,
  type LevelInfo,
} from '@/lib/gamification';
import {
  addCompletion,
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
  /** Longest consecutive-day streak ever recorded. */
  longestStreak: number;
  /** Sum of every completion's duration, in minutes. */
  totalMinutes: number;
  /** Lifetime XP, derived purely from completions. */
  xp: number;
  /** Current level + progress toward the next one. */
  level: LevelInfo;
  /** Raw gamification stats (drives per-achievement progress bars). */
  stats: GamificationStats;
  /** All achievements with their unlocked state. */
  achievements: EvaluatedAchievement[];
  /** Count of unlocked achievements. */
  unlockedCount: number;
  /** Logs a completion and returns the XP/level/badge reward earned. */
  recordCompletion: (planTitle: string, durationMinutes: number) => Promise<CompletionResult>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { session, demoMode, isPremium } = useAuth();
  const userId = session?.user.id ?? null;
  const freezes = isPremium ? PREMIUM_FREEZES : 0;
  // Use Supabase only for a real signed-in user; demo mode stays local.
  const remote = !demoMode && userId !== null;

  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);
  // Always-current snapshot so recordCompletion can diff before/after without
  // re-subscribing on every completions change. Updated post-render via effect.
  const completionsRef = useRef(completions);
  useEffect(() => {
    completionsRef.current = completions;
  }, [completions]);

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
    async (planTitle: string, durationMinutes: number): Promise<CompletionResult> => {
      const before = completionsRef.current;
      const entry: WorkoutCompletion = { date: todayISO(), planTitle, durationMinutes };
      let after: WorkoutCompletion[];
      if (remote && userId) {
        await saveRemoteCompletion(userId, entry);
        after = await fetchRemoteCompletions();
      } else {
        after = await addCompletion(entry);
      }
      setCompletions(after);
      return diffCompletion(before, after, freezes);
    },
    [remote, userId, freezes],
  );

  const value = useMemo<ProgressContextValue>(() => {
    const stats = statsFromCompletions(completions, freezes);
    const achievements = evaluateAchievements(stats);
    return {
      completions,
      streak: stats.currentStreak,
      streakProtected: isStreakProtected(completions, freezes),
      completedToday: isCompletedOn(completions),
      last7: lastNDays(completions, 7),
      last30: lastNDays(completions, 30),
      totalWorkouts: completions.length,
      longestStreak: stats.longestStreak,
      totalMinutes: stats.totalMinutes,
      xp: stats.xp,
      level: levelInfo(stats.xp),
      stats,
      achievements,
      unlockedCount: achievements.filter((a) => a.unlocked).length,
      recordCompletion,
    };
  }, [completions, freezes, recordCompletion]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}

// Gamification: XP, levels, and achievements.
//
// Everything here is a *pure, deterministic function of the user's workout
// completions*. There is no separate XP store — replaying the same completions
// always yields the same XP/level/badges, so it stays perfectly in sync across
// demo (local) and signed-in (remote) modes with zero extra persistence.

import { currentStreak, longestStreak } from '@/lib/progressStore';
import type { WorkoutCompletion } from '@/types';

// --- XP ---------------------------------------------------------------------

const BASE_XP = 80; // every completed workout
const XP_PER_MINUTE = 2; // effort bonus
const MAX_MINUTES_COUNTED = 60; // cap so a 3-hour session can't run away
const XP_PER_STREAK_DAY = 10; // momentum bonus
const MAX_STREAK_DAYS_COUNTED = 14;

/** XP awarded for one completion, given the streak length on that day. */
export function xpForCompletion(durationMinutes: number, streakOnDay: number): number {
  const effort = Math.min(Math.max(durationMinutes, 0), MAX_MINUTES_COUNTED) * XP_PER_MINUTE;
  const momentum = Math.min(Math.max(streakOnDay, 0), MAX_STREAK_DAYS_COUNTED) * XP_PER_STREAK_DAY;
  return BASE_XP + effort + momentum;
}

/** The ISO day before `date` (UTC-stable, matches stored UTC dates). */
function prevDayISO(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Length of the consecutive-day run ending on `date` (inclusive). */
function streakEndingOn(done: Set<string>, date: string): number {
  let n = 0;
  let cur = date;
  while (done.has(cur)) {
    n += 1;
    cur = prevDayISO(cur);
  }
  return n;
}

/** Total lifetime XP from all completions. */
export function totalXp(completions: WorkoutCompletion[]): number {
  const done = new Set(completions.map((c) => c.date));
  return completions.reduce(
    (sum, c) => sum + xpForCompletion(c.durationMinutes, streakEndingOn(done, c.date)),
    0,
  );
}

// --- Levels -----------------------------------------------------------------

// Cumulative XP needed to *reach* level L (L >= 1). Per-level cost grows by 100
// each level: reach L2 at 100, L3 at 300, L4 at 600, L5 at 1000, ...
//   xpToReachLevel(L) = 50 * (L - 1) * L
export function xpToReachLevel(level: number): number {
  return 50 * (level - 1) * level;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpToReachLevel(level + 1) <= xp) level += 1;
  return level;
}

const LEVEL_TITLES: { min: number; title: string }[] = [
  { min: 30, title: 'Legend' },
  { min: 20, title: 'Champion' },
  { min: 15, title: 'Elite Athlete' },
  { min: 10, title: 'Athlete' },
  { min: 6, title: 'Contender' },
  { min: 3, title: 'Rookie' },
  { min: 1, title: 'Beginner' },
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES.find((t) => level >= t.min)?.title ?? 'Beginner';
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number; // total lifetime xp
  xpIntoLevel: number; // xp earned since reaching the current level
  xpForLevel: number; // xp span of the current level
  xpToNext: number; // xp remaining until the next level
  progress: number; // 0..1 within the current level
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelForXp(xp);
  const base = xpToReachLevel(level);
  const next = xpToReachLevel(level + 1);
  const xpForLevel = next - base;
  const xpIntoLevel = xp - base;
  return {
    level,
    title: levelTitle(level),
    xp,
    xpIntoLevel,
    xpForLevel,
    xpToNext: next - xp,
    progress: xpForLevel > 0 ? xpIntoLevel / xpForLevel : 0,
  };
}

// --- Achievements -----------------------------------------------------------

export interface GamificationStats {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  level: number;
  xp: number;
}

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Whether the badge is unlocked for the given stats. */
  test: (s: GamificationStats) => boolean;
  /** Numeric progress toward the goal, for a progress bar on locked badges. */
  progress: (s: GamificationStats) => { current: number; goal: number };
}

/** A milestone badge: unlocked once `pick(stats)` reaches `goal`. */
function milestone(
  id: string,
  emoji: string,
  title: string,
  description: string,
  pick: (s: GamificationStats) => number,
  goal: number,
): AchievementDef {
  return {
    id,
    emoji,
    title,
    description,
    test: (s) => pick(s) >= goal,
    progress: (s) => ({ current: Math.min(pick(s), goal), goal }),
  };
}

// Only badges derivable from data we actually record (completion date +
// duration). No time-of-day badges ("early bird") until we track that honestly.
export const ACHIEVEMENTS: AchievementDef[] = [
  milestone('first_workout', '🎉', 'First Workout', 'Complete your very first workout', (s) => s.totalWorkouts, 1),
  milestone('workouts_10', '💪', 'Getting Strong', 'Complete 10 workouts', (s) => s.totalWorkouts, 10),
  milestone('workouts_50', '🏋️', 'Dedicated', 'Complete 50 workouts', (s) => s.totalWorkouts, 50),
  milestone('workouts_100', '💯', 'Century Club', 'Complete 100 workouts', (s) => s.totalWorkouts, 100),
  milestone('streak_3', '🔥', 'On Fire', 'Reach a 3-day streak', (s) => s.longestStreak, 3),
  milestone('streak_7', '🗓️', 'Week Warrior', 'Reach a 7-day streak', (s) => s.longestStreak, 7),
  milestone('streak_30', '❄️', 'Unstoppable', 'Reach a 30-day streak', (s) => s.longestStreak, 30),
  milestone('streak_100', '💎', 'Centurion', 'Reach a 100-day streak', (s) => s.longestStreak, 100),
  milestone('minutes_300', '⏱️', 'Time Invested', 'Train for 300 total minutes', (s) => s.totalMinutes, 300),
  milestone('minutes_1000', '⏳', 'Iron Will', 'Train for 1,000 total minutes', (s) => s.totalMinutes, 1000),
  milestone('level_5', '⭐', 'Rising Star', 'Reach level 5', (s) => s.level, 5),
  milestone('level_10', '🌟', 'Top Tier', 'Reach level 10', (s) => s.level, 10),
];

export interface EvaluatedAchievement {
  def: AchievementDef;
  unlocked: boolean;
}

export function statsFromCompletions(
  completions: WorkoutCompletion[],
  freezes = 0,
): GamificationStats {
  const xp = totalXp(completions);
  return {
    totalWorkouts: completions.length,
    currentStreak: currentStreak(completions, freezes),
    longestStreak: longestStreak(completions),
    totalMinutes: completions.reduce((sum, c) => sum + (c.durationMinutes || 0), 0),
    level: levelForXp(xp),
    xp,
  };
}

export function evaluateAchievements(stats: GamificationStats): EvaluatedAchievement[] {
  return ACHIEVEMENTS.map((def) => ({ def, unlocked: def.test(stats) }));
}

// --- Completion diff (the "reward" payload) ---------------------------------

/** What just happened when a workout was logged — drives the reward screen. */
export interface CompletionResult {
  xpGained: number;
  totalXp: number;
  level: number;
  /** Set to the new level if this completion crossed a level boundary. */
  leveledUpTo: number | null;
  newAchievements: AchievementDef[];
  streak: number;
}

/** Diff stats before/after adding a completion to produce the reward payload. */
export function diffCompletion(
  before: WorkoutCompletion[],
  after: WorkoutCompletion[],
  freezes = 0,
): CompletionResult {
  const beforeStats = statsFromCompletions(before, freezes);
  const afterStats = statsFromCompletions(after, freezes);
  const unlockedBefore = new Set(
    evaluateAchievements(beforeStats)
      .filter((a) => a.unlocked)
      .map((a) => a.def.id),
  );
  const newAchievements = evaluateAchievements(afterStats)
    .filter((a) => a.unlocked && !unlockedBefore.has(a.def.id))
    .map((a) => a.def);
  return {
    xpGained: afterStats.xp - beforeStats.xp,
    totalXp: afterStats.xp,
    level: afterStats.level,
    leveledUpTo: afterStats.level > beforeStats.level ? afterStats.level : null,
    newAchievements,
    streak: afterStats.currentStreak,
  };
}

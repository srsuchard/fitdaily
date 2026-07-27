/// <reference types="jest" />
import {
  diffCompletion,
  evaluateAchievements,
  levelForXp,
  levelInfo,
  levelTitle,
  statsFromCompletions,
  totalXp,
  xpForCompletion,
  xpToReachLevel,
} from '@/lib/gamification';
import { todayISO } from '@/lib/progressStore';
import type { WorkoutCompletion } from '@/types';

const done = (date: string, durationMinutes = 30): WorkoutCompletion => ({
  date,
  planTitle: 'Test',
  durationMinutes,
});

describe('xpForCompletion', () => {
  it('awards base XP for a zero-effort, no-streak completion', () => {
    expect(xpForCompletion(0, 0)).toBe(80); // BASE_XP only
  });

  it('adds an effort bonus (2/min) and a momentum bonus (10/streak day)', () => {
    // 80 base + 30min*2 + 1 streak day*10
    expect(xpForCompletion(30, 1)).toBe(150);
  });

  it('caps minutes at 60 and streak days at 14', () => {
    // 80 + min(100,60)*2 + min(20,14)*10 = 80 + 120 + 140
    expect(xpForCompletion(100, 20)).toBe(340);
  });

  it('never goes below base for negative inputs', () => {
    expect(xpForCompletion(-5, -5)).toBe(80);
  });
});

describe('levels', () => {
  it('xpToReachLevel follows 50*(L-1)*L', () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(3)).toBe(300);
    expect(xpToReachLevel(5)).toBe(1000);
  });

  it('levelForXp finds the highest level whose threshold is met', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(1000)).toBe(5);
  });

  it('levelInfo reports progress within the current level', () => {
    const info = levelInfo(150); // level 2 spans 100..300
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(50);
    expect(info.xpForLevel).toBe(200);
    expect(info.xpToNext).toBe(150);
    expect(info.progress).toBeCloseTo(0.25);
  });

  it('levelTitle maps levels to titles', () => {
    expect(levelTitle(1)).toBe('Beginner');
    expect(levelTitle(3)).toBe('Rookie');
    expect(levelTitle(6)).toBe('Contender');
    expect(levelTitle(30)).toBe('Legend');
  });
});

describe('totalXp', () => {
  it('sums XP across completions using each day\'s streak', () => {
    // Two consecutive days, 30 min each:
    //  day1 streak=1 -> 150 ; day2 streak=2 -> 80+60+20 = 160
    const xp = totalXp([done('2026-07-01'), done('2026-07-02')]);
    expect(xp).toBe(310);
  });
});

describe('statsFromCompletions + evaluateAchievements', () => {
  it('unlocks milestones the stats have reached, and no others', () => {
    const stats = statsFromCompletions([done('2026-07-01')]);
    expect(stats.totalWorkouts).toBe(1);

    const byId = Object.fromEntries(
      evaluateAchievements(stats).map((a) => [a.def.id, a.unlocked]),
    );
    expect(byId.first_workout).toBe(true); // 1 workout
    expect(byId.workouts_10).toBe(false); // needs 10
    expect(byId.streak_7).toBe(false); // needs a 7-day streak
  });
});

describe('diffCompletion', () => {
  it('reports XP gained, level-up, and newly unlocked badges', () => {
    const before: WorkoutCompletion[] = [];
    // Log it as *today* so the reported streak is deterministic (1).
    const after = [done(todayISO())]; // 150 xp -> crosses into level 2

    const result = diffCompletion(before, after);
    expect(result.xpGained).toBe(150);
    expect(result.totalXp).toBe(150);
    expect(result.leveledUpTo).toBe(2);
    expect(result.newAchievements.map((a) => a.id)).toContain('first_workout');
    expect(result.streak).toBe(1);
  });
});

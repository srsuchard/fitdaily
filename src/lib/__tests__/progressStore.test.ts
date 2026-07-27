/// <reference types="jest" />
import {
  currentStreak,
  isCompletedOn,
  isStreakProtected,
  lastNDays,
  longestStreak,
  todayISO,
} from '@/lib/progressStore';
import type { WorkoutCompletion } from '@/types';

// A fixed reference day (noon UTC avoids any midnight-boundary ambiguity).
const FROM = new Date('2026-07-15T12:00:00Z');

// Mirror progressStore's own relative-day math so inputs and expectations agree
// regardless of the machine's timezone.
const daysAgo = (n: number, from = FROM): string => {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const done = (...isoDates: string[]): WorkoutCompletion[] =>
  isoDates.map((date) => ({ date, planTitle: 'Test', durationMinutes: 20 }));

describe('todayISO', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(todayISO(new Date('2026-07-15T09:30:00Z'))).toBe('2026-07-15');
  });
});

describe('currentStreak', () => {
  it('is 0 with no completions', () => {
    expect(currentStreak([], 0, FROM)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const c = done(daysAgo(0), daysAgo(1), daysAgo(2));
    expect(currentStreak(c, 0, FROM)).toBe(3);
  });

  it('still counts when today is not done yet but yesterday was', () => {
    const c = done(daysAgo(1), daysAgo(2));
    expect(currentStreak(c, 0, FROM)).toBe(2);
  });

  it('breaks on a gap', () => {
    // today done, then a gap (day 1 missing), then day 2 done.
    const c = done(daysAgo(0), daysAgo(2));
    expect(currentStreak(c, 0, FROM)).toBe(1);
  });

  it('bridges a single gap with a freeze (streak protection)', () => {
    const c = done(daysAgo(0), daysAgo(2));
    expect(currentStreak(c, 1, FROM)).toBe(2);
  });

  it('a freeze cannot start a streak from nothing', () => {
    expect(currentStreak([], 1, FROM)).toBe(0);
  });
});

describe('isStreakProtected', () => {
  it('is true only when a freeze is actively bridging a gap', () => {
    const bridged = done(daysAgo(0), daysAgo(2));
    expect(isStreakProtected(bridged, 1, FROM)).toBe(true);

    const noGap = done(daysAgo(0), daysAgo(1));
    expect(isStreakProtected(noGap, 1, FROM)).toBe(false);
    expect(isStreakProtected(bridged, 0, FROM)).toBe(false);
  });
});

describe('longestStreak', () => {
  it('finds the longest consecutive run across history', () => {
    const c = done(
      '2026-07-01', '2026-07-02', '2026-07-03', // run of 3
      '2026-07-05', '2026-07-06', // run of 2
    );
    expect(longestStreak(c)).toBe(3);
  });

  it('is 0 for no completions and dedupes same-day entries', () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(done('2026-07-01', '2026-07-01'))).toBe(1);
  });
});

describe('isCompletedOn / lastNDays', () => {
  it('detects a completion on a specific date', () => {
    const c = done(daysAgo(0));
    expect(isCompletedOn(c, daysAgo(0))).toBe(true);
    expect(isCompletedOn(c, daysAgo(1))).toBe(false);
  });

  it('returns oldest→newest flags for the last N days', () => {
    // Completed 2 days ago and today, but not yesterday.
    const c = done(daysAgo(0), daysAgo(2));
    const flags = lastNDays(c, 3, FROM);
    // oldest→newest = [2 days ago, yesterday, today] = [done, missed, done]
    expect(flags.map((f) => f.done)).toEqual([true, false, true]);
  });
});

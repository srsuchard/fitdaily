/// <reference types="jest" />
import { challengeForDate } from '@/lib/dailyChallenge';

const DAY_MS = 86_400_000;

describe('challengeForDate', () => {
  it('returns a well-formed challenge', () => {
    const c = challengeForDate(new Date('2026-07-15T00:00:00Z'));
    expect(c.id).toBeTruthy();
    expect(c.text).toBeTruthy();
    expect(c.bonusXp).toBeGreaterThan(0);
  });

  it('is stable for the same calendar day', () => {
    const a = challengeForDate(new Date('2026-07-15T01:00:00Z'));
    const b = challengeForDate(new Date('2026-07-15T23:00:00Z'));
    expect(a.id).toBe(b.id);
  });

  it('changes from one day to the next', () => {
    const day1 = challengeForDate(new Date('2026-07-15T00:00:00Z'));
    const day2 = challengeForDate(new Date(Date.UTC(2026, 6, 15) + DAY_MS));
    expect(day1.id).not.toBe(day2.id);
  });

  it('repeats on an 8-day cycle (one per challenge)', () => {
    const base = Date.UTC(2026, 6, 15);
    const a = challengeForDate(new Date(base));
    const b = challengeForDate(new Date(base + 8 * DAY_MS));
    expect(a.id).toBe(b.id);
  });
});

/// <reference types="jest" />
import { FREE_TEMPLATES, mockWorkout } from '@/lib/workoutEngine';
import type { OnboardingProfile, WorkoutPlan } from '@/types';

const profile: OnboardingProfile = {
  goal: 'stay_active',
  minutesPerDay: 30,
  equipment: ['bodyweight'],
  experience: 'beginner',
};

// Pull the reps used in the "Main set" block of a generated plan.
const mainSetReps = (plan: WorkoutPlan): number => {
  const main = plan.blocks.find((b) => b.title.startsWith('Main set'));
  return main?.exercises[0]?.reps ?? 0;
};

describe('mockWorkout', () => {
  it('produces a non-AI plan with warm-up, main set, and cooldown', () => {
    const plan = mockWorkout(profile);
    expect(plan.aiGenerated).toBe(false);
    expect(plan.estimatedMinutes).toBe(profile.minutesPerDay);

    const titles = plan.blocks.map((b) => b.title);
    expect(titles[0]).toBe('Warm-up');
    expect(titles.some((t) => t.startsWith('Main set'))).toBe(true);
    expect(titles[titles.length - 1]).toBe('Cooldown');
  });

  it('adapts intensity to difficulty feedback', () => {
    const easier = mainSetReps(mockWorkout(profile, { feedback: 'too_hard' }));
    const neutral = mainSetReps(mockWorkout(profile, { feedback: 'just_right' }));
    const harder = mainSetReps(mockWorkout(profile, { feedback: 'too_easy' }));

    expect(easier).toBeLessThan(neutral);
    expect(harder).toBeGreaterThan(neutral);
  });

  it('varies the main-set movements by day', () => {
    const monday = mockWorkout(profile, {}, new Date('2026-07-13T12:00:00Z'));
    const tuesday = mockWorkout(profile, {}, new Date('2026-07-14T12:00:00Z'));
    const names = (p: WorkoutPlan) =>
      p.blocks.find((b) => b.title.startsWith('Main set'))?.exercises.map((e) => e.name);
    expect(names(monday)).not.toEqual(names(tuesday));
  });
});

describe('FREE_TEMPLATES', () => {
  it('provides three ready-made, non-AI templates', () => {
    expect(FREE_TEMPLATES).toHaveLength(3);
    for (const t of FREE_TEMPLATES) {
      expect(t.aiGenerated).toBe(false);
      expect(t.blocks.length).toBeGreaterThan(0);
      expect(t.estimatedMinutes).toBeGreaterThan(0);
    }
  });
});

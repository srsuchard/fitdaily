// A small rotating "today's challenge" — deterministic by calendar day so every
// user sees the same challenge on the same date, and it stays stable across app
// restarts without any persistence.

export interface DailyChallenge {
  id: string;
  emoji: string;
  text: string;
  /** Bonus XP framing shown on the card (motivational, not awarded directly). */
  bonusXp: number;
}

const CHALLENGES: DailyChallenge[] = [
  { id: 'squats_50', emoji: '🦵', text: 'Do 50 squats today', bonusXp: 50 },
  { id: 'pushups_30', emoji: '💪', text: 'Knock out 30 push-ups', bonusXp: 50 },
  { id: 'plank_2min', emoji: '🧱', text: 'Hold a 2-minute plank', bonusXp: 60 },
  { id: 'walk_8k', emoji: '🚶', text: 'Hit 8,000 steps', bonusXp: 40 },
  { id: 'stretch_10', emoji: '🧘', text: 'Stretch for 10 minutes', bonusXp: 30 },
  { id: 'burpees_25', emoji: '🔥', text: 'Finish 25 burpees', bonusXp: 70 },
  { id: 'lunges_40', emoji: '🏃', text: 'Do 40 walking lunges', bonusXp: 50 },
  { id: 'water_8', emoji: '💧', text: 'Drink 8 glasses of water', bonusXp: 20 },
];

/** The challenge for a given calendar day (UTC day index keeps it stable). */
export function challengeForDate(date = new Date()): DailyChallenge {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return CHALLENGES[((dayIndex % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
}

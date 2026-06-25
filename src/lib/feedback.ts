// The user's most recent difficulty rating, used to adapt the next workout.
// Persisted via the synced preferences bag (profiles.preferences), so it
// follows the user across devices when signed in.

import type { DifficultyFeedback } from '@/types';
import { getPreferences, updatePreferences } from './preferences';

export async function getLastDifficulty(): Promise<DifficultyFeedback | null> {
  return (await getPreferences()).lastDifficulty ?? null;
}

export async function setLastDifficulty(f: DifficultyFeedback): Promise<void> {
  await updatePreferences({ lastDifficulty: f });
}

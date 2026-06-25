// Persists the user's most recent difficulty rating so the next workout
// generation can adapt (harder if "too easy", easier if "too hard").

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DifficultyFeedback } from '@/types';

const KEY = 'fitdaily.lastDifficulty.v1';

export async function getLastDifficulty(): Promise<DifficultyFeedback | null> {
  try {
    return (await AsyncStorage.getItem(KEY)) as DifficultyFeedback | null;
  } catch {
    return null;
  }
}

export async function setLastDifficulty(f: DifficultyFeedback): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, f);
  } catch {
    // best-effort
  }
}

// User preferences that sync across devices via profiles.preferences (JSONB).
//
// Remote-first when signed in (Supabase is the source of truth), with an
// AsyncStorage cache so reads are instant and demo mode / offline still works.
// Reads merge: remote wins when available, else the local cache.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import type { DifficultyFeedback } from '@/types';
import type { Json } from '@/types/supabase';

export interface Preferences {
  lastDifficulty?: DifficultyFeedback | null;
  reminderEnabled?: boolean;
}

const CACHE_KEY = 'fitdaily.prefs.v1';

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function readLocal(): Promise<Preferences> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Preferences) : {};
  } catch {
    return {};
  }
}

async function writeLocal(prefs: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  } catch {
    // best-effort cache
  }
}

export async function getPreferences(): Promise<Preferences> {
  const uid = await currentUserId();
  if (supabase && uid) {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', uid)
      .maybeSingle();
    if (!error && data?.preferences) {
      const prefs = data.preferences as Preferences;
      await writeLocal(prefs);
      return prefs;
    }
  }
  return readLocal();
}

/** Merge a patch into preferences (local always; remote when signed in). */
export async function updatePreferences(patch: Partial<Preferences>): Promise<Preferences> {
  const uid = await currentUserId();

  if (supabase && uid) {
    // Merge against the remote blob so we don't clobber other keys.
    const { data } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', uid)
      .maybeSingle();
    const merged: Preferences = { ...((data?.preferences as Preferences) ?? {}), ...patch };
    await supabase
      .from('profiles')
      .update({ preferences: merged as unknown as Json })
      .eq('id', uid);
    await writeLocal(merged);
    return merged;
  }

  const merged: Preferences = { ...(await readLocal()), ...patch };
  await writeLocal(merged);
  return merged;
}

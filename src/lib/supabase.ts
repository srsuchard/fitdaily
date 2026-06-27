import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from './env';
import type { Database } from '@/types/supabase';

/**
 * Typed with the generated `Database` schema, so `.from()` queries are
 * column-checked. `null` when env vars are absent (demo mode) — callers guard.
 */
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // React Native has no URL-based session detection.
        detectSessionInUrl: false,
      },
    })
  : null;

import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from './env';

/**
 * `null` when Supabase env vars are absent (demo mode). Callers must guard.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // React Native has no URL-based session detection.
        detectSessionInUrl: false,
      },
    })
  : null;

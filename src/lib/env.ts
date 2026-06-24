// Centralized access to public env vars.
//
// IMPORTANT: only `process.env.EXPO_PUBLIC_*` references are statically inlined
// into the bundle by Expo. Reading `process.env[dynamicName]` does NOT work, so
// every key must be referenced by its literal name below.

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  workoutFnUrl: process.env.EXPO_PUBLIC_WORKOUT_FN_URL,
} as const;

/** When false, the app runs in demo mode (local mock auth, no network). */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

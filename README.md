# FitDaily

One personalized workout a day for the everyday person. React Native + Expo (SDK 56),
Supabase backend, RevenueCat subscriptions, and an LLM-powered adaptive workout engine.

> **App name `FitDaily` is a placeholder** — change it in `app.json` (`name`, `slug`,
> `scheme`, `ios.bundleIdentifier`, `android.package`) and `package.json`.

## Quick start

```bash
npm install
cp .env.example .env   # optional — app runs in demo mode with no values
npx expo start         # press i for iOS simulator, or scan QR in Expo Go
```

**Demo mode:** with no `.env` values the app boots with a local mock identity,
mock workout generation, and a "simulate premium" toggle (Profile tab) so the full
UI is explorable without any backend.

## Development build (HealthKit + RevenueCat)

Apple HealthKit and RevenueCat are **native modules** — they don't run in Expo Go.
The code degrades gracefully (HealthKit stats simply don't appear; purchases are
simulated), but to exercise them for real you need a development build:

```bash
# Local simulator/device build:
npx expo run:ios

# Or via EAS (uses the "development" profile in eas.json):
eas build --profile development --platform ios
```

HealthKit also requires the **HealthKit capability** on your App ID in the Apple
Developer portal; the config plugin adds the entitlement + usage strings at build time.

## Architecture

```
src/
  app/                      expo-router routes (file-based)
    _layout.tsx             providers + auth-gate redirects
    sign-in.tsx             email/password (or demo entry)
    onboarding.tsx          3-step questionnaire (goal / time / equipment)
    paywall.tsx             subscription tiers (RevenueCat or fallback)
    (tabs)/
      _layout.tsx           native tab bar
      index.tsx             Today — the hero adaptive-workout screen
      progress.tsx          streak + consistency charts (30-day chart = premium)
      profile.tsx           account, subscription, restore, sign out
  lib/
    supabase.ts             auth + DB client (null in demo mode)
    revenuecat.ts           subscriptions, guarded for Expo Go
    workoutEngine.ts        prompt builder, remote call, local mock + free templates
    progressStore.ts        local-first completion + streak math
    health.ts               Apple HealthKit reads (steps, active energy), guarded
    env.ts                  EXPO_PUBLIC_* access
  providers/
    AuthProvider.tsx        session + entitlement + onboarding state
    ProgressProvider.tsx    completions / streak state
  components/               PrimaryButton, WorkoutCard, charts, streak banner, themed-*
  types/                    domain types

supabase/
  migrations/
    0001_init_rls.sql       profiles + entitlement + RLS trust model (pre-existing)
    0002_fitness_domain.sql daily_workouts + workout_completions + streak RPC
  functions/
    generate-workout/       Edge Function: holds the OpenAI key, returns a WorkoutPlan
```

## Free vs Premium

| Feature                        | Free | Premium |
| ------------------------------ | :--: | :-----: |
| 3 starter workout templates    |  ✓   |    ✓    |
| Daily AI-generated workout     |      |    ✓    |
| Workout history / 7-day view   |  ✓   |    ✓    |
| 30-day consistency trend chart |      |    ✓    |

Premium is enforced **server-side**: the Edge Function rejects non-premium callers,
and a DB trigger blocks storing AI workouts without the `premium_access` entitlement.
The client paywall is just UX.

## Backend setup (when ready)

1. Create a Supabase project; run `supabase db push` to apply both migrations.
2. `supabase functions deploy generate-workout` and
   `supabase secrets set OPENAI_API_KEY=sk-...`
3. In RevenueCat: create the `premium_access` entitlement + monthly/annual products,
   and wire the webhook to update `profiles.entitlement` via the service_role key.
4. Fill `.env` with the Supabase URL/anon key, RevenueCat public keys, and the
   deployed function URL.

## Key safety

The OpenAI key and Supabase `service_role` key are **never** in the app bundle — only
`EXPO_PUBLIC_*` values ship to the client. The LLM is called exclusively from the
Edge Function.

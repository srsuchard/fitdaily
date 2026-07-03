# FitDaily — Google Play Store Listing

Copy for the Play Console listing (package `com.fitdaily.app`). Grounded in the
app's actual features: AI-personalized daily workouts by goal/time/equipment/
experience, difficulty that adapts to feedback, streaks/XP/levels/achievements,
daily challenge, and progress charts. Step/energy tracking is intentionally
omitted — it's iOS-only (HealthKit) and no-ops on Android.

## App name (30 char max)

```
FitDaily: AI Daily Workouts
```

(27 chars)

## Short description (80 char max)

```
Personalized AI workouts that fit your goals, time, and gear. Build a streak.
```

(76 chars)

## Full description (4000 char max, ~1,750 used)

```
FitDaily builds you a fresh, personalized workout every single day — no cookie-cutter plans, no guesswork. Tell us your goal, how much time you have, and what equipment is on hand, and FitDaily's AI does the rest.

A NEW WORKOUT EVERY DAY
Open the app and today's session is already waiting — matched to your goal, your schedule, and your gear. Got 15 minutes and no equipment? Done. An hour at a full gym? Also done.

BUILT AROUND YOU
Set up your plan in under a minute:
• Goal — lose weight, build muscle, stay active, or improve endurance
• Time — pick how many minutes you have today
• Equipment — bodyweight only, dumbbells, resistance bands, or a full gym
• Experience — beginner, intermediate, or advanced

WORKOUTS THAT ADAPT
After each session, tell FitDaily whether it was too easy, just right, or too hard. Your next workout adjusts automatically, so the difficulty always meets you where you are — and grows with you.

STAY CONSISTENT, STAY MOTIVATED
Consistency beats intensity. FitDaily is designed to keep you coming back:
• Daily streaks — don't break the chain
• XP and levels — earn progress with every workout
• Achievements — unlock milestones as you go
• Daily challenge — a little extra push when you want it
• Progress charts — see your consistency build over time

NO EQUIPMENT? NO PROBLEM
Every workout can be done with just your bodyweight, so you can train at home, while traveling, or anywhere you have a bit of floor space.

WHY FITDAILY
• Personalized — every workout is generated for your goal, time, and equipment
• Fast — a ready-to-go session the moment you open the app
• Adaptive — difficulty tunes itself to your feedback
• Motivating — streaks, levels, and achievements keep you consistent
• Simple — no endless video libraries or overwhelming plans

Whether you're just getting started or training regularly, FitDaily makes it easy to show up every day and actually enjoy it.

Start your streak today.
```

## Assets checklist

- App icon — 512×512 PNG (start from `marketing/assets/icon.png`)
- Feature graphic — 1024×500 (optional tagline: "Your AI workout, every day.")
- Phone screenshots — at least 2
- Privacy policy URL — https://fitdaily.net/privacy-policy.html

---

# Data safety form answers

Based on the app's actual data flows (verified in code, 2026-07-02):
- **Email + password** → Supabase Auth (account sign-in / sign-up).
- **Fitness profile** (goal, minutes/day, equipment, experience) + **workout
  completions** → sent to Supabase (`workout_completions` table) and to the
  Claude-backed `generate-workout` edge function to build each workout.
- **No** analytics SDKs, **no** location, **no** contacts/photos, **no** ads.
- Billing is currently off (RevenueCat Android key empty) → do **not** declare
  purchase/financial data yet. Revisit when IAP is enabled.

## Overview questions

- Does your app collect or share any of the required user data types? — **Yes**
- Is all of the user data collected by your app encrypted in transit? — **Yes**
  (Supabase / HTTPS / TLS)
- Do you provide a way for users to request that their data is deleted? — **Yes**
  ⚠️ See "Action needed" below — you must expose a deletion channel first.

## Data types collected

### 1. Personal info → Email address
- Collected: **Yes** · Shared: **No**
- Processed ephemerally: **No**
- Required or optional: **Required** (needed to create an account / sign in)
- Purposes: **App functionality**, **Account management**

### 2. Health and fitness → Fitness info
- (Fitness goal, experience level, time available, equipment, workout completions)
- Collected: **Yes** · Shared: **No**
- Processed ephemerally: **No**
- Required or optional: **Required** (used to generate each workout)
- Purposes: **App functionality**, **Personalization**
- Note: this profile is processed by Anthropic (Claude API) via your own backend
  edge function, acting as a **service provider / processor** — under Play this is
  "collected/processed," not "shared."

### 3. (Optional) App activity → App interactions
- Only if you want to itemize workout-completion logs separately from Fitness info.
  Otherwise they're covered under Fitness info above. Collected: Yes · Shared: No ·
  Purpose: App functionality.

## Data NOT collected (leave unchecked)

Location · Financial info · Contacts · Photos/videos · Audio · Messages ·
Calendar · Web browsing history · Installed apps · Device or other IDs (no
analytics/ads SDK) · Purchase history (billing off).

## ⚠️ Action needed before you can truthfully answer "Yes" to deletion

The app has **no in-app "delete account"** flow today. Play requires either an
in-app deletion path or a documented request channel. Cheapest fix: add a line to
the privacy policy (fitdaily.net/privacy-policy.html) — "To delete your account and
data, email support@fitdaily.net" — and provide that URL as the deletion request
URL in the form. Better long-term: add an in-app "Delete account" button. Until
one exists, answer the deletion question honestly.

---

# Content rating questionnaire (IARC)

FitDaily is a fitness/health utility with no objectionable content. Expected
answers → rating: **Everyone / PEGI 3**.

- App category: **Utility, Productivity, Health, or similar** (not a game)
- Violence, sexual content, profanity, controlled substances, gambling — **No** to all
- Does the app share the user's location with other users? — **No**
- Does the app allow users to interact or exchange content? — **No**
- Does the app collect/share personal info? — **Yes** (email; drives a data
  disclosure, not a mature rating)
- Digital purchases — **No** for now (enable when IAP ships)

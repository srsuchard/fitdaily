// Domain types for FitDaily.

export type Entitlement = 'free' | 'premium';

/** Mirrors the `public.profiles` row (see supabase/migrations/0001_init_rls.sql). */
export interface Profile {
  id: string;
  email: string;
  entitlement: Entitlement;
  entitlement_expires_at: string | null;
  created_at: string;
}

// --- Onboarding ------------------------------------------------------------

export type FitnessGoal =
  | 'lose_weight'
  | 'build_muscle'
  | 'stay_active'
  | 'improve_endurance';

export type Equipment = 'bodyweight' | 'dumbbells' | 'resistance_bands' | 'full_gym';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/** Collected by the 3-step onboarding questionnaire. */
export interface OnboardingProfile {
  goal: FitnessGoal;
  /** Daily time availability, in minutes. */
  minutesPerDay: number;
  equipment: Equipment[];
  experience: ExperienceLevel;
}

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_weight: 'Lose weight',
  build_muscle: 'Build muscle',
  stay_active: 'Stay active',
  improve_endurance: 'Improve endurance',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bodyweight: 'Bodyweight only',
  dumbbells: 'Dumbbells',
  resistance_bands: 'Resistance bands',
  full_gym: 'Full gym',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner — new to working out',
  intermediate: 'Intermediate — train sometimes',
  advanced: 'Advanced — train regularly',
};

// --- Workouts --------------------------------------------------------------

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  /** For timed moves (e.g. plank, jog) instead of reps. */
  durationSeconds?: number;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutBlock {
  /** e.g. "Warm-up", "Main set", "Cooldown". */
  title: string;
  exercises: Exercise[];
}

/** The structured JSON payload the workout engine produces. */
export interface WorkoutPlan {
  title: string;
  focus: string;
  estimatedMinutes: number;
  blocks: WorkoutBlock[];
  /** True when produced by the LLM (premium), false for a free template. */
  aiGenerated: boolean;
}

/** A locally + remotely tracked completed workout. */
export interface WorkoutCompletion {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  planTitle: string;
  durationMinutes: number;
}

/** Post-workout difficulty rating; feeds the next day's generation. */
export type DifficultyFeedback = 'too_easy' | 'just_right' | 'too_hard';

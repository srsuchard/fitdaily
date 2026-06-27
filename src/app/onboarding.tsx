import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ScreenBackground } from '@/components/screen-background';
import { WorkoutCard } from '@/components/workout-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateDailyWorkout } from '@/lib/workoutEngine';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkoutSession } from '@/providers/WorkoutSessionProvider';
import {
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  type Equipment,
  type ExperienceLevel,
  type FitnessGoal,
  type OnboardingProfile,
  type WorkoutPlan,
} from '@/types';

const TIME_OPTIONS = [15, 30, 45, 60];
// Question steps are 0..LAST_STEP; PLAN_STEP reveals the generated plan.
const LAST_STEP = 3;
const PLAN_STEP = 4;

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choice,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}>
      <ThemedText
        style={[styles.choiceText, { color: selected ? theme.accentText : theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { onboarding, completeOnboarding, accessToken } = useAuth();
  const { setActivePlan } = useWorkoutSession();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<FitnessGoal>(onboarding?.goal ?? 'stay_active');
  const [minutes, setMinutes] = useState<number>(onboarding?.minutesPerDay ?? 30);
  const [equipment, setEquipment] = useState<Equipment[]>(onboarding?.equipment ?? ['bodyweight']);
  const [experience, setExperience] = useState<ExperienceLevel>(
    onboarding?.experience ?? 'beginner',
  );
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [generating, setGenerating] = useState(false);

  const toggleEquip = (e: Equipment) =>
    setEquipment((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  // Save answers, generate a personalized first workout, and reveal it.
  const buildPlan = async () => {
    const profile: OnboardingProfile = {
      goal,
      minutesPerDay: minutes,
      equipment: equipment.length ? equipment : ['bodyweight'],
      experience,
    };
    await completeOnboarding(profile);
    setStep(PLAN_STEP);
    setGenerating(true);
    try {
      setPlan(await generateDailyWorkout(profile, accessToken));
    } finally {
      setGenerating(false);
    }
  };

  const startFirstWorkout = () => {
    if (!plan) return;
    setActivePlan(plan);
    router.replace('/workout');
  };

  const goHome = () => router.replace('/');

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {step <= LAST_STEP && (
            <ThemedText type="small" themeColor="textSecondary">
              Step {step + 1} of {LAST_STEP + 1}
            </ThemedText>
          )}

          {step === 0 && (
            <>
              <ThemedText type="subtitle">What’s your main goal?</ThemedText>
              <View style={styles.choices}>
                {(Object.keys(GOAL_LABELS) as FitnessGoal[]).map((g) => (
                  <Choice key={g} label={GOAL_LABELS[g]} selected={goal === g} onPress={() => setGoal(g)} />
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <ThemedText type="subtitle">How much time per day?</ThemedText>
              <View style={styles.choices}>
                {TIME_OPTIONS.map((m) => (
                  <Choice
                    key={m}
                    label={`${m} minutes`}
                    selected={minutes === m}
                    onPress={() => setMinutes(m)}
                  />
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <ThemedText type="subtitle">What equipment do you have?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Select all that apply.
              </ThemedText>
              <View style={styles.choices}>
                {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((e) => (
                  <Choice
                    key={e}
                    label={EQUIPMENT_LABELS[e]}
                    selected={equipment.includes(e)}
                    onPress={() => toggleEquip(e)}
                  />
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <ThemedText type="subtitle">What’s your experience level?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                We’ll tune workout intensity to match.
              </ThemedText>
              <View style={styles.choices}>
                {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map((x) => (
                  <Choice
                    key={x}
                    label={EXPERIENCE_LABELS[x]}
                    selected={experience === x}
                    onPress={() => setExperience(x)}
                  />
                ))}
              </View>
            </>
          )}

          {step === PLAN_STEP && (
            <>
              <ThemedText type="subtitle">Your plan is ready 🎯</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Built for {GOAL_LABELS[goal].toLowerCase()} · {minutes} min ·{' '}
                {EXPERIENCE_LABELS[experience].split(' — ')[0].toLowerCase()}
              </ThemedText>
              {generating || !plan ? (
                <View style={styles.loading}>
                  <ActivityIndicator />
                  <ThemedText type="small" themeColor="textSecondary">
                    Generating your first workout…
                  </ThemedText>
                </View>
              ) : (
                <WorkoutCard plan={plan} />
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === PLAN_STEP ? (
            <>
              <PrimaryButton
                variant="secondary"
                title="Skip for now"
                style={styles.footerBtn}
                onPress={goHome}
              />
              <PrimaryButton
                title="Start first workout"
                style={styles.footerBtn}
                disabled={generating || !plan}
                onPress={startFirstWorkout}
              />
            </>
          ) : (
            <>
              {step > 0 && (
                <PrimaryButton
                  variant="secondary"
                  title="Back"
                  style={styles.footerBtn}
                  onPress={() => setStep((s) => s - 1)}
                />
              )}
              <PrimaryButton
                title={step === LAST_STEP ? 'Build my plan' : 'Continue'}
                style={styles.footerBtn}
                onPress={() => (step === LAST_STEP ? buildPlan() : setStep((s) => s + 1))}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three },
  choices: { gap: Spacing.two, marginTop: Spacing.two },
  loading: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.six },
  choice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  choiceText: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.four },
  footerBtn: { flex: 1 },
});

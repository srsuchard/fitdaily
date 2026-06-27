import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsistencyBanner } from '@/components/streak-banner';
import { DailyChallenge } from '@/components/daily-challenge';
import { HealthStats } from '@/components/health-stats';
import { LevelCard } from '@/components/level-card';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { WorkoutCard } from '@/components/workout-card';
import { Spacing } from '@/constants/theme';
import { getLastDifficulty } from '@/lib/feedback';
import { FREE_TEMPLATES, generateDailyWorkout } from '@/lib/workoutEngine';
import { useAuth } from '@/providers/AuthProvider';
import { useProgress } from '@/providers/ProgressProvider';
import { useWorkoutSession } from '@/providers/WorkoutSessionProvider';
import type { DifficultyFeedback, WorkoutPlan } from '@/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const router = useRouter();
  const { onboarding, isPremium, accessToken } = useAuth();
  const { completedToday, streak, streakProtected, level, unlockedCount, achievements } =
    useProgress();
  const { setActivePlan } = useWorkoutSession();

  const [plan, setPlan] = useState<WorkoutPlan>(FREE_TEMPLATES[0]);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<DifficultyFeedback | null>(null);

  // Load the last difficulty rating so generation can adapt intensity.
  useEffect(() => {
    getLastDifficulty().then(setFeedback);
  }, []);

  const generate = useCallback(async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (!onboarding) return;
    setGenerating(true);
    try {
      const next = await generateDailyWorkout(onboarding, accessToken, { feedback });
      setPlan(next);
    } finally {
      setGenerating(false);
    }
  }, [isPremium, onboarding, accessToken, feedback, router]);

  // Premium users get a fresh, feedback-adapted AI workout on open.
  useEffect(() => {
    if (isPremium && onboarding) {
      generateDailyWorkout(onboarding, accessToken, { feedback }).then(setPlan).catch(() => {});
    }
  }, [isPremium, onboarding, accessToken, feedback]);

  const startWorkout = useCallback(() => {
    setActivePlan(plan);
    router.push('/workout');
  }, [plan, router, setActivePlan]);

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedText type="small" themeColor="textSecondary">
            {greeting()}
          </ThemedText>
          <ThemedText type="title" style={styles.h1}>
            Today’s workout
          </ThemedText>

          <Animated.View entering={FadeInDown.springify().damping(16)}>
            <LevelCard
              info={level}
              unlockedCount={unlockedCount}
              totalBadges={achievements.length}
              onPress={() => router.push('/(tabs)/progress')}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
            <ConsistencyBanner
              streak={streak}
              completedToday={completedToday}
              protectedActive={streakProtected}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).springify().damping(16)}>
            <DailyChallenge completed={completedToday} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).springify().damping(16)}>
            <HealthStats />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).springify().damping(16)}>
            <WorkoutCard plan={plan} />
          </Animated.View>

          {completedToday && (
            <View style={styles.doneRow}>
              <ThemedText type="smallBold" themeColor="success">
                ✓ Completed today — nice work!
              </ThemedText>
            </View>
          )}

          <PrimaryButton
            title={completedToday ? 'Do another round' : 'Start workout'}
            onPress={startWorkout}
          />

          <PrimaryButton
            variant="secondary"
            loading={generating}
            title={isPremium ? 'Generate a fresh workout' : '✨ Unlock AI daily workouts'}
            onPress={generate}
          />

          {!isPremium && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.freeNote}>
              You’re on the free plan with 3 starter templates. Upgrade for a new AI-generated
              workout tailored to you every day.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  h1: { marginBottom: Spacing.two },
  doneRow: { alignItems: 'center', paddingVertical: Spacing.two },
  freeNote: { textAlign: 'center' },
});

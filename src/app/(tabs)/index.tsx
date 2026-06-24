import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsistencyBanner } from '@/components/streak-banner';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutCard } from '@/components/workout-card';
import { Spacing } from '@/constants/theme';
import { FREE_TEMPLATES, generateDailyWorkout } from '@/lib/workoutEngine';
import { useAuth } from '@/providers/AuthProvider';
import { useProgress } from '@/providers/ProgressProvider';
import type { WorkoutPlan } from '@/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const router = useRouter();
  const { onboarding, isPremium, accessToken } = useAuth();
  const { completedToday, streak, recordCompletion } = useProgress();

  const [plan, setPlan] = useState<WorkoutPlan>(FREE_TEMPLATES[0]);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (!onboarding) return;
    setGenerating(true);
    try {
      const next = await generateDailyWorkout(onboarding, accessToken);
      setPlan(next);
    } finally {
      setGenerating(false);
    }
  }, [isPremium, onboarding, accessToken, router]);

  // Premium users get a fresh AI workout on open.
  useEffect(() => {
    if (isPremium && onboarding) {
      generateDailyWorkout(onboarding, accessToken).then(setPlan).catch(() => {});
    }
  }, [isPremium, onboarding, accessToken]);

  const complete = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    await recordCompletion(plan.title, plan.estimatedMinutes);
  }, [plan, recordCompletion]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedText type="small" themeColor="textSecondary">
            {greeting()}
          </ThemedText>
          <ThemedText type="title" style={styles.h1}>
            Today’s workout
          </ThemedText>

          <ConsistencyBanner streak={streak} completedToday={completedToday} />

          <WorkoutCard plan={plan} />

          {completedToday ? (
            <View style={styles.doneRow}>
              <ThemedText type="smallBold" themeColor="success">
                ✓ Completed today — nice work!
              </ThemedText>
            </View>
          ) : (
            <PrimaryButton title="Mark workout complete" onPress={complete} />
          )}

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
    </ThemedView>
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

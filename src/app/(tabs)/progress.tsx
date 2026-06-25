import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsistencyChart, WeekDots } from '@/components/consistency-chart';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useProgress } from '@/providers/ProgressProvider';

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const { isPremium } = useAuth();
  const { streak, totalWorkouts, last7, last30 } = useProgress();

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Progress</ThemedText>

          <View style={styles.statsRow}>
            <Stat value={streak} label="Day streak" />
            <Stat value={totalWorkouts} label="Total workouts" />
          </View>

          <ThemedView type="backgroundElement" style={styles.weekCard}>
            <ThemedText type="smallBold">This week</ThemedText>
            <WeekDots days={last7} />
          </ThemedView>

          {isPremium ? (
            <ConsistencyChart days={last30} />
          ) : (
            <ThemedView type="backgroundElement" style={styles.lockCard}>
              <ThemedText type="subtitle">📈 30-day trends</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.lockText}>
                Historical consistency charts are a premium feature. Upgrade to see how your
                training trends over time.
              </ThemedText>
              <PrimaryButton title="Unlock premium" onPress={() => router.push('/paywall')} />
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  statsRow: { flexDirection: 'row', gap: Spacing.three },
  stat: { flex: 1, padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.one },
  weekCard: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  lockCard: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  lockText: { lineHeight: 20 },
});

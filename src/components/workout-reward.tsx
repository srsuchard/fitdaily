import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { levelInfo, levelTitle, type CompletionResult } from '@/lib/gamification';
import { XpBar } from './xp-bar';

/** Animated count-up from 0 → `to` over `duration` ms. */
function useCountUp(to: number, duration = 700): number {
  const [value, setValue] = useState(() => (to <= 0 ? to : 0));
  useEffect(() => {
    if (to <= 0) return;
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      // easeOutCubic for a satisfying deceleration
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [to, duration]);
  return value;
}

export function WorkoutReward({
  result,
  onContinue,
}: {
  result: CompletionResult;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const xp = useCountUp(result.xpGained);
  const level = levelInfo(result.totalXp);

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
          <ThemedText style={styles.celebrate}>🎉</ThemedText>
          <ThemedText type="title" style={styles.centerText}>
            Workout complete
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify().damping(14)}>
          <ThemedView type="backgroundElement" style={styles.xpCard}>
            <ThemedText style={[styles.xpGain, { color: theme.accent }]}>
              +{xp} XP
            </ThemedText>
            <XpBar info={level} />
          </ThemedView>
        </Animated.View>

        {result.leveledUpTo != null && (
          <Animated.View entering={FadeInDown.delay(350).springify().damping(12)}>
            <ThemedView style={[styles.levelUp, { backgroundColor: theme.accent }]}>
              <ThemedText style={[styles.levelUpLabel, { color: theme.accentText }]}>
                ⬆ LEVEL UP
              </ThemedText>
              <ThemedText style={[styles.levelUpTitle, { color: theme.accentText }]}>
                Level {result.leveledUpTo} · {levelTitle(result.leveledUpTo)}
              </ThemedText>
            </ThemedView>
          </Animated.View>
        )}

        <Animated.View entering={FadeIn.delay(500)} style={styles.center}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            🔥 {result.streak}-day streak
          </ThemedText>
        </Animated.View>

        {result.newAchievements.map((a, i) => (
          <Animated.View
            key={a.id}
            entering={FadeInDown.delay(600 + i * 120).springify().damping(13)}>
            <ThemedView type="backgroundElement" style={styles.badgeRow}>
              <ThemedText style={styles.badgeEmoji}>{a.emoji}</ThemedText>
              <View style={styles.badgeText}>
                <ThemedText type="small" themeColor="textSecondary">
                  New badge unlocked
                </ThemedText>
                <ThemedText type="smallBold">{a.title}</ThemedText>
              </View>
            </ThemedView>
          </Animated.View>
        ))}
      </View>

      <PrimaryButton title="Continue" onPress={onContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  center: { alignItems: 'center', gap: Spacing.one },
  centerText: { textAlign: 'center' },
  celebrate: { fontSize: 56, textAlign: 'center' },
  xpCard: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  xpGain: { fontSize: 40, fontWeight: '800', textAlign: 'center' },
  levelUp: {
    padding: Spacing.three,
    borderRadius: Spacing.four,
    alignItems: 'center',
    gap: Spacing.half,
  },
  levelUpLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  levelUpTitle: { fontSize: 20, fontWeight: '800' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  badgeEmoji: { fontSize: 32 },
  badgeText: { flex: 1, gap: 1 },
});

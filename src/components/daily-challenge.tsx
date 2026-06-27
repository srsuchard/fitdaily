import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { challengeForDate } from '@/lib/dailyChallenge';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/** Today's rotating challenge card. */
export function DailyChallenge({ completed = false }: { completed?: boolean }) {
  const theme = useTheme();
  const challenge = challengeForDate();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.emoji}>{challenge.emoji}</ThemedText>
      <View style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary">
          Today’s challenge
        </ThemedText>
        <ThemedText type="smallBold" style={styles.text}>
          {challenge.text}
        </ThemedText>
      </View>
      {completed ? (
        <View style={[styles.chip, { backgroundColor: theme.success }]}>
          <ThemedText style={[styles.chipText, { color: theme.accentText }]}>✓ Done</ThemedText>
        </View>
      ) : (
        <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText style={[styles.chipText, { color: theme.accent }]}>
            +{challenge.bonusXp} XP
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  emoji: { fontSize: 28 },
  body: { flex: 1, gap: 1 },
  text: { lineHeight: 20 },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.two },
  chipText: { fontSize: 13, fontWeight: '800' },
});

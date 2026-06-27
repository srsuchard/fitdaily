import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EvaluatedAchievement, GamificationStats } from '@/lib/gamification';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

function Badge({
  item,
  stats,
}: {
  item: EvaluatedAchievement;
  stats: GamificationStats;
}) {
  const theme = useTheme();
  const { def, unlocked } = item;
  const { current, goal } = def.progress(stats);
  const pct = Math.round(Math.min(1, current / goal) * 100);

  return (
    <ThemedView type="backgroundElement" style={[styles.badge, !unlocked && styles.locked]}>
      <ThemedText style={[styles.emoji, !unlocked && styles.lockedEmoji]}>{def.emoji}</ThemedText>
      <ThemedText type="smallBold" style={styles.badgeTitle} numberOfLines={2}>
        {def.title}
      </ThemedText>
      {unlocked ? (
        <ThemedText type="small" style={{ color: theme.success }}>
          Unlocked
        </ThemedText>
      ) : (
        <>
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.fill, { backgroundColor: theme.accent, width: `${pct}%` }]} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {current}/{goal}
          </ThemedText>
        </>
      )}
    </ThemedView>
  );
}

/** Responsive grid of achievement badges (locked badges show progress). */
export function AchievementGrid({
  achievements,
  stats,
}: {
  achievements: EvaluatedAchievement[];
  stats: GamificationStats;
}) {
  return (
    <View style={styles.grid}>
      {achievements.map((item) => (
        <View key={item.def.id} style={styles.cell}>
          <Badge item={item} stats={stats} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  // Three roughly-equal columns; basis < 33% so gaps fit without wrapping to one.
  cell: { flexGrow: 1, flexBasis: '28%' },
  badge: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    minHeight: 110,
    justifyContent: 'center',
  },
  locked: { opacity: 0.7 },
  emoji: { fontSize: 30 },
  lockedEmoji: { opacity: 0.45 },
  badgeTitle: { textAlign: 'center' },
  track: { height: 6, borderRadius: 3, width: '80%', overflow: 'hidden', marginTop: 2 },
  fill: { height: 6, borderRadius: 3 },
});

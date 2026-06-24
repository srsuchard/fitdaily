import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise, WorkoutPlan } from '@/types';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

function exerciseDetail(e: Exercise): string {
  const parts: string[] = [];
  if (e.sets) parts.push(`${e.sets} ×`);
  if (e.reps) parts.push(`${e.reps} reps`);
  if (e.durationSeconds) parts.push(`${e.durationSeconds}s`);
  if (e.restSeconds) parts.push(`· ${e.restSeconds}s rest`);
  return parts.join(' ');
}

export function WorkoutCard({ plan }: { plan: WorkoutPlan }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">{plan.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {plan.focus} · ~{plan.estimatedMinutes} min
          </ThemedText>
        </View>
        {plan.aiGenerated && (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <ThemedText style={[styles.badgeText, { color: theme.accentText }]}>AI</ThemedText>
          </View>
        )}
      </View>

      {plan.blocks.map((block) => (
        <View key={block.title} style={styles.block}>
          <ThemedText type="smallBold" style={styles.blockTitle}>
            {block.title.toUpperCase()}
          </ThemedText>
          {block.exercises.map((ex, i) => (
            <View key={`${ex.name}-${i}`} style={[styles.row, { borderTopColor: theme.border }]}>
              <ThemedText style={styles.exName}>{ex.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {exerciseDetail(ex)}
              </ThemedText>
            </View>
          ))}
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.two,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  block: { gap: Spacing.one },
  blockTitle: { letterSpacing: 1, marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exName: { fontSize: 16, fontWeight: '500', flex: 1 },
});

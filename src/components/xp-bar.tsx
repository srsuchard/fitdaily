import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LevelInfo } from '@/lib/gamification';
import { ThemedText } from './themed-text';

/** A labeled linear XP progress bar for the current level. */
export function XpBar({ info, showLabels = true }: { info: LevelInfo; showLabels?: boolean }) {
  const theme = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, info.progress)) * 100);

  return (
    <View style={styles.wrap}>
      {showLabels && (
        <View style={styles.labels}>
          <ThemedText type="smallBold">
            Lv {info.level} · {info.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {info.xpToNext} XP to Lv {info.level + 1}
          </ThemedText>
        </View>
      )}
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
});

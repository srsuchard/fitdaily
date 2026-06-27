import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LevelInfo } from '@/lib/gamification';
import { LevelRing } from './level-ring';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/** Compact level summary: XP ring + title, XP-to-next, and badge count. */
export function LevelCard({
  info,
  unlockedCount,
  totalBadges,
  onPress,
}: {
  info: LevelInfo;
  unlockedCount: number;
  totalBadges: number;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const content = (
    <ThemedView type="backgroundElement" style={styles.card}>
      <LevelRing info={info} />
      <View style={styles.text}>
        <ThemedText type="subtitle" style={styles.title}>
          {info.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {info.xpToNext} XP to Level {info.level + 1}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          🏅 {unlockedCount}/{totalBadges} badges
        </ThemedText>
      </View>
    </ThemedView>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  text: { flex: 1, gap: Spacing.half },
  title: { lineHeight: 36 },
});

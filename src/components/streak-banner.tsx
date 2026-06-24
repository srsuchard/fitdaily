import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function ConsistencyBanner({
  streak,
  completedToday,
}: {
  streak: number;
  completedToday: boolean;
}) {
  const theme = useTheme();

  const message =
    streak === 0
      ? 'Start your streak today 💪'
      : completedToday
        ? `🔥 ${streak}-day streak — locked in for today`
        : `🔥 ${streak}-day streak — don’t break it!`;

  return (
    <ThemedView type="backgroundElement" style={styles.banner}>
      <View style={[styles.flame, { backgroundColor: theme.accent }]}>
        <ThemedText style={[styles.flameNum, { color: theme.accentText }]}>{streak}</ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.msg}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  flame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameNum: { fontSize: 18, fontWeight: '800' },
  msg: { flex: 1 },
});

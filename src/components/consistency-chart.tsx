import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Line as SvgLine } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/** A compact row of dots for the last 7 days (free tier). */
export function WeekDots({ days }: { days: { date: string; done: boolean }[] }) {
  const theme = useTheme();
  return (
    <View style={styles.dotsRow}>
      {days.map((d) => {
        const label = new Date(d.date).toLocaleDateString('en-US', { weekday: 'narrow' });
        return (
          <View key={d.date} style={styles.dotCol}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: d.done ? theme.accent : theme.backgroundSelected,
                },
              ]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

/**
 * A line chart of the rolling 7-day workout count over `days` (premium tier).
 * Shows whether consistency is trending up or down.
 */
export function ConsistencyChart({ days }: { days: { date: string; done: boolean }[] }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const chartWidth = Math.min(width - Spacing.four * 2 - Spacing.four * 2, 520);
  const height = 160;
  const pad = 12;

  const { path, dots, maxY } = useMemo(() => {
    // rolling 7-day completion count for each day
    const counts = days.map((_, i) => {
      const windowStart = Math.max(0, i - 6);
      let c = 0;
      for (let j = windowStart; j <= i; j++) if (days[j].done) c++;
      return c;
    });
    const maxY = Math.max(7, ...counts);
    const n = counts.length;
    const stepX = n > 1 ? (chartWidth - pad * 2) / (n - 1) : 0;
    const x = (i: number) => pad + i * stepX;
    const y = (v: number) => height - pad - (v / maxY) * (height - pad * 2);

    const path = counts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
    const dots = counts.map((v, i) => ({ cx: x(i), cy: y(v) }));
    return { path, dots, maxY };
  }, [days, chartWidth]);

  return (
    <ThemedView type="backgroundElement" style={styles.chartCard}>
      <ThemedText type="smallBold">Consistency (rolling 7-day, last {days.length} days)</ThemedText>
      <Svg width={chartWidth} height={height}>
        {/* baseline */}
        <SvgLine x1={pad} y1={height - pad} x2={chartWidth - pad} y2={height - pad} stroke={theme.border} strokeWidth={1} />
        <Path d={path} stroke={theme.accent} strokeWidth={2.5} fill="none" />
        {dots.map((d, i) => (
          <Circle key={i} cx={d.cx} cy={d.cy} r={2.5} fill={theme.accent} />
        ))}
      </Svg>
      <ThemedText type="small" themeColor="textSecondary">
        Peak: {maxY} workouts / week
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.one },
  dotCol: { alignItems: 'center', gap: Spacing.one },
  dot: { width: 28, height: 28, borderRadius: 14 },
  chartCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
});

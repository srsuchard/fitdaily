import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { LevelInfo } from '@/lib/gamification';
import { ThemedText } from './themed-text';

/** Circular XP-progress ring with the current level in the center. */
export function LevelRing({
  info,
  size = 88,
  strokeWidth = 8,
  children,
}: {
  info: LevelInfo;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, info.progress));
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.backgroundSelected}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        {children ?? (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.lv}>
              LV
            </ThemedText>
            <ThemedText style={styles.num}>{info.level}</ThemedText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  lv: { fontSize: 11, letterSpacing: 1, lineHeight: 14 },
  num: { fontSize: 30, fontWeight: '800', lineHeight: 34 },
});

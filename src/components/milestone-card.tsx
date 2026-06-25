import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

// A shareable summary graphic. Uses plain Text with fixed white colors (not
// themed) since it always sits on the brand gradient — important so the
// captured image looks identical regardless of light/dark mode.
export const MilestoneCard = forwardRef<View, { streak: number; total: number }>(
  ({ streak, total }, ref) => {
    return (
      <View ref={ref} collapsable={false} style={styles.card}>
        <LinearGradient
          colors={['#FF5A3C', '#FF8A3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.brand}>FITDAILY</Text>
        <View style={styles.center}>
          <Text style={styles.bigNum}>{streak}</Text>
          <Text style={styles.label}>day streak 🔥</Text>
        </View>
        <Text style={styles.sub}>{total} workouts completed</Text>
      </View>
    );
  },
);

MilestoneCard.displayName = 'MilestoneCard';

const styles = StyleSheet.create({
  card: {
    width: 300,
    height: 380,
    borderRadius: Spacing.four,
    padding: Spacing.five,
    overflow: 'hidden',
    justifyContent: 'space-between',
    alignSelf: 'center',
  },
  brand: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 2, opacity: 0.9 },
  center: { alignItems: 'center', gap: Spacing.one },
  bigNum: { color: '#ffffff', fontSize: 120, fontWeight: '900', lineHeight: 128 },
  label: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  sub: { color: '#ffffff', fontSize: 16, fontWeight: '600', opacity: 0.95, textAlign: 'center' },
});

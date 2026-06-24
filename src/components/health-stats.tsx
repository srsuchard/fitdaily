import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import {
  getTodayHealthSummary,
  isHealthAvailable,
  requestHealthAuthorization,
  type HealthSummary,
} from '@/lib/health';
import { PrimaryButton } from './primary-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * Shows today's steps + active energy from Apple Health. Renders nothing when
 * HealthKit is unavailable (Expo Go, Android, web), so it's safe everywhere.
 */
export function HealthStats() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<HealthSummary>({ steps: null, activeEnergyKcal: null });
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(async () => {
    setSummary(await getTodayHealthSummary());
  }, []);

  useEffect(() => {
    let mounted = true;
    isHealthAvailable().then((ok) => {
      if (!mounted) return;
      setAvailable(ok);
      if (ok) refresh();
    });
    return () => {
      mounted = false;
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await requestHealthAuthorization();
      await refresh();
    } finally {
      setConnecting(false);
    }
  }, [refresh]);

  if (!available) return null;

  const notAuthorized = summary.steps === null && summary.activeEnergyKcal === null;

  if (notAuthorized) {
    return (
      <ThemedView type="backgroundElement" style={styles.connectCard}>
        <ThemedText type="smallBold">Sync Apple Health</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Connect to show today’s steps and active energy.
        </ThemedText>
        <PrimaryButton title="Connect Apple Health" loading={connecting} onPress={connect} />
      </ThemedView>
    );
  }

  return (
    <View style={styles.row}>
      <Stat value={(summary.steps ?? 0).toLocaleString()} label="Steps today" />
      <Stat value={`${summary.activeEnergyKcal ?? 0}`} label="Active kcal" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three },
  stat: { flex: 1, padding: Spacing.three, borderRadius: Spacing.four, gap: Spacing.one },
  connectCard: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
});

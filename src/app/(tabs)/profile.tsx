import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { GOAL_LABELS } from '@/types';
import { isPurchasesReady, restorePurchases } from '@/lib/revenuecat';
import { useAuth } from '@/providers/AuthProvider';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { userEmail, isPremium, entitlement, onboarding, demoMode, signOut, setEntitlement } = useAuth();
  const [restoring, setRestoring] = useState(false);

  const onRestore = async () => {
    if (!isPurchasesReady()) {
      Alert.alert('Not available', 'In-app purchases require a development or store build.');
      return;
    }
    setRestoring(true);
    try {
      setEntitlement(await restorePurchases());
    } finally {
      setRestoring(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Profile</ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <Row label="Account" value={userEmail ?? 'Guest'} />
            <Row label="Plan" value={isPremium ? 'Premium' : 'Free'} />
            {onboarding && <Row label="Goal" value={GOAL_LABELS[onboarding.goal]} />}
            {onboarding && <Row label="Time / day" value={`${onboarding.minutesPerDay} min`} />}
          </ThemedView>

          {!isPremium && (
            <PrimaryButton title="Upgrade to Premium" onPress={() => router.push('/paywall')} />
          )}

          <PrimaryButton
            variant="secondary"
            title="Edit goals & equipment"
            onPress={() => router.push('/onboarding')}
          />

          <PrimaryButton
            variant="secondary"
            title="Restore purchases"
            loading={restoring}
            onPress={onRestore}
          />

          {demoMode && (
            <ThemedView type="backgroundElement" style={styles.devCard}>
              <View style={styles.devRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">Demo: simulate premium</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Preview premium UI without a real purchase.
                  </ThemedText>
                </View>
                <Switch
                  value={isPremium}
                  onValueChange={(v) => setEntitlement(v ? 'premium' : 'free')}
                />
              </View>
            </ThemedView>
          )}

          <PrimaryButton variant="secondary" title="Sign out" onPress={signOut} />

          <ThemedText type="small" themeColor="textSecondary" style={styles.foot}>
            Entitlement: {entitlement}
            {demoMode ? ' · demo mode (no backend configured)' : ''}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  devCard: { padding: Spacing.four, borderRadius: Spacing.four },
  devRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  foot: { textAlign: 'center', marginTop: Spacing.two },
});

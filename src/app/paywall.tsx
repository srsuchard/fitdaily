import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getOfferingPackages,
  isPurchasesReady,
  purchasePackage,
  type PurchasePackage,
} from '@/lib/revenuecat';
import { useAuth } from '@/providers/AuthProvider';

const BENEFITS = [
  'A fresh AI workout tailored to you every day',
  'Unlimited workout history & 30-day trend charts',
  'Streak protection so one missed day won’t reset you',
  'Priority access to new features',
];

// Shown when RevenueCat packages can't be loaded (Expo Go / demo).
const FALLBACK_TIERS = [
  { id: 'annual', title: 'Annual', price: '$59.99 / yr', sub: 'Just $4.99/mo — best value', highlight: true },
  { id: 'monthly', title: 'Monthly', price: '$9.99 / mo', sub: 'Cancel anytime', highlight: false },
];

export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { demoMode, setEntitlement } = useAuth();

  const [packages, setPackages] = useState<PurchasePackage[]>([]);
  const [selected, setSelected] = useState<string>('annual');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    getOfferingPackages().then((pkgs) => {
      setPackages(pkgs);
      if (pkgs.length) setSelected(pkgs[0].identifier);
    });
  }, []);

  const usingRevenueCat = packages.length > 0;

  const buy = async () => {
    // Demo / no native module: simulate the upgrade so the UI is testable.
    if (!isPurchasesReady() || !usingRevenueCat) {
      setEntitlement('premium');
      router.back();
      return;
    }
    const pkg = packages.find((p) => p.identifier === selected);
    if (!pkg) return;
    setBuying(true);
    try {
      const ent = await purchasePackage(pkg);
      setEntitlement(ent);
      if (ent === 'premium') router.back();
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err.userCancelled) Alert.alert('Purchase failed', err.message ?? 'Please try again.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">FitDaily Premium</ThemedText>
          <ThemedText themeColor="textSecondary">
            Unlock the full adaptive training experience.
          </ThemedText>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <ThemedText style={{ color: theme.accent }}>✓</ThemedText>
                <ThemedText style={{ flex: 1 }}>{b}</ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.tiers}>
            {usingRevenueCat
              ? packages.map((p) => {
                  const isSel = p.identifier === selected;
                  return (
                    <Pressable
                      key={p.identifier}
                      onPress={() => setSelected(p.identifier)}
                      style={[styles.tier, { borderColor: isSel ? theme.accent : theme.border }]}>
                      <ThemedText type="smallBold">{p.product.title}</ThemedText>
                      <ThemedText type="subtitle">{p.product.priceString}</ThemedText>
                    </Pressable>
                  );
                })
              : FALLBACK_TIERS.map((t) => {
                  const isSel = t.id === selected;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setSelected(t.id)}
                      style={[styles.tier, { borderColor: isSel ? theme.accent : theme.border }]}>
                      {t.highlight && (
                        <ThemedText type="small" style={{ color: theme.accent }}>
                          BEST VALUE
                        </ThemedText>
                      )}
                      <ThemedText type="smallBold">{t.title}</ThemedText>
                      <ThemedText type="subtitle">{t.price}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.sub}
                      </ThemedText>
                    </Pressable>
                  );
                })}
          </View>

          <PrimaryButton
            title={demoMode ? 'Simulate upgrade' : 'Start subscription'}
            loading={buying}
            onPress={buy}
          />
          <PrimaryButton variant="secondary" title="Not now" onPress={() => router.back()} />

          <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
            Subscriptions renew automatically unless canceled at least 24h before the period ends.
            Manage in your App Store account settings.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.five },
  benefits: { gap: Spacing.two, marginVertical: Spacing.two },
  benefitRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  tiers: { flexDirection: 'row', gap: Spacing.three },
  tier: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  legal: { textAlign: 'center', marginTop: Spacing.two },
});

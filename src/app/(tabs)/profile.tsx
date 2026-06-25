import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { GOAL_LABELS } from '@/types';
import {
  disableDailyReminder,
  enableDailyReminder,
  isReminderEnabled,
  remindersSupported,
} from '@/lib/reminders';
import { isPurchasesReady, restorePurchases } from '@/lib/revenuecat';
import { copyText, shareText } from '@/lib/share';
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
  const { userEmail, isPremium, entitlement, onboarding, demoMode, session, signOut, setEntitlement } =
    useAuth();
  const [restoring, setRestoring] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [copied, setCopied] = useState(false);

  // A stable, shareable referral code derived from the user id (no schema
  // change). Full signup attribution via deep links is a future step.
  const referralCode = (session?.user.id ?? 'demo-user').replace(/-/g, '').slice(0, 6).toUpperCase();
  const inviteLink = `https://fitdaily.app/invite/${referralCode}`;
  const inviteMessage = 'Join me on FitDaily — one personalized workout a day. Get a free month of Premium 💪';

  const copyInvite = async () => {
    await copyText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    isReminderEnabled().then(setReminderOn);
  }, []);

  const toggleReminder = async (next: boolean) => {
    if (next) {
      const ok = await enableDailyReminder();
      if (!ok) {
        Alert.alert(
          'Reminders unavailable',
          remindersSupported
            ? 'Notification permission was denied.'
            : 'Daily reminders work on the mobile app, not on web.',
        );
        return;
      }
      setReminderOn(true);
    } else {
      await disableDailyReminder();
      setReminderOn(false);
    }
  };

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
    <ScreenBackground style={styles.container}>
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

          <ThemedView type="backgroundElement" style={styles.devCard}>
            <View style={styles.devRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">Daily reminder</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {remindersSupported
                    ? 'A 6pm nudge so you don’t break your streak.'
                    : 'Works on the mobile app (not on web).'}
                </ThemedText>
              </View>
              <Switch value={reminderOn} onValueChange={toggleReminder} disabled={!remindersSupported} />
            </View>
          </ThemedView>

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

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Invite friends, earn Premium</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Give a friend a free month — get one too when they join.
            </ThemedText>
            <Row label="Your code" value={referralCode} />
            <View style={styles.inviteActions}>
              <PrimaryButton
                variant="secondary"
                title={copied ? 'Copied ✓' : 'Copy link'}
                style={styles.flex}
                onPress={copyInvite}
              />
              <PrimaryButton
                title="Share invite"
                style={styles.flex}
                onPress={() => shareText(inviteMessage, inviteLink)}
              />
            </View>
          </ThemedView>

          <PrimaryButton variant="secondary" title="Sign out" onPress={signOut} />

          <ThemedText type="small" themeColor="textSecondary" style={styles.foot}>
            Entitlement: {entitlement}
            {demoMode ? ' · demo mode (no backend configured)' : ''}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
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
  inviteActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  flex: { flex: 1 },
  foot: { textAlign: 'center', marginTop: Spacing.two },
});

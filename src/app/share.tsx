import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { MilestoneCard } from '@/components/milestone-card';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { shareImage, shareText } from '@/lib/share';
import { useProgress } from '@/providers/ProgressProvider';

const INVITE = 'https://fitdaily.app';

export default function ShareScreen() {
  const router = useRouter();
  const { streak, totalWorkouts } = useProgress();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const message = `I'm on a ${streak}-day streak on FitDaily 🔥 (${totalWorkouts} workouts done)`;

  const onShare = async () => {
    setBusy(true);
    try {
      // Native: capture the card as a PNG and share the image.
      if (Platform.OS !== 'web' && cardRef.current) {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
        const ok = await shareImage(uri, 'Share your streak');
        if (ok) return;
      }
      // Web / no image sharing: share or copy text + link.
      const how = await shareText(message, INVITE);
      if (how === 'copied') setNote('Copied to clipboard!');
    } catch {
      setNote('Could not share — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="title" style={styles.title}>
          Share your progress
        </ThemedText>

        <View style={styles.cardWrap}>
          <MilestoneCard ref={cardRef} streak={streak} total={totalWorkouts} />
        </View>

        {note && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {note}
          </ThemedText>
        )}

        <View style={styles.actions}>
          <PrimaryButton title="Share" loading={busy} onPress={onShare} />
          <PrimaryButton variant="secondary" title="Close" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  title: { textAlign: 'center' },
  cardWrap: { flex: 1, justifyContent: 'center' },
  note: { textAlign: 'center' },
  actions: { gap: Spacing.two },
});

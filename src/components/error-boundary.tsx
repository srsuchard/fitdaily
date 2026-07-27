import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * App-wide fallback UI. Expo Router renders this whenever a screen throws while
 * rendering, so one broken screen shows a recoverable message instead of a
 * blank crash that takes down the whole app. Wired up by re-exporting
 * `ErrorBoundary` from app/_layout.tsx (Expo Router's convention).
 *
 * The error detail is shown only in development; in production users see a calm,
 * reassuring message and a single "Try again" that re-renders the route.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <ThemedText style={styles.emoji}>😵‍💫</ThemedText>
          <ThemedText type="title" style={styles.centered}>
            Something went wrong
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            This screen hit an unexpected error. Your progress is safe — give it another try.
          </ThemedText>
          {__DEV__ ? (
            <ThemedText type="small" themeColor="danger" style={styles.detail}>
              {error.message}
            </ThemedText>
          ) : null}
          <PrimaryButton title="Try again" onPress={retry} />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  emoji: { fontSize: 48, textAlign: 'center' },
  centered: { textAlign: 'center' },
  detail: { textAlign: 'center', opacity: 0.8 },
});

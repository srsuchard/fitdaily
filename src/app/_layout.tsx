import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { ProgressProvider } from '@/providers/ProgressProvider';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

/** Redirects between sign-in / onboarding / app based on auth state. */
function useProtectedRoute() {
  const { ready, isAuthenticated, hasOnboarded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const top = segments[0];
    const inSignIn = top === 'sign-in';
    const inOnboarding = top === 'onboarding';

    if (!isAuthenticated && !inSignIn) {
      router.replace('/sign-in');
    } else if (isAuthenticated && !hasOnboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isAuthenticated && hasOnboarded && (inSignIn || inOnboarding)) {
      router.replace('/');
    }
  }, [ready, isAuthenticated, hasOnboarded, segments, router]);

  return ready;
}

function RootNavigator() {
  const ready = useProtectedRoute();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <ProgressProvider>
            <RootNavigator />
          </ProgressProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

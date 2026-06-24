import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/AuthProvider';

export default function SignInScreen() {
  const theme = useTheme();
  const { demoMode, signInWithEmail, signUpWithEmail, signInDemo } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === 'signIn') await signInWithEmail(email.trim(), password);
      else await signUpWithEmail(email.trim(), password);
    } catch (e) {
      Alert.alert('Sign-in failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inner}>
          <View style={styles.hero}>
            <ThemedText type="title">FitDaily</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.tagline}>
              One personalized workout a day. No decisions, just done.
            </ThemedText>
          </View>

          {demoMode ? (
            <View style={styles.form}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.demoNote}>
                No backend is configured yet, so you can explore the app in demo mode.
              </ThemedText>
              <PrimaryButton title="Continue in demo mode" onPress={signInDemo} />
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <PrimaryButton
                title={mode === 'signIn' ? 'Sign in' : 'Create account'}
                loading={loading}
                onPress={submit}
              />
              <PrimaryButton
                variant="secondary"
                title={mode === 'signIn' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
                onPress={() => setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.five },
  hero: { alignItems: 'center', gap: Spacing.two },
  tagline: { textAlign: 'center' },
  form: { gap: Spacing.three },
  demoNote: { textAlign: 'center' },
  input: {
    height: 52,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});

import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ScreenBackground } from '@/components/screen-background';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/AuthProvider';

export default function SignInScreen() {
  const theme = useTheme();
  const { demoMode, signInWithEmail, signUpWithEmail, signInWithGoogle, signInDemo } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const submitGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      Alert.alert('Google sign-in failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground style={styles.container}>
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
              <View style={styles.passwordRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    { color: theme.text, backgroundColor: theme.backgroundElement },
                  ]}
                  placeholder="Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={8}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                  <ThemedText type="small" themeColor="accent">
                    {showPassword ? 'Hide' : 'Show'}
                  </ThemedText>
                </Pressable>
              </View>
              <PrimaryButton
                title={mode === 'signIn' ? 'Sign in' : 'Create account'}
                loading={loading}
                onPress={submit}
              />

              <View style={styles.divider}>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  or
                </ThemedText>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
              </View>

              <PrimaryButton
                variant="secondary"
                title="Continue with Google"
                onPress={submitGoogle}
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
    </ScreenBackground>
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
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  // Leave room for the Show/Hide toggle so long passwords don't sit under it.
  passwordInput: { paddingRight: 72 },
  eyeButton: {
    position: 'absolute',
    right: Spacing.three,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
});

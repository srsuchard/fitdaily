import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import { getEntitlement, initPurchases, syncPurchaseUser } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import type { Entitlement, OnboardingProfile } from '@/types';

const ONBOARDING_KEY = 'fitdaily.onboarding.v1';
const DEMO_KEY = 'fitdaily.demoUser.v1';

interface AuthContextValue {
  /** True once the initial session + onboarding load completes. */
  ready: boolean;
  /** Real Supabase session, when configured. */
  session: Session | null;
  /** True in demo mode (no Supabase env). */
  demoMode: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  accessToken: string | null;

  entitlement: Entitlement;
  isPremium: boolean;

  onboarding: OnboardingProfile | null;
  hasOnboarded: boolean;

  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Permanently deletes the account + all server data, then clears local state. */
  deleteAccount: () => Promise<void>;

  completeOnboarding: (p: OnboardingProfile) => Promise<void>;
  refreshEntitlement: () => Promise<void>;
  /** Demo/testing helper to preview premium UI without a real purchase. */
  setEntitlement: (e: Entitlement) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoMode = !isSupabaseConfigured;

  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [demoUserEmail, setDemoUserEmail] = useState<string | null>(null);
  const [entitlement, setEntitlementState] = useState<Entitlement>('free');
  const [onboarding, setOnboarding] = useState<OnboardingProfile | null>(null);

  // Initial load: session, onboarding answers, entitlement.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const storedOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (mounted && storedOnboarding) {
        setOnboarding(JSON.parse(storedOnboarding) as OnboardingProfile);
      }

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (mounted) setSession(data.session ?? null);
        await initPurchases(data.session?.user.id);
        if (mounted) setEntitlementState(await getEntitlement());
      } else {
        // Demo mode: restore a previously chosen demo identity.
        const demo = await AsyncStorage.getItem(DEMO_KEY);
        if (mounted && demo) setDemoUserEmail(demo);
      }

      if (mounted) setReady(true);
    })();

    const sub = supabase?.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      // Re-identify RevenueCat with the (possibly changed) user before reading
      // the entitlement, so it's never read against a stale/unconfigured SDK.
      await syncPurchaseUser(s?.user.id);
      setEntitlementState(await getEntitlement());
    });

    return () => {
      mounted = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  // Google OAuth via the system browser (Custom Tab / SFAuthenticationSession).
  // Supabase holds all Google client config, so no native SDK or keystore SHA-1
  // is needed. Requires the Google provider enabled in Supabase and this app's
  // redirect (fitdaily://auth-callback) on the Supabase allowlist; otherwise
  // signInWithOAuth returns a clear "provider is not enabled" error we surface.
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase not configured');
    const redirectTo = Linking.createURL('auth-callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Could not start Google sign-in.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    // User backed out of the browser — treat as a silent cancel, not an error.
    if (result.type !== 'success' || !result.url) return;

    const { queryParams } = Linking.parse(result.url);
    const errDesc = queryParams?.error_description;
    if (typeof errDesc === 'string') throw new Error(errDesc);
    const code = queryParams?.code;
    if (typeof code !== 'string') throw new Error('No authorization code returned.');

    // Exchange the PKCE code for a session; onAuthStateChange picks it up.
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }, []);

  const signInDemo = useCallback(async () => {
    const email = 'demo@fitdaily.app';
    await AsyncStorage.setItem(DEMO_KEY, email);
    setDemoUserEmail(email);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    await AsyncStorage.multiRemove([DEMO_KEY]);
    setDemoUserEmail(null);
    setSession(null);
    setEntitlementState('free');
  }, []);

  const deleteAccount = useCallback(async () => {
    // Real account: ask the server to delete the auth user (cascades all data).
    // In demo mode there is no backend, so we just clear local state below.
    if (supabase) {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) throw error;
      await supabase.auth.signOut().catch(() => {}); // token is now invalid; ignore.
    }
    // Wipe every local trace (onboarding answers, demo flag, cached progress, session).
    await AsyncStorage.clear();
    setDemoUserEmail(null);
    setSession(null);
    setOnboarding(null);
    setEntitlementState('free');
  }, []);

  const completeOnboarding = useCallback(async (p: OnboardingProfile) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(p));
    setOnboarding(p);
  }, []);

  const refreshEntitlement = useCallback(async () => {
    setEntitlementState(await getEntitlement());
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = demoMode ? demoUserEmail !== null : session !== null;
    return {
      ready,
      session,
      demoMode,
      isAuthenticated,
      userEmail: demoMode ? demoUserEmail : (session?.user.email ?? null),
      accessToken: session?.access_token ?? null,
      entitlement,
      isPremium: entitlement === 'premium',
      onboarding,
      hasOnboarded: onboarding !== null,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signInDemo,
      signOut,
      deleteAccount,
      completeOnboarding,
      refreshEntitlement,
      setEntitlement: setEntitlementState,
    };
  }, [
    ready,
    session,
    demoMode,
    demoUserEmail,
    entitlement,
    onboarding,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInDemo,
    signOut,
    deleteAccount,
    completeOnboarding,
    refreshEntitlement,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
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
import { getEntitlement, initPurchases } from '@/lib/revenuecat';
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
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;

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

    const sub = supabase?.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      getEntitlement().then(setEntitlementState);
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
      signInDemo,
      signOut,
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
    signInDemo,
    signOut,
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

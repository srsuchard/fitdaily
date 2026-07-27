// RevenueCat integration, written to degrade gracefully.
//
// react-native-purchases is a NATIVE module: it is NOT available in Expo Go,
// only in a development build / TestFlight / store build. Every call here is
// guarded so the app still boots and is navigable in Expo Go (demo mode).

import { Platform } from 'react-native';

import type { Entitlement } from '@/types';
import { env } from './env';

/** The entitlement identifier configured in the RevenueCat dashboard. */
export const PREMIUM_ENTITLEMENT_ID = 'premium_access';

type PurchasesModule = typeof import('react-native-purchases').default;
export type PurchasePackage = import('react-native-purchases').PurchasesPackage;

let Purchases: PurchasesModule | null = null;
let configured = false;
// In-flight guard so concurrent init calls (cold start fires several) dedupe
// instead of configuring the SDK more than once.
let configuring: Promise<void> | null = null;

export function isPurchasesReady(): boolean {
  return configured && Purchases !== null;
}

/** Configure the SDK once at app start. No-op when no key / native module. */
export async function initPurchases(appUserId?: string): Promise<void> {
  if (configured) return;
  if (configuring) return configuring;
  const apiKey = Platform.OS === 'ios' ? env.revenueCatIosKey : env.revenueCatAndroidKey;
  if (!apiKey) return; // demo mode

  configuring = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy-load the native module only when configured
      Purchases = require('react-native-purchases').default as PurchasesModule;
      await Purchases.configure({ apiKey, appUserID: appUserId ?? null });
      configured = true;
    } catch (e) {
      // Native module missing (Expo Go) or config error — stay in demo mode.
      Purchases = null;
      configured = false;
      console.warn('[revenuecat] unavailable, continuing without IAP:', (e as Error).message);
    } finally {
      configuring = null;
    }
  })();
  return configuring;
}

/**
 * Ensure RevenueCat is configured AND identified as the given user. Call on
 * every auth change: configures on first run, re-identifies (logIn) when the
 * signed-in user changes, and logs back out to an anonymous id on sign-out.
 * This keeps entitlement reads tied to the correct RevenueCat customer.
 */
export async function syncPurchaseUser(appUserId?: string): Promise<void> {
  if (!configured) {
    await initPurchases(appUserId);
    return;
  }
  if (!Purchases) return;
  try {
    if (appUserId) await Purchases.logIn(appUserId);
    else await Purchases.logOut();
  } catch (e) {
    // logOut throws when already anonymous — safe to ignore.
    console.warn('[revenuecat] user sync skipped:', (e as Error).message);
  }
}

function hasPremium(info: { entitlements: { active: Record<string, unknown> } }): Entitlement {
  return info.entitlements.active[PREMIUM_ENTITLEMENT_ID] ? 'premium' : 'free';
}

export async function getEntitlement(): Promise<Entitlement> {
  if (!isPurchasesReady()) return 'free';
  try {
    const info = await Purchases!.getCustomerInfo();
    return hasPremium(info);
  } catch {
    return 'free';
  }
}

export async function getOfferingPackages(): Promise<PurchasePackage[]> {
  if (!isPurchasesReady()) return [];
  try {
    const offerings = await Purchases!.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: PurchasePackage): Promise<Entitlement> {
  if (!isPurchasesReady()) return 'free';
  const { customerInfo } = await Purchases!.purchasePackage(pkg);
  return hasPremium(customerInfo);
}

export async function restorePurchases(): Promise<Entitlement> {
  if (!isPurchasesReady()) return 'free';
  const info = await Purchases!.restorePurchases();
  return hasPremium(info);
}

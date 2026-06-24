// Apple HealthKit integration.
//
// Like revenuecat.ts, this is written to degrade gracefully: HealthKit is a
// native module (via Nitro) available ONLY in a development/store build on iOS,
// never in Expo Go or on Android/web. Every entry point lazy-requires the
// module inside try/catch so the JS still bundles and runs everywhere.
//
// Requires a development build: `eas build --profile development` or
// `npx expo run:ios`. See README / eas.json.

import { Platform } from 'react-native';

export interface HealthSummary {
  /** null = unavailable / not authorized; number = today's total. */
  steps: number | null;
  activeEnergyKcal: number | null;
}

type HKModule = typeof import('@kingstinct/react-native-healthkit');

const STEP_COUNT = 'HKQuantityTypeIdentifierStepCount';
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const READ_TYPES = [STEP_COUNT, ACTIVE_ENERGY] as const;

let HK: HKModule | null = null;
let triedLoad = false;

function load(): HKModule | null {
  if (triedLoad) return HK;
  triedLoad = true;
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    HK = require('@kingstinct/react-native-healthkit') as HKModule;
  } catch {
    HK = null; // Expo Go / native module not linked.
  }
  return HK;
}

/** True only on an iOS build where HealthKit is linked and available. */
export async function isHealthAvailable(): Promise<boolean> {
  const hk = load();
  if (!hk) return false;
  try {
    return await hk.isHealthDataAvailable();
  } catch {
    return false;
  }
}

/** Prompts the user for read access to steps + active energy. */
export async function requestHealthAuthorization(): Promise<boolean> {
  const hk = load();
  if (!hk) return false;
  try {
    return await hk.requestAuthorization({ toRead: READ_TYPES });
  } catch {
    return false;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function sumToday(hk: HKModule, identifier: string, unit: string): Promise<number | null> {
  try {
    const res = await hk.queryStatisticsForQuantity(
      identifier as Parameters<HKModule['queryStatisticsForQuantity']>[0],
      ['cumulativeSum'],
      // FilterForSamples accepts a start/end date window.
      { filter: { startDate: startOfToday(), endDate: new Date() }, unit } as Parameters<
        HKModule['queryStatisticsForQuantity']
      >[2],
    );
    return Math.round(res.sumQuantity?.quantity ?? 0);
  } catch {
    return null;
  }
}

/** Today's step count and active energy, or nulls when unavailable. */
export async function getTodayHealthSummary(): Promise<HealthSummary> {
  const hk = load();
  if (!hk) return { steps: null, activeEnergyKcal: null };
  const [steps, activeEnergyKcal] = await Promise.all([
    sumToday(hk, STEP_COUNT, 'count'),
    sumToday(hk, ACTIVE_ENERGY, 'kcal'),
  ]);
  return { steps, activeEnergyKcal };
}

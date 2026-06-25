// Daily workout reminder via a scheduled local notification.
//
// expo-notifications is a native capability: local notifications fire on a
// device/dev build, NOT on web (and not in Expo Go for push). Everything here
// is guarded so the UI works on web — the toggle just won't deliver anything
// until the app runs on a device.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ENABLED_KEY = 'fitdaily.reminderEnabled.v1';
export const REMINDER_HOUR = 18; // 6:00 PM local
export const REMINDER_MINUTE = 0;

/** False on web, where local notifications aren't delivered. */
export const remindersSupported = Platform.OS !== 'web';

export async function isReminderEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

/** Returns true if a daily reminder was scheduled (perms granted). */
export async function enableDailyReminder(): Promise<boolean> {
  if (!remindersSupported) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Keep your streak alive 🔥',
        body: "You haven't worked out today — a few minutes is all it takes.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });
    await AsyncStorage.setItem(ENABLED_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export async function disableDailyReminder(): Promise<void> {
  try {
    if (remindersSupported) await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem(ENABLED_KEY, '0');
  } catch {
    // best-effort
  }
}

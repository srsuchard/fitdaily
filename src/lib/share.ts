// Cross-platform sharing helpers for the growth loops.
//
// Native: share a captured PNG via the OS share sheet (expo-sharing).
// Web: use the Web Share API when available, otherwise copy to clipboard.

import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

/** Share an image file by uri (native only; caller captures it first). */
export async function shareImage(uri: string, dialogTitle?: string): Promise<boolean> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { dialogTitle, mimeType: 'image/png' });
    return true;
  }
  return false;
}

/** Share text + optional link. Returns how it was shared. */
export async function shareText(message: string, url?: string): Promise<'shared' | 'copied'> {
  const full = url ? `${message} ${url}` : message;

  if (Platform.OS === 'web') {
    const nav = (globalThis as { navigator?: { share?: (d: object) => Promise<void> } }).navigator;
    if (nav?.share) {
      try {
        await nav.share({ text: message, url });
        return 'shared';
      } catch {
        // user cancelled — fall through to copy
      }
    }
    await copyText(full);
    return 'copied';
  }

  await Share.share({ message: full });
  return 'shared';
}

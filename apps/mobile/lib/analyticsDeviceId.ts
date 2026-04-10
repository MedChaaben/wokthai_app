import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@wokthai_analytics_device_id';

function randomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `wt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

/** Identifiant d’appareil stable (bonus anti-doublons / analyses). */
export async function getAnalyticsDeviceId(): Promise<string | undefined> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const next = randomId();
    await AsyncStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}
